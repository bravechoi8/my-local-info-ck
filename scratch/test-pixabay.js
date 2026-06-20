import pkg from '@next/env';
const { loadEnvConfig } = pkg;
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env.local 파일 로드
loadEnvConfig(path.join(__dirname, '..'));

import { getPixabayImage } from '../scripts/pixabay.js';
import { generateAndSaveImage, generateSummaryImage } from '../scripts/image-generator.js';

async function test() {
  console.log("=== [1단계] Pixabay 이미지 검색 기능 단독 테스트 ===");
  
  // 1. 키가 없을 때 (또는 기본값일 때) Fallback 및 경고가 잘 나오는지 검증
  const originalKey = process.env.PIXABAY_API_KEY;
  process.env.PIXABAY_API_KEY = '여기에_발급받은_픽사베이_API_키를_입력하세요';
  
  console.log("\n[테스트 1-1] API 키가 없을 때의 동작:");
  const imgUrlNoKey = await getPixabayImage('wedding');
  console.log("-> 결과 (null이어야 함):", imgUrlNoKey);
  
  // API 키 복구 (실제 픽사베이 키가 아직 설정되어 있지 않다면 '여기에_발급받은_픽사베이_API_키를_입력하세요' 일 것임)
  process.env.PIXABAY_API_KEY = originalKey;
  
  console.log("\n[테스트 1-2] 설정된 API 키로 실제 픽사베이 검색 시도:");
  const imgUrlWithKey = await getPixabayImage('wedding');
  console.log("-> 검색 결과 이미지 URL:", imgUrlWithKey);

  console.log("\n=== [2단계] 본문 이미지 자동 생성(generateAndSaveImage) 연동 테스트 ===");
  // 'wedding, flat design illustration' 키워드로 본문 이미지 생성을 호출합니다.
  // 픽사베이 키가 있다면 픽사베이에서 가져와 다운로드할 것이고, 없다면 Imagen AI가 그릴 것입니다.
  const filename = 'test-body-wedding-image.jpg';
  console.log(`[테스트 2-1] 본문 이미지 생성 실행 (파일명: ${filename})...`);
  const relativePath = await generateAndSaveImage('wedding, flat design vector illustration', filename);
  console.log("-> 저장된 본문 이미지 상대 경로:", relativePath);

  console.log("\n=== [3단계] 썸네일(요약 이미지) 생성(generateSummaryImage) 테스트 ===");
  // 썸네일은 펙셀스(Pexels)를 사용해야 하므로, Pexels API 연동 및 요약 카드가 제대로 생성되는지 확인합니다.
  const summaryTitle = "결혼 페널티 정책 개선 총정리";
  const summaryText = "신혼부부를 위한 공공임대 및 청년미래적금 가입 문턱을 낮추고 결혼 불이익을 해소합니다.";
  const summaryFilenameKey = "test-wedding-summary";
  
  console.log(`[테스트 3-1] 요약 카드 생성 실행 (타이틀: ${summaryTitle})...`);
  const summaryPath = await generateSummaryImage(summaryTitle, summaryText, summaryFilenameKey);
  console.log("-> 저장된 요약 카드 SVG 경로:", summaryPath);
  
  console.log("\n=== 테스트 완료 ===");
}

test().catch(err => {
  console.error("테스트 중 예상치 못한 에러 발생:", err);
});
