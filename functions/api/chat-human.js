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

    // KV 네임스페이스 바인딩 확인
    if (!context.env.CHAT_KV) {
      return new Response(
        JSON.stringify({ error: "CHAT_KV 바인딩이 설정되지 않았습니다." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const timestamp = Date.now();
    const value = {
      message,
      sender,
      timestamp,
    };

    // 1. 기존 대화 목록 가져오기
    let history = [];
    const existingStr = await context.env.CHAT_KV.get("chat_history");
    if (existingStr) {
      try {
        history = JSON.parse(existingStr);
        if (!Array.isArray(history)) {
          history = [];
        }
      } catch (e) {
        history = [];
      }
    }

    // 2. 새 메시지 추가
    history.push(value);

    // 3. 최근 100개까지만 유지하여 용량 최적화
    if (history.length > 100) {
      history = history.slice(history.length - 100);
    }

    // 4. KV 저장소에 덮어쓰기
    await context.env.CHAT_KV.put("chat_history", JSON.stringify(history));

    return new Response(
      JSON.stringify({ success: true, key: "chat_history", data: value }),
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
