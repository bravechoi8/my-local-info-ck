import pkg from '@next/env';
const { loadEnvConfig } = pkg;
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
loadEnvConfig(path.join(__dirname, '..'));

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) {
      console.error('API Error:', data.error);
      return;
    }
    const models = data.models || [];
    console.log('--- Models ---');
    console.log(JSON.stringify(models.map(m => m.name), null, 2));
  } catch (e) {
    console.error(e);
  }
}
main();
