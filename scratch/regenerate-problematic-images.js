import pkg from '@next/env';
const { loadEnvConfig } = pkg;
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 로컬 환경변수 파일(.env.local) 자동 로드
loadEnvConfig(path.join(__dirname, '..'));

import { generateAndSaveImage } from '../scripts/image-generator.js';

async function main() {
  console.log("=== 6월 17일 포스트 내 중복 하트 이미지 재제작 시작 ===");

  // 1. 일본 여행 카드 글의 이미지 1번 (하트 책 -> 일본 여행 특화 카드 일러스트)
  console.log("\n[1] 일본 여행 카드 글의 이미지 1번 재생성 중...");
  const cardKey = "2026-06-17-japan-travel-card";
  const cardFilename = `body-${cardKey}-1.jpg`;
  const cardPath = await generateAndSaveImage(
    "A vibrant digital illustration of a smartphone displaying a travel credit card next to Japanese coins and a passport, Tokyo cherry blossoms in the soft blurred background, modern webtoon style, warm pastel colors, clean vector art",
    cardFilename,
    '4:3',
    0,
    true // forceAI 활성화 (Pixabay 우회)
  );
  console.log("-> 완료! 경로:", cardPath);

  // 2. 중고차 대출 사기 글의 이미지 1번 (하트 책 -> 중고차 대출 사기 경고 일러스트)
  console.log("\n[2] 중고차 대출 사기 글의 이미지 1번 재생성 중...");
  const scamKey = "2026-06-17-used-car-loan-scam";
  const scamFilename = `body-${scamKey}-1.jpg`;
  const scamPath = await generateAndSaveImage(
    "A professional vector illustration of a warning shield icon overlaying a used car sale contract and keys, caution tape in the background, warning concept, modern webtoon style, bold yellow and dark gray theme",
    scamFilename,
    '4:3',
    0,
    true // forceAI 활성화 (Pixabay 우회)
  );
  console.log("-> 완료! 경로:", scamPath);

  // 3. 한국은행 금리 인상 글의 이미지 2번 (하트 책 -> 고금리 예적금/저축 돼지저금통 일러스트)
  console.log("\n[3] 한국은행 금리 인상 글의 이미지 2번 재생성 중...");
  const bokKey = "2026-06-17-bok-rate-hike";
  const bokFilename = `body-${bokKey}-2.jpg`;
  const bokPath = await generateAndSaveImage(
    "A clean digital illustration of a piggy bank filled with shiny gold coins, an upward trend financial arrow in the background, warm friendly pastel colors, modern webtoon style",
    bokFilename,
    '4:3',
    0,
    true // forceAI 활성화 (Pixabay 우회)
  );
  console.log("-> 완료! 경로:", bokPath);

  console.log("\n=== 모든 이미지 재생성 작업이 완료되었습니다! ===");
}

main().catch(err => {
  console.error("스크립트 실행 중 에러 발생:", err);
});
