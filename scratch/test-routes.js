async function testRoute(name, url, payload) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    console.log(`[API Test] ${name} -> Status: ${res.status}`);
    const data = await res.json();
    if (res.ok) {
      console.log(`Response: ${data.response}`);
    } else {
      console.log(`Error: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    console.error(`Error testing ${name}:`, err.message);
  }
}

async function run() {
  console.log("--- Testing Local API Routes ---");
  
  // 1. 일반 챗봇 '척척' API 테스트
  await testRoute(
    "CheokCheok Chat (/api/chat)", 
    "http://localhost:3001/api/chat", 
    { message: "안녕! 오늘 서울 날씨 어때?" }
  );

  // 2. 플래너 챗봇 '쿠키' API 테스트
  await testRoute(
    "Cookie Chat (/api/cookie-chat)", 
    "http://localhost:3001/api/cookie-chat", 
    {
      messages: [
        { role: "user", content: "안녕 쿠키야! 내가 오늘 공부를 30분 했는데 칭찬해줘." }
      ]
    }
  );
}
run();
