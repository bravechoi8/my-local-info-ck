export async function onRequestGet(context) {
  try {
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

    // 1. "msg_" 로 시작하는 모든 키 가져오기
    const listResult = await context.env.CHAT_KV.list({ prefix: "msg_" });
    const keys = listResult.keys; // [{ name: "msg_171923..." }, ...]

    // 2. 각 키에 매핑된 데이터 값(value)을 가져오기
    const messages = [];
    for (const key of keys) {
      const valStr = await context.env.CHAT_KV.get(key.name);
      if (valStr) {
        try {
          const parsed = JSON.parse(valStr);
          messages.push(parsed);
        } catch (e) {
          console.error(`Failed to parse message value for key ${key.name}:`, e);
        }
      }
    }

    // 3. 시간 순서대로 정렬 (과거 ➡️ 최신)
    messages.sort((a, b) => a.timestamp - b.timestamp);

    // 4. 쿼리 스트링의 sender 필터가 있는 경우 처리
    const { searchParams } = new URL(context.request.url);
    const filterSender = searchParams.get("sender"); // 'user' 또는 'admin'

    let filteredMessages = messages;
    if (filterSender) {
      filteredMessages = messages.filter((m) => m.sender === filterSender);
    }

    return new Response(JSON.stringify(filteredMessages), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
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
