import pkg from '@next/env';
const { loadEnvConfig } = pkg;
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 로컬 환경변수 파일(.env.local) 자동 로드
loadEnvConfig(path.join(__dirname, '..'));

import { generateSummaryImage, generateAndSaveImage } from '../scripts/image-generator.js';

async function main() {
  console.log("=== 6/17 신규 핫이슈 3종 이미지 생성 스크립트 실행 ===");

  // 1. 임현식 배우 근황 포스트 이미지 생성
  console.log("\n[1] 배우 임현식 건강 근황 포스트 이미지 생성 시작...");
  const key1 = "2026-06-17-imhyunsik-health-update";
  await generateSummaryImage(
    "임현식 건강 고백 및 루머 해명",
    "배우 임현식의 최근 건강 고백과 과거 와전되었던 농약 중독 루머의 진짜 전말을 정리해 드립니다.",
    key1
  );
  await generateAndSaveImage(
    "A digital illustration of a friendly-looking elderly Korean male actor in his 70s with a warm and humorous smile, sitting in a cozy living room, modern webtoon style, soft warm colors, digital art",
    `body-${key1}-1.jpg`
  );
  await generateAndSaveImage(
    "A digital illustration of a peaceful countryside house with a small apple orchard and red apples on trees under a sunny blue sky, modern webtoon style, bright soft colors, digital art",
    `body-${key1}-2.jpg`
  );
  console.log("-> 임현식 이미지 생성 완료!");

  // 2. 선관위 국정조사 포스트 이미지 생성
  console.log("\n[2] 선관위 투표용지 부족 국정조사 포스트 이미지 생성 시작...");
  const key2 = "2026-06-17-nec-ballot-shortage-investigation";
  await generateSummaryImage(
    "선관위 투표용지 부족 국정조사",
    "6·3 지방선거 투표용지 부족 사태와 예산 미집행 의혹에 대한 45일간 국정조사 전격 합의 내용 총정리",
    key2
  );
  await generateAndSaveImage(
    "A minimalist illustration of a public building representing an election office with a scale of justice, modern flat vector design, clean composition, warm beige background, no text",
    `body-${key2}-1.jpg`
  );
  await generateAndSaveImage(
    "An illustration of a ballot box with a paper ballot being inserted, showing concern or complexity, modern flat design, no text",
    `body-${key2}-2.jpg`
  );
  console.log("-> 선관위 이미지 생성 완료!");

  // 3. 월드컵 맹활약 포스트 이미지 생성
  console.log("\n[3] 북중미 월드컵 홀란·음바페 맹활약 포스트 이미지 생성 시작...");
  const key3 = "2026-06-17-worldcup-news-holland-mbappe";
  await generateSummaryImage(
    "북중미 월드컵 홀란·음바페 활약",
    "2026 북중미 월드컵 프랑스와 노르웨이 대승 및 음바페, 홀란의 맹활약 최신 소식 정리",
    key3
  );
  await generateAndSaveImage(
    "A dynamic digital illustration of a professional soccer player in a blue jersey celebrating a goal in a massive stadium, modern webtoon style, energetic soft lighting, digital art",
    `body-${key3}-1.jpg`
  );
  await generateAndSaveImage(
    "A dynamic digital illustration of a tall, athletic soccer player with blond hair celebrating a goal in a stadium under bright lights, modern webtoon style, energetic feel",
    `body-${key3}-2.jpg`
  );
  console.log("-> 월드컵 이미지 생성 완료!");

  console.log("\n=== 모든 이미지 생성 작업이 완료되었습니다! ===");
}

main().catch(err => {
  console.error("스크립트 실행 중 에러 발생:", err);
});
