import { generateSummaryImage, generateAndSaveImage } from '../scripts/image-generator.js';

async function main() {
  console.log("=== 티빙 포스트 이미지 자동 생성 스크립트 실행 ===");

  const fileKey = "tving-privacy-leak-check";

  // 1. 썸네일 이미지 생성 (Pexels 검색 기반)
  console.log("\n[1단계] 썸네일 카드 이미지 생성 시작...");
  const summaryTitle = "티빙 개인정보 유출 확인 바로가기";
  const summaryDesc = "유출 여부를 신속하게 조회하고 비밀번호 변경으로 소중한 계정을 지키세요.";
  const summaryPath = await generateSummaryImage(summaryTitle, summaryDesc, fileKey);
  console.log("-> 생성 완료! 저장 경로:", summaryPath);

  // 2. 본문 이미지 1 생성 (Pixabay 검색 기반)
  console.log("\n[2단계] 본문 이미지 1 생성 시작...");
  const body1Filename = `body-${fileKey}-1.jpg`;
  const body1Path = await generateAndSaveImage("cyber security, protection", body1Filename);
  console.log("-> 생성 완료! 저장 경로:", body1Path);

  // 3. 본문 이미지 2 생성 (Pixabay 검색 기반)
  console.log("\n[3단계] 본문 이미지 2 생성 시작...");
  const body2Filename = `body-${fileKey}-2.jpg`;
  const body2Path = await generateAndSaveImage("password reset, safe", body2Filename);
  console.log("-> 생성 완료! 저장 경로:", body2Path);

  console.log("\n=== 모든 이미지 생성 및 수집이 성공적으로 완료되었습니다! ===");
}

main().catch(err => {
  console.error("스크립트 실행 중 에러 발생:", err);
});
