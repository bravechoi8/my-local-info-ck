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

    const { searchParams } = new URL(context.request.url);
    const userId = searchParams.get("userId");
    const isAdmin = searchParams.get("admin") === "true";

    // 1. 관리자 룸 리스팅 요청인 경우 (admin=true)
    if (isAdmin) {
      // 각 유저별 가장 최근 대화 메시지, 발신자 및 그 시각을 그룹화하여 최신 대화 순으로 정렬해 목록 추출
      const { results } = await context.env.DB.prepare(`
        SELECT m.userId, m.message, m.sender, m.timestamp
        FROM chat_messages m
        INNER JOIN (
          SELECT userId, MAX(timestamp) as max_ts
          FROM chat_messages
          GROUP BY userId
        ) t ON m.userId = t.userId AND m.timestamp = t.max_ts
        ORDER BY m.timestamp DESC
      `).all();

      return new Response(JSON.stringify(results), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          "Pragma": "no-cache",
          "Expires": "0"
        },
      });
    }

    // 2. 특정 유저 대화 폴링 요청인 경우 (userId 제공)
    if (userId) {
      const { results } = await context.env.DB.prepare(
        "SELECT userId, message, sender, timestamp FROM chat_messages WHERE userId = ? ORDER BY timestamp ASC LIMIT 100"
      ).bind(userId).all();

      return new Response(JSON.stringify(results), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          "Pragma": "no-cache",
          "Expires": "0"
        },
      });
    }

    // 3. 둘 다 없는 경우 빈 배열 응답
    return new Response(JSON.stringify([]), {
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

export async function onRequestDelete(context) {
  try {
    if (!context.env.DB) {
      return new Response(
        JSON.stringify({ error: "DB (D1) 바인딩이 설정되지 않았습니다." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const { searchParams } = new URL(context.request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId 파라미터가 누락되었습니다." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 해당 유저의 대화 내용 전체 삭제
    await context.env.DB.prepare(
      "DELETE FROM chat_messages WHERE userId = ?"
    ).bind(userId).run();

    return new Response(
      JSON.stringify({ success: true, message: "대화방이 삭제되었습니다." }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
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
