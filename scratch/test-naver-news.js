import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...values] = trimmed.split('=');
      if (key) {
        process.env[key.trim()] = values.join('=').trim();
      }
    }
  });
}

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

async function searchNews(query) {
  const params = new URLSearchParams({
    query: query,
    display: '10',
    sort: 'sim'
  });
  const url = `https://openapi.naver.com/v1/search/news.json?${params.toString()}`;
  try {
    const response = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
      }
    });
    if (!response.ok) {
      console.error(`Failed to fetch for query: ${query}, Status: ${response.status}`);
      return [];
    }
    const result = await response.json();
    return result.items || [];
  } catch (err) {
    console.error(`Error searching news for: ${query}`, err);
    return [];
  }
}

async function main() {
  const queries = ['청년 혜택', '정부 지원금', '공공서비스 혜택', '청년미래적금', '청년도약계좌'];
  for (const q of queries) {
    console.log(`\n=== 검색어: "${q}" ===`);
    const items = await searchNews(q);
    items.slice(0, 5).forEach((item, idx) => {
      console.log(`[${idx+1}] ${item.title.replace(/<[^>]*>/g, '')}`);
      console.log(`    요약: ${item.description.replace(/<[^>]*>/g, '')}`);
      console.log(`    링크: ${item.link}`);
      console.log(`    날짜: ${item.pubDate}`);
    });
  }
}

main();
