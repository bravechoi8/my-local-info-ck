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
    const apiKey = context.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY 환경변수가 설정되지 않았습니다. Cloudflare 대시보드에 API 키를 등록해 주세요.");
    }

    // 3. 분기 처리: 블로그 내 관련 정보의 존재 여부에 따라 프롬프트와 구글 실시간 검색 여부 세팅
    if (top3.length === 0) {
      // ⚠️ 블로그에 관련 정보가 없는 경우: 구글 실시간 검색(google_search)을 켜서 인터넷 검색 결과를 기반으로 답변
      const systemPrompt = `You are an AI assistant for a Korean local information blog.
Answer ONLY in Korean. Keep answers to 2-3 sentences maximum.
Do NOT use any markdown symbols (**, *, #, -). Plain text only.
Today's date is ${dateWithZodiac}. Always use this as the current date when answering questions about time or year.
Answer the user's question accurately using Google Search grounding.`;

      const rawAnswer = await callGemini(apiKey, systemPrompt, message, true);
      botAnswer = `이 블로그에는 질문하신 내용이 없지만 AI가 답변해 드리겠습니다. ${stripMarkdown(rawAnswer)}`;
    } else {
      // 📝 블로그에 관련 정보가 있는 경우: 블로그 데이터를 최우선 기반으로 요약 답변 (구글 검색 미사용)
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
Today's date is ${dateWithZodiac}. Always use this as the current date when answering questions about time or year.

Analyze the user's question and the provided [블로그 데이터] carefully.
- If the [블로그 데이터] contains the exact, direct, and correct information to answer the user's question, construct your response using only that data. Do NOT add any prefix.
- If the [블로그 데이터] does NOT contain the direct answer, or if the information is about a different topic, round, or date (for example, the user asks about '1225회' but the blog data only has '1100회'), you must answer using your own general knowledge. In this case, you MUST start your answer with the exact phrase: "이 블로그에는 질문하신 내용이 없지만 AI가 답변해 드리겠습니다. "

[블로그 데이터]
${blogDataStr}`;

      const rawAnswer = await callGemini(apiKey, systemPrompt, message, false);
      botAnswer = stripMarkdown(rawAnswer);
    }

    return new Response(JSON.stringify({ response: botAnswer }), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ response: `[서버 오류 상세] ${error.message}` }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// 구글 제미나이 API 직접 호출 함수 (실시간 구글 검색 연동 지원)
async function callGemini(apiKey, systemPrompt, userMessage, useSearch) {
  const url = `https://gateway.ai.cloudflare.com/v1/b6c1fc66bc8cd5a10f618d37d44969df/my-blog-gateway/google-ai-studio/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
  
  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: userMessage }]
      }
    ],
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    }
  };

  // 실시간 구글 검색(Google Search Grounding) 활성화
  if (useSearch) {
    requestBody.tools = [{ google_search: {} }];
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API Error: ${res.status} - ${errText}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
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
