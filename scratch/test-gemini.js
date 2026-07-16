const key = "AIzaSyDZqItd-wFUq23im6ZKb_Uw-sYhj5MFk3o";

async function testModel(model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "안녕? 반가워! 오늘 하남시 날씨 어때?" }] }],
        tools: [{ google_search: {} }]
      })
    });
    console.log(`Model: ${model} -> Status: ${res.status}`);
    const data = await res.json();
    if (res.ok) {
      console.log(`Response: ${data.candidates?.[0]?.content?.parts?.[0]?.text}`);
    } else {
      console.log(`Error: ${JSON.stringify(data.error)}`);
    }
  } catch (err) {
    console.error(`Error testing ${model}:`, err.message);
  }
}

async function run() {
  console.log("--- Testing Gemini Models ---");
  await testModel("gemini-1.5-flash");
  await testModel("gemini-3.1-flash-lite");
  await testModel("gemini-3.5-flash");
}
run();
