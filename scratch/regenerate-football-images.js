import pkg from '@next/env';
const { loadEnvConfig } = pkg;
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 로컬 환경변수 파일(.env.local) 자동 로드
loadEnvConfig(path.join(__dirname, '..'));

import { generateAndSaveImage, generateSummaryImage } from '../scripts/image-generator.js';

async function main() {
  console.log("=== 멕시코전 축구 글 이미지 재제작 시작 ===");

  const postKey = "2026-06-19-son-heung-min-mexico";

  // 1. 본문 이미지 2번 재생성 (장애인 축구 이미지 -> 역동적인 국가대표 축구 골 셀레브레이션 일러스트)
  console.log("\n[1] 본문 이미지 재생성 중...");
  const bodyFilename = `body-${postKey}-2.jpg`;
  const bodyPrompt = "A professional Korean football player wearing a red national team jersey celebrating a goal on a soccer field, dynamic action shot, modern webtoon style, warm pastel colors, clean vector illustration, no text";
  
  const bodyPath = await generateAndSaveImage(
    bodyPrompt,
    bodyFilename,
    '4:3',
    0,
    true // forceAI 강제 활성화 (Pixabay 우회)
  );
  console.log("-> 본문 이미지 완료! 경로:", bodyPath);

  // 2. 썸네일 카드 및 배경 이미지 재생성
  console.log("\n[2] 썸네일 카드 및 배경 이미지 재생성 중...");
  const title = "축구 팬들 심장 뛰게 하는 홍명보호 멕시코전 손흥민 원톱 선발 출격 소식과 관전 포인트 총정리";
  const summary = "홍명보 감독이 이끄는 대한민국 축구 대표팀의 멕시코전 선발 라인업이 공개되며 손흥민 선수의 원톱 출격이 확정되었습니다.";
  
  const summaryPath = await generateSummaryImage(
    title,
    summary,
    postKey,
    true // forceAI 강제 활성화 (Pexels 우회)
  );
  console.log("-> 썸네일 카드 완료! 경로:", summaryPath);

  console.log("\n=== 축구 이미지 재생성 완료! ===");
}

main().catch(err => {
  console.error("스크립트 실행 중 에러 발생:", err);
});
