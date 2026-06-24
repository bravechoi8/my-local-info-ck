const apiKey = "AIzaSyCgyZMALhpUY-kpzPa9VflkbkkL_vjp4-o";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function main() {
  try {
    const res = await fetch(url);
    const data = await res.json();
    const geminiModels = data.models
      .filter(m => m.name.includes("gemini") && m.supportedGenerationMethods.includes("generateContent"))
      .map(m => ({ name: m.name, version: m.version, displayName: m.displayName }));
    console.log(JSON.stringify(geminiModels, null, 2));
  } catch (e) {
    console.error(e);
  }
}

main();
