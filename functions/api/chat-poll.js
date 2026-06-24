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

    // 1. "chat_history" 키 하나만 가져오기
    let messages = [];
    const historyStr = await context.env.CHAT_KV.get("chat_history");
    if (historyStr) {
      try {
        messages = JSON.parse(historyStr);
        if (!Array.isArray(messages)) {
          messages = [];
        }
      } catch (e) {
        messages = [];
      }
    }

    // 2. 시간 순서대로 정렬
    messages.sort((a, b) => a.timestamp - b.timestamp);

    // 3. 쿼리 스트링의 sender 필터가 있는 경우 처리
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
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0"
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
