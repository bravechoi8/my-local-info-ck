export async function onRequestPost(context) {
  try {
    const { message, sender } = await context.request.json();

    if (!message || !sender) {
      return new Response(
        JSON.stringify({ error: "message와 sender 항목은 필수입니다." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

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

    const timestamp = Date.now();
    const key = `msg_${timestamp}`;
    const value = {
      message,
      sender,
      timestamp,
    };

    // Cloudflare KV 저장소에 저장
    await context.env.CHAT_KV.put(key, JSON.stringify(value));

    return new Response(
      JSON.stringify({ success: true, key, data: value }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
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
