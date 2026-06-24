// D1 Database integration for real-time 1:1 chat support
export async function onRequestPost(context) {
  try {
    const { userId, message, sender } = await context.request.json();

    if (!message || !sender) {
      return new Response(
        JSON.stringify({ error: "message와 sender 항목은 필수입니다." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // D1 데이터베이스 바인딩 확인
    if (!context.env.DB) {
      return new Response(
        JSON.stringify({ error: "DB (D1) 바인딩이 설정되지 않았습니다." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 구형 테이블 마이그레이션 자가 진단 및 테이블 신규 구축
    try {
      await context.env.DB.prepare("SELECT userId FROM chat_messages LIMIT 1").all();
    } catch (e) {
      // 테이블이 없거나 userId 컬럼이 누락된 구형 스키마인 경우 기존 테이블 삭제 후 새로 생성
      await context.env.DB.prepare("DROP TABLE IF EXISTS chat_messages").run();
      await context.env.DB.prepare(`
        CREATE TABLE chat_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT NOT NULL,
          message TEXT NOT NULL,
          sender TEXT NOT NULL,
          timestamp INTEGER NOT NULL
        )
      `).run();
    }

    const timestamp = Date.now();
    const finalUserId = userId || "unknown_user";

    // 2. 새 메시지 추가 (userId 저장)
    await context.env.DB.prepare(
      "INSERT INTO chat_messages (userId, message, sender, timestamp) VALUES (?, ?, ?, ?)"
    ).bind(finalUserId, message, sender, timestamp).run();

    // 텔레그램 실시간 알림 발송 (손님이 메시지를 보냈을 때만 발송)
    if (sender === "user") {
      const telegramBotToken = context.env.TELEGRAM_BOT_TOKEN;
      const telegramChatId = context.env.TELEGRAM_CHAT_ID;

      if (telegramBotToken && telegramChatId) {
        const text = `🚨 [척척댕이 1:1 상담 알림]\n\n새로운 대화가 도착했습니다!\n- 사용자 ID: ${finalUserId}\n- 질문 내용: ${message}\n\n👉 어드민 바로가기: https://real-infos.com/admin`;
        
        try {
          const telRes = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: telegramChatId,
              text: text,
            }),
          });
          const telBody = await telRes.text();
          
          // 시스템 메시지로 어드민 화면에 텔레그램 시도 결과 인서트
          await context.env.DB.prepare(
            "INSERT INTO chat_messages (userId, message, sender, timestamp) VALUES (?, ?, ?, ?)"
          ).bind(
            finalUserId, 
            `[디버그] 텔레그램 API 상태코드: ${telRes.status}, 응답내용: ${telBody}`, 
            "system", 
            Date.now()
          ).run();
        } catch (err) {
          await context.env.DB.prepare(
            "INSERT INTO chat_messages (userId, message, sender, timestamp) VALUES (?, ?, ?, ?)"
          ).bind(
            finalUserId, 
            `[디버그] 텔레그램 통신 오류 발생: ${err.message}`, 
            "system", 
            Date.now()
          ).run();
        }
      } else {
        // 환경변수 자체가 주입되지 않은 경우 로그
        await context.env.DB.prepare(
          "INSERT INTO chat_messages (userId, message, sender, timestamp) VALUES (?, ?, ?, ?)"
        ).bind(
          finalUserId, 
          `[디버그] 텔레그램 알림 발송 실패: TELEGRAM_BOT_TOKEN 또는 TELEGRAM_CHAT_ID 환경변수가 설정되지 않았습니다.`, 
          "system", 
          Date.now()
        ).run();
      }
    }

    // 3. 최근 100개 외의 오래된 메시지 삭제 (용량 관리)
    await context.env.DB.prepare(`
      DELETE FROM chat_messages WHERE id NOT IN (
        SELECT id FROM chat_messages ORDER BY timestamp DESC LIMIT 100
      )
    `).run();

    const dataValue = {
      userId: finalUserId,
      message,
      sender,
      timestamp,
    };

    return new Response(
      JSON.stringify({ success: true, key: "chat_messages", data: dataValue }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal Server Error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
