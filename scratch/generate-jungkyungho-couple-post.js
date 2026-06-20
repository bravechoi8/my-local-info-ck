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
  console.log("=== 정경호♥수영 포스트 이미지 자동 생성 스크립트 실행 ===");

  const fileKey = "2026-06-16-jungkyungho-sooyoung-couple";

  // 1. 썸네일 이미지 생성 (이별 테마의 차분한 캐릭터 카드)
  console.log("\n[1단계] 썸네일 카드 이미지 생성 시작...");
  const summaryTitle = "정경호♥수영 14년 열애 종지부";
  const summaryDesc = "14년간 예쁜 만남을 이어오며 많은 사랑을 받았던 배우 정경호와 수영의 안타까운 결별 공식 입장 정리";
  const summaryPath = await generateSummaryImage(summaryTitle, summaryDesc, fileKey);
  console.log("-> 생성 완료! 저장 경로:", summaryPath);

  // 2. 본문 이미지 1 생성 (쓸쓸한 이별 모습 일러스트)
  console.log("\n[2단계] 본문 이미지 1 생성 시작...");
  const body1Filename = `body-${fileKey}-1.jpg`;
  const body1Path = await generateAndSaveImage(
    "A melancholic digital illustration of a young Korean man and a young Korean woman walking in opposite directions in a quiet street at sunset, looking back with complex and nostalgic expressions, modern webtoon style, soft moody colors, digital illustration",
    body1Filename
  );
  console.log("-> 생성 완료! 저장 경로:", body1Path);

  // 3. 본문 이미지 2 생성 (차분한 단독 여성 캐릭터 일러스트)
  console.log("\n[3단계] 본문 이미지 2 생성 시작...");
  const body2Filename = `body-${fileKey}-2.jpg`;
  const body2Path = await generateAndSaveImage(
    "A close-up illustration of a beautiful young Korean woman with a calm and nostalgic expression, looking out a window thoughtfully, modern webtoon style, soft warm colors, digital art",
    body2Filename
  );
  console.log("-> 생성 완료! 저장 경로:", body2Path);

  console.log("\n=== 모든 이미지 생성 및 수집이 성공적으로 완료되었습니다! ===");
}

main().catch(err => {
  console.error("스크립트 실행 중 에러 발생:", err);
});
