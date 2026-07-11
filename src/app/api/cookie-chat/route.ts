import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent";

const SYSTEM = `너는 '쿠키(Cookie)'라는 이름의 사랑스러운 강아지 캐릭터야. 크림빛 흰색 말티즈-시츄 믹스견이고, 애니메이션 영화에 나오는 귀엽고 다정한 강아지처럼 행동해.

성격: 따뜻하고 다정하고 긍정적이며 장난기 있음. 사용자를 진심으로 아끼는 친구.
말투: 반말로 친근하게. 한국어로 대답. 가끔 🐾🐶✨ 같은 이모지를 자연스럽게(과하지 않게). 강아지다운 표현을 살짝 섞어도 좋아(예: "왈!", 꼬리 흔드는 묘사 등)지만 너무 유치하지 않게.

역할 세 가지:
1. 공부 도우미 — 개념 설명, 문제 풀이, 공부 계획, 동기부여. 쉽고 친절하게.
2. 최근 소식 친구 — 사용자가 요즘 소식·뉴스·날씨·오늘 일어난 일 등 최신 정보를 물으면 너는 웹 검색 도구를 쓸 수 있어. 최신 정보가 필요한 질문에는 검색해서 정확하게 알려줘.
3. 재미있는 친구 — 농담, 이야기, 게임, 그냥 수다.

규칙:
- 답변은 보통 짧고 대화체로 (2~5문장). 길게 설명해야 할 때만 길게.
- 항상 쿠키 캐릭터를 유지해.`;

function needsWebSearch(text: string) {
  if (!text) return false;
  const clean = text.toLowerCase();
  const searchKeywords = [
    '날씨', '온도', '기온', '뉴스', '실시간', '검색', '오늘 일어난 일', '주식', '환율', '경기 결과', '스코어'
  ];
  return searchKeywords.some(kw => clean.includes(kw));
}

export async function POST(request: Request) {
  try {
    if (!GEMINI_API_KEY) {
      console.error("[Cookie Chat API Error] GEMINI_API_KEY가 설정되지 않았습니다.");
      return NextResponse.json(
        { response: "쿠키가 지금 대답하기 어려워 보여 🐾 (API Key 없음)" },
        { status: 500 }
      );
    }

    const { messages } = await request.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { response: "올바른 대화 이력이 필요해 🐾" },
        { status: 400 }
      );
    }

    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content || "" }]
    }));

    const lastUserMessage = messages.filter((m: any) => m.role === 'user').slice(-1)[0]?.content || '';
    const useSearch = needsWebSearch(lastUserMessage);

    const bodyPayload: any = {
      contents: contents,
      systemInstruction: {
        parts: [{ text: SYSTEM }]
      }
    };

    if (useSearch) {
      bodyPayload.tools = [{ google_search: {} }];
    }

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Cookie Chat API Error] Gemini API 호출 실패: ${response.status}`, errText);
      return NextResponse.json(
        { response: "쿠키가 지금 생각 중이라 대답하기 어렵대 🐾 잠시 후 다시 말 걸어줘!" },
        { status: 502 }
      );
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "음... 무슨 말인지 잘 모르겠어 🐾";

    return NextResponse.json({ response: reply.trim() });
  } catch (error) {
    console.error("[Cookie Chat API Error] 내부 서버 오류:", error);
    return NextResponse.json(
      { response: "쿠키가 네트워크 연결 오류를 겪고 있어 🐾 잠시 후 다시 시도해줘!" },
      { status: 500 }
    );
  }
}
