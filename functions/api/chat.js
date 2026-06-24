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

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 1. 검색 인덱스 파일 가져오기
    const searchIndexUrl = new URL(context.request.url).origin + "/data/search-index.json";
    let searchIndex = [];
    try {
      const indexRes = await fetch(searchIndexUrl);
      if (indexRes.ok) {
        searchIndex = await indexRes.json();
      }
    } catch (e) {
      console.error("Failed to fetch search index:", e);
    }

    // 2. 질문 단어 분리 및 각 항목의 텍스트와 키워드 매칭
    const queryWords = message.split(/\s+/).filter(Boolean);
    const scoredItems = searchIndex.map((item) => {
      const searchText = [
        item.name,
        item.title,
        item.summary,
        item.content,
        item.category,
        item.location,
        item.target,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      let score = 0;
      queryWords.forEach((word) => {
        const lowercaseWord = word.toLowerCase();
        let index = searchText.indexOf(lowercaseWord);
        while (index !== -1) {
          score += 1;
          index = searchText.indexOf(lowercaseWord, index + 1);
        }
      });

      return { item, score };
    });

    // 매칭 점수가 0점보다 큰 항목들을 정렬하여 상위 3개만 추출
    const top3 = scoredItems
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((x) => x.item);

    let botAnswer = "";

    // 3. 분기 처리: 블로그 내 관련 정보의 존재 여부에 따라 프롬프트와 접두사 조정
    if (top3.length === 0) {
      // ⚠️ 블로그에 관련 정보가 없는 경우: 일반 AI로 우회 답변 제공
      const systemPrompt = `You are an AI assistant for a Korean local information blog.
Answer ONLY in Korean. Keep answers to 2-3 sentences maximum.
Do NOT use any markdown symbols (**, *, #, -). Plain text only.
Today's date is ${currentDate}. Always use this as the current date when answering questions about time or year.
Answer the user's question to the best of your knowledge as a helpful assistant.`;

      const response = await context.env.AI.run(
        "@cf/meta/llama-3.1-8b-instruct-fast",
        {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
          ],
          max_tokens: 150,
        }
      );

      let rawAnswer = response.response || response.result?.response || "";
      rawAnswer = stripMarkdown(rawAnswer);

      // 사용자가 요청한 접두사 문구 붙이기
      botAnswer = `이 블로그에는 질문하신 내용이 없지만 AI가 답변해 드리겠습니다. ${rawAnswer}`;
    } else {
      // 📝 블로그에 관련 정보가 있는 경우: 블로그 데이터를 최우선 기반으로 요약 답변
      const blogDataStr = top3
        .map((item, idx) => {
          const title = item.title || item.name || "제목 없음";
          const summary = item.summary || "요약 없음";
          return `${idx + 1}. 제목: ${title}\n   요약: ${summary}`;
        })
        .join("\n");

      const systemPrompt = `You are a helpful AI assistant for a Korean local information blog.
Answer ONLY in Korean. Keep answers to 2-3 sentences maximum.
Do NOT use any markdown symbols (**, *, #, -). Plain text only.
Today's date is ${currentDate}. Always use this as the current date when answering questions about time or year.

Analyze the user's question and the provided [블로그 데이터] carefully.
- If the [블로그 데이터] contains the exact, direct, and correct information to answer the user's question, construct your response using only that data. Do NOT add any prefix.
- If the [블로그 데이터] does NOT contain the direct answer, or if the information is about a different topic, round, or date (for example, the user asks about '1225회' but the blog data only has '1100회'), you must answer using your own general knowledge. In this case, you MUST start your answer with the exact phrase: "이 블로그에는 질문하신 내용이 없지만 AI가 답변해 드리겠습니다. "

[블로그 데이터]
${blogDataStr}`;

      const response = await context.env.AI.run(
        "@cf/meta/llama-3.1-8b-instruct-fast",
        {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
          ],
          max_tokens: 150,
        }
      );

      let rawAnswer = response.response || response.result?.response || "";
      botAnswer = stripMarkdown(rawAnswer);
    }

    return new Response(JSON.stringify({ response: botAnswer }), {
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

// AI 응답 텍스트에서 마크다운 기호를 지워주는 함수
function stripMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/^#+\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
