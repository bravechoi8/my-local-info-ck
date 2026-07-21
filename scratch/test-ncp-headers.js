import pkg from '@next/env';
const { loadEnvConfig } = pkg;
import filePath from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = filePath.dirname(__filename);
loadEnvConfig(filePath.join(__dirname, '..'));

const ID = process.env.NAVER_CLIENT_ID;
const SECRET = process.env.NAVER_CLIENT_SECRET;

console.log('ID:', ID);
console.log('SECRET:', SECRET);

const urlHub = 'https://naverapihub.apigw.ntruss.com/search/v1/news?query=%ED%85%8C%EC%8A%A4%ED%8A%B8';

async function testHub() {
  console.log('--- Test NAVER API HUB ---');
  const res = await fetch(urlHub, {
    headers: {
      'X-NCP-APIGW-API-KEY-ID': ID,
      'X-NCP-APIGW-API-KEY': SECRET
    }
  });
  console.log('HUB Status:', res.status);
  const text = await res.text();
  console.log('HUB Body:', text.slice(0, 300));
}

await testHub();
