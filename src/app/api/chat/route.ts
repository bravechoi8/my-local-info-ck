import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent";

export async function POST(request: Request) {
  try {
    if (!GEMINI_API_KEY) {
      console.error("[Chat API Error] GEMINI_API_KEY가 설정되지 않았습니다.");
      return NextResponse.json(
        { response: "죄송합니다. 서버 설정에 오류가 있어 대화가 불가능합니다. (API Key 없음)" },
        { status: 500 }
      );
    }

    const { message } = await request.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { response: "질문을 입력해 주세요." },
        { status: 400 }
      );
    }

    const systemInstruction = "너는 '리얼인포' 웹사이트의 인공지능 정보 가이드 '척척'이야. 친절하고 신뢰감 있는 말투로 전국의 생활 정보, 혜택, 복지 지원금에 대해 설명해줘. 한국어로 대답하고 가끔 이모지 💬✨를 자연스럽게 섞어줘.";

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: message }]
          }
        ],
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        tools: [{ google_search: {} }] // 구글 검색을 통한 실시간 최신 정보 반영
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Chat API Error] Gemini API 호출 실패: ${response.status}`, errText);
      return NextResponse.json(
        { response: "죄송합니다. 인공지능 서버에서 일시적으로 응답하지 않고 있습니다. 잠시 후 다시 시도해 주세요." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "답변을 생성하지 못했습니다. 다시 물어봐 주세요.";

    return NextResponse.json({ response: reply.trim() });
  } catch (error: any) {
    console.error("[Chat API Error] 내부 서버 오류 발생:", error);
    return NextResponse.json(
      { response: "서버 연결에 오류가 발생했습니다. 잠시 후 다시 대화를 시도해 주세요." },
      { status: 500 }
    );
  }
}
