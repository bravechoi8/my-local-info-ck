import pkg from '@next/env';
const { loadEnvConfig } = pkg;
import filePath from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = filePath.dirname(__filename);

loadEnvConfig(filePath.join(__dirname, '..'));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
console.log('GEMINI_API_KEY exists:', !!GEMINI_API_KEY);

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent';

async function testGemini() {
  try {
    const res = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Hello" }] }]
      })
    });
    console.log('Status:', res.status, res.statusText);
    const data = await res.text();
    console.log('Response:', data);
  } catch (err) {
    console.error('Error:', err);
  }
}

testGemini();
