import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPexelsImage } from '../scripts/pexels.js';

// === 로컬 환경변수 파일(.env.local) 수동 로드 코드 ===
// 일반 Node.js 단독 실행 환경에서는 .env.local 파일을 자동으로 읽지 못하므로
// 아래 코드로 파일의 내용을 직접 파싱해 process.env에 주입합니다.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '..', '.env.local');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...values] = trimmed.split('=');
      if (key) {
        const val = values.join('=').trim();
        process.env[key.trim()] = val;
      }
    }
  });
}
// ===================================================

async function runTest() {
  console.log("Pexels API 테스트를 시작합니다...");
  console.log("검색어: 'nature' (자연)\n");

  try {
    const imageUrl = await getPexelsImage('nature');
    
    if (imageUrl) {
      console.log("==========================================");
      console.log("🎉 API 연동 성공!");
      console.log("가져온 이미지 주소:");
      console.log(imageUrl);
      console.log("==========================================");
    } else {
      console.log("❌ 이미지 가져오기 실패");
      console.log("이유: 이미지 주소를 받지 못했습니다. .env.local 파일에 키가 올바르게 입력되었는지 확인해 주세요.");
    }
  } catch (error) {
    console.error("❌ 오류가 발생했습니다:", error);
  }
}

runTest();
