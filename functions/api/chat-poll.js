export async function onRequestGet(context) {
  try {
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

    // 1. D1에서 대화 내역 조회 (시간 순 정렬)
    const { results } = await context.env.DB.prepare(
      "SELECT message, sender, timestamp FROM chat_messages ORDER BY timestamp ASC LIMIT 100"
    ).all();

    // 2. 쿼리 스트링의 sender 필터가 있는 경우 처리
    const { searchParams } = new URL(context.request.url);
    const filterSender = searchParams.get("sender"); // 'user' 또는 'admin'

    let filteredMessages = results;
    if (filterSender) {
      filteredMessages = results.filter((m) => m.sender === filterSender);
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
