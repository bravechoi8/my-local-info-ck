export async function onRequestPost(context) {
  try {
    const { message } = await context.request.json();

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
      // 검색어 매칭 대상 텍스트 조립
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

    // 매칭 점수가 높은 상위 3개 항목 추출 (단, 1글자라도 매칭된 0점 초과 항목만 대상)
    const top3 = scoredItems
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((x) => x.item);

    // 검색된 블로그 데이터를 문자열로 포맷팅
    let blogDataStr = "";
    if (top3.length > 0) {
      blogDataStr = top3
        .map((item, idx) => {
          const title = item.title || item.name || "제목 없음";
          const summary = item.summary || "요약 없음";
          return `${idx + 1}. 제목: ${title}\n   요약: ${summary}`;
        })
        .join("\n");
    } else {
      blogDataStr = "검색된 관련 블로그 데이터 없음";
    }

    // 3. 업데이트된 시스템 프롬프트 정의
    const systemPrompt = `You are an AI assistant for a Korean local information blog.
Answer ONLY in Korean. Keep answers to 2-3 sentences maximum.
Do NOT use any markdown symbols (**, *, #, -). Plain text only.
Base your answer ONLY on the following blog data. If not relevant, reply: 해당 내용은 블로그에서 확인이 어렵습니다. 다른 질문을 해주세요.

[블로그 데이터]
${blogDataStr}`;

    // 4. Workers AI 호출 (max_tokens: 150)
    const response = await context.env.AI.run(
      "@cf/meta/llama-3.1-8b-instruct-fast",
      {
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: message,
          },
        ],
        max_tokens: 150,
      }
    );

    let botAnswer = response.response || response.result?.response || "";

    // 5. AI 응답에서 마크다운 기호 완전히 제거
    botAnswer = stripMarkdown(botAnswer);

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

// AI 답변 내에 들어있는 마크다운 기호들을 정제하는 함수
function stripMarkdown(text) {
  if (!text) return "";
  return text
    // 볼드 및 이탤릭 마크다운 기호 제거
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    // 헤더 기호 제거
    .replace(/^#+\s+/gm, "")
    // 목록용 대시 및 글머리 기호 제거
    .replace(/^\s*[-*+]\s+/gm, "")
    // 인라인 코드 백틱 제거
    .replace(/`([^`]+)`/g, "$1")
    // 이미지 및 링크 문법의 주소 부분 지우고 텍스트만 유지
    .replace(/!\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    // 불필요하게 줄바꿈된 연속 공백들을 한 칸 공백으로 정제
    .replace(/\s+/g, " ")
    .trim();
}
