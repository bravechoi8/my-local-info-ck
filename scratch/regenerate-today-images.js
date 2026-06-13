import pkg from '@next/env';
const { loadEnvConfig } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// 환경 변수 로드
loadEnvConfig(projectRoot);

import { generateAndSaveImage, generateSummaryImage } from '../scripts/image-generator.js';

// 오늘 날짜 (2026-06-13)의 포스트 정보와 키워드 매핑
const postConfigs = [
  {
    fileName: '2026-06-13-chueotang-benefits.md',
    keyword: 'korean food, healthy soup, hot pot',
    title: '축구 국가대표 오현규가 반한 보양식 추어탕 효능 및 맛과 영양 두 배로 즐기는 꿀팁 총정리',
    summary: '축구 국가대표 오현규 선수의 무한 체력 비결로 주목받은 추어탕의 영양학적 효능과 건강하게 섭취하는 실전 팁을 상세히 소개합니다.',
    filenameKey: '2026-06-13-chueotang-benefits'
  },
  {
    fileName: '2026-06-13-eli-remarriage.md',
    keyword: 'wedding, romantic couple, love',
    title: '일라이 지연수 재혼 소식에 쏠린 대중의 관심과 향후 행보 총정리',
    summary: '방송인 일라이와 지연수 부부의 재혼 소식 관련 대중의 반응과 앞으로의 전망을 전해드립니다.',
    filenameKey: '2026-06-13-eli-remarriage'
  },
  {
    fileName: '2026-06-13-emergency-housing-support.md',
    keyword: 'house, happy family home, key house',
    title: '위기 가구를 위한 긴급복지 주거지원 대상자 선정 기준 및 신청 방법 총정리',
    summary: '갑작스러운 위기 상황으로 주거지를 잃은 가구를 지원하는 긴급복지 주거지원의 상세 기준과 구체적인 신청 방법을 알려드립니다.',
    filenameKey: '2026-06-13-emergency-housing-support'
  },
  {
    fileName: '2026-06-13-emergency-welfare-birth-benefit.md',
    keyword: 'newborn baby, baby feet, pregnant woman',
    title: '위기 가구 대상 긴급복지 해산비 지원 신청 대상 및 지원 금액 총정리',
    summary: '갑작스러운 위기 상황에서 출산한 가구에게 해산비를 지원하는 긴급복지 제도에 대한 상세 정보와 신청 가이드를 안내합니다.',
    filenameKey: '2026-06-13-emergency-welfare-birth-benefit'
  },
  {
    fileName: '2026-06-13-gold-investment.md',
    keyword: 'gold bars, gold coins, gold investment',
    title: '기준금리 인상 조짐 속 안전자산 금 투자 전략 및 전망 총정리',
    summary: '미국 연준과 한국은행의 금리 추가 인상 신호 속에서 안전자산 대표주자인 금 투자 타이밍과 효율적인 투자법을 상세히 분석합니다.',
    filenameKey: '2026-06-13-gold-investment'
  },
  {
    fileName: '2026-06-13-interest-rate-hike.md',
    keyword: 'interest rate chart, money saving, banking finance',
    title: '한국은행 금융통화위원회 기준금리 추가 인상 전망 및 가계 금융 대응법 총정리',
    summary: '한은의 기준금리 추가 인상 시그널에 따른 가계 대출 금리 부담 완화 전략과 예적금 포트폴리오 재조정 실전 가이드를 전해드립니다.',
    filenameKey: '2026-06-13-interest-rate-hike'
  },
  {
    fileName: '2026-06-13-spacex-ipo-musk.md',
    keyword: 'space rocket, space launch, mars mission',
    title: '일론 머스크의 스페이스X 상장(IPO) 전망과 투자 시 주의점 총정리',
    summary: '우주 항공 개척 선두주자 스페이스X의 신규 상장 가능성에 대한 시장 예측과 투자자 관점에서의 전망을 꼼꼼히 정리해 드립니다.',
    filenameKey: '2026-06-13-spacex-ipo-musk'
  }
];

async function run() {
  console.log("=== 6월 13일자 포스트 이미지 픽사베이 및 펙셀스 하이브리드 재생성 시작 ===");
  
  for (const config of postConfigs) {
    const postFilePath = path.join(projectRoot, 'src', 'content', 'posts', config.fileName);
    if (!fs.existsSync(postFilePath)) {
      console.log(`[파일 미존재 건너뜀] ${config.fileName}`);
      continue;
    }
    
    console.log(`\n--------------------------------------------`);
    console.log(`[진행 중] 포스트: ${config.fileName}`);
    console.log(`👉 제목: "${config.title}"`);
    console.log(`👉 키워드: "${config.keyword}"`);
    
    // 1단계: 썸네일 대표 카드 이미지 다시 생성 (generateSummaryImage)
    console.log(`[1단계] 요약 카드 생성 중...`);
    const summaryCardPath = await generateSummaryImage(config.title, config.summary, config.filenameKey);
    console.log(`-> 요약 카드 생성 완료: ${summaryCardPath}`);
    
    // 2단계: 본문 내부 이미지 3개 재생성 (generateAndSaveImage)
    for (let i = 1; i <= 3; i++) {
      const bodyImageName = `body-${config.filenameKey}-${i}.jpg`;
      console.log(`[2단계] 본문 이미지 ${i} 생성 중 (${bodyImageName})...`);
      const bodyImagePrompt = `${config.keyword}, clean modern style`;
      const savedPath = await generateAndSaveImage(bodyImagePrompt, bodyImageName, '4:3', i - 1);
      console.log(`-> 본문 이미지 ${i} 완료: ${savedPath}`);
    }
  }
  
  console.log("\n============================================");
  console.log("=== 모든 이미지 재생성 작업이 완료되었습니다! ===");
  console.log("============================================");
}

run().catch(err => {
  console.error("에러 발생:", err);
});
