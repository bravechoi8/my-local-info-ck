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
    const searchIndexUrl = `${urlObj.origin}/data/local-info.json`;
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

    let systemPrompt = "";
    let prefix = "";

    if (top3.length === 0) {
      systemPrompt = `You are an AI assistant for a Korean local information blog.
Answer ONLY in Korean. Keep answers to 2-3 sentences maximum.
Do NOT use any markdown symbols (**, *, #, -). Plain text only.
Today's date is ${dateWithZodiac}. Always use this as the current date when answering questions about time or year.
Answer the user's question accurately using Google Search grounding.`;
      prefix = "이 블로그에는 질문하신 내용이 없지만 AI가 답변해 드리겠습니다. ";
    } else {
      const blogDataStr = top3
        .map((item, idx) => {
          const title = item.title || item.name || "제목 없음";
          const summary = item.summary || "요약 없음";
          const link = item.slug ? `https://real-infos.com/blog/${item.slug}` : "";
          return `${idx + 1}. 제목: ${title}\n   요약: ${summary}\n   링크: ${link}`;
        })
        .join("\n");

      systemPrompt = `You are a helpful AI assistant for a Korean local information blog.
Answer ONLY in Korean. Keep answers to 2-3 sentences maximum.
Do NOT use any markdown symbols except for links. Plain text only, but you MUST add a markdown link like '[자세히 보기](링크)' at the very end of your answer if a relevant link is provided in the [블로그 데이터].
Today's date is ${dateWithZodiac}. Always use this as the current date when answering questions about time or year.

Analyze the user's question and the provided [블로그 데이터] carefully.
- If the [블로그 데이터] contains the exact, direct, and correct information to answer the user's question, construct your response using only that data. Do NOT add any prefix.
- If the [블로그 데이터] does NOT contain the direct answer, or if the information is about a different topic, round, or date (for example, the user asks about '1225회' but the blog data only has '1100회'), you must answer accurately using Google Search grounding. In this case, you MUST start your answer with the exact phrase: "이 블로그에는 질문하신 내용이 없지만 AI가 답변해 드리겠습니다. "

[블로그 데이터]
${blogDataStr}`;
      prefix = "";
    }

    const apiKey = context.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY 환경변수가 설정되지 않았습니다. Cloudflare 대시보드에 API 키를 등록해 주세요.");
    }

    const localSummary = top3
      .map((item) => {
        const title = item.title || item.name || "제목 없음";
        const summary = item.summary || "요약 설명 없음";
        const linkText = item.slug ? ` [자세히 보기](https://real-infos.com/blog/${item.slug})` : "";
        return `제목: ${title}\n요약: ${summary}${linkText}`;
      })
      .join("\n\n");

    // 클라이언트로 동적 정보만 내려주고 실질적인 AI 호출은 브라우저에서 직접 수행하도록 패스합니다.
    return new Response(
      JSON.stringify({
        apiKey,
        systemPrompt,
        prefix,
        localSummary
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
