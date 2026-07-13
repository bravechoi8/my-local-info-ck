// Trigger deploy to load updated Cloudflare environment variables
export async function onRequestPost(context) {
  try {
    const { message } = await context.request.json();

    // 현재 날짜 정보 (서버 기준, 한국 시간대)
    const now = new Date();
    const currentDate = now.toLocaleDateString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });

    // 한국 전통 12지신(띠) 계산 로직
    const seoulYear = parseInt(now.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric" }));
    const zodiacs = ["쥐띠", "소띠", "호랑이띠", "토끼띠", "용띠", "뱀띠", "말띠", "양띠", "원숭이띠", "닭띠", "개띠", "돼지띠"];
    const currentZodiac = zodiacs[(seoulYear - 4) % 12];
    const dateWithZodiac = `${currentDate} (올해 띠: ${currentZodiac})`;

    // 1. 블로그의 모든 글 목록 로딩 (검색용 JSON 데이터)
    const urlObj = new URL(context.request.url);
    const searchIndexUrl = `${urlObj.origin}/data/search-index.json`;
    const searchRes = await fetch(searchIndexUrl);
    if (!searchRes.ok) {
      throw new Error("블로그 검색 인덱스 데이터를 읽어오지 못했습니다.");
    }
    const localInfoList = await searchRes.json();

    // 2. 사용자의 질문과 형태소/단어 매칭 점수 연산
    const messageWords = message.split(/\s+/).filter((w) => w.length > 0);
    const flatMessage = message.replace(/\s+/g, "");

    const scoredItems = localInfoList.map((item) => {
      let score = 0;
      const itemTitle = item.title || item.name || "";
      const itemSummary = item.summary || "";
      const itemContent = item.content || "";

      // 단어 완전 매칭
      messageWords.forEach((word) => {
        if (itemTitle.includes(word)) score += 10;
        if (itemSummary.includes(word)) score += 5;
        if (itemContent.includes(word)) score += 2;
      });

      // 띄어쓰기 제거 후 부분 매칭 (조사 등이 붙었을 때)
      const flatSearchText = (itemTitle + itemSummary + itemContent).replace(/\s+/g, "");
      if (flatMessage.length >= 2) {
        if (flatSearchText.includes(flatMessage)) {
          score += 15;
        }
        const flatTitle = itemTitle.replace(/\s+/g, "");
        if (flatTitle.includes(flatMessage)) {
          score += 25;
        }
      }

      return { item, score };
    });

    const top3 = scoredItems
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((x) => x.item);

    // 블로그 매칭 성공 시: 서버 단에서 다중 글 리스트를 포맷팅해서 다이렉트 즉시 응답 (구글 API 호출 생략, 크레딧 0원)
    if (top3.length > 0) {
      const localSummary = top3
        .map((item, idx) => {
          const title = item.title || item.name || "제목 없음";
          const summary = item.summary || "요약 설명 없음";
          const linkText = item.slug ? ` [자세히 보기](https://real-infos.com/blog/${item.slug})` : "";
          return `${idx + 1}. 제목: ${title}\n   요약: ${summary}${linkText}`;
        })
        .join("\n\n");

      return new Response(
        JSON.stringify({
          response: `블로그에서 찾은 관련 소식 목록입니다. 🐾\n\n${localSummary}`,
          apiKey: "", // 브라우저 구글 fetch 우회 플래그
          useSearch: false
        }),
        {
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // 블로그 매칭 실패 시: 브라우저가 다이렉트로 구글 실시간 검색을 타도록 명세 리턴
    const systemPrompt = `You are an AI assistant for a Korean local information blog.
Answer ONLY in Korean. Keep answers to 2-3 sentences maximum.
Do NOT use any markdown symbols (**, *, #, -). Plain text only.
Today's date is ${dateWithZodiac}. Always use this as the current date when answering questions about time or year.
Answer the user's question accurately using Google Search grounding.`;
    
    const prefix = "블로그에 관련 소식이 없어서 실시간 인터넷 검색 결과로 안내해 드릴게요! 🐾 ";

    const apiKey = context.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY 환경변수가 설정되지 않았습니다. Cloudflare 대시보드에 API 키를 등록해 주세요.");
    }

    return new Response(
      JSON.stringify({
        apiKey,
        systemPrompt,
        prefix,
        useSearch: true,
        response: "" // 서버에서 다이렉트 대답이 없으므로 브라우저가 수행해야 함
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
