export async function onRequestPost(context) {
  try {
    const { message, sender } = await context.request.json();

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

    const timestamp = Date.now();

    // 1. chat_messages 테이블이 없는 경우 생성 (자동 초기화)
    await context.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL,
        sender TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      )
    `).run();

    // 2. 새 메시지 추가
    await context.env.DB.prepare(
      "INSERT INTO chat_messages (message, sender, timestamp) VALUES (?, ?, ?)"
    ).bind(message, sender, timestamp).run();

    // 3. 최근 100개 외의 오래된 메시지 삭제 (용량 관리)
    await context.env.DB.prepare(`
      DELETE FROM chat_messages WHERE id NOT IN (
        SELECT id FROM chat_messages ORDER BY timestamp DESC LIMIT 100
      )
    `).run();

    const dataValue = {
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
