import pkg from '@next/env';
const { loadEnvConfig } = pkg;
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 로컬 환경변수 파일(.env.local) 자동 로드
loadEnvConfig(path.join(__dirname, '..'));

import { generateAndSaveImage } from '../scripts/image-generator.js';

async function runTask(prompt, filename) {
  console.log(`\n-> 재생성 중: ${filename}`);
  try {
    const resPath = await generateAndSaveImage(
      prompt,
      filename,
      '4:3',
      0,
      true // Pixabay 우회하고 AI 이미지 생성을 강제
    );
    console.log(`   완료! 저장 경로: ${resPath}`);
  } catch (err) {
    console.error(`   실패: ${filename} - ${err.message}`);
  }
}

async function main() {
  console.log("=========================================");
  console.log("   블로그 중복 하트 책 이미지 일괄 갱신 스크립트");
  console.log("=========================================");

  const tasks = [
    // [1] 최태원-노소영 이혼 조정
    {
      filename: "body-2026-06-15-chey-roh-mediation-2.jpg",
      prompt: "A professional illustration representing mediation or courthouse agreement. Scales of justice, legal documents with a pen, courthouse building in a soft blurred background, corporate style"
    },
    // [2] 장애인 도서관 확대
    {
      filename: "body-2026-06-15-disabled-library-extension-2.jpg",
      prompt: "A warm and inclusive digital illustration of a barrier-free library space. Bookshelves with audiobooks and braille, a cozy reading desk, pastel colors, clean vector style"
    },
    // [3] 이란 전쟁 종료
    {
      filename: "body-2026-06-15-iran-war-ends-2.jpg",
      prompt: "A conceptual illustration symbolizing peace and diplomacy. Hands shaking in front of world maps, a white dove flying, soft warm gradients, hopeful atmosphere"
    },
    // [4] 전북 장학금
    {
      filename: "body-2026-06-16-jeonbuk-scholarship-2.jpg",
      prompt: "A happy Korean university student wearing a graduation cap, holding a certificate, bright future concept, warm pastel colors, clean vector design"
    },
    // [5] 소상공인 폐업 지원 2
    {
      filename: "body-2026-06-16-small-business-closure-support-2.jpg",
      prompt: "A supportive conceptual illustration of financial aid for small business owners. Hand offering support next to a cozy local shop facade, growth arrows, warm and hopeful color palette"
    },
    // [6] 로컬 크리에이터 지원
    {
      filename: "body-2026-06-18-local-creator-support-1.jpg",
      prompt: "A modern workspace showing a laptop, camera, creative design tools, and plants, representing creative work and local content creation, flat design vector"
    },
    // [7] 원달러 환율 FOMC
    {
      filename: "body-2026-06-18-won-dollar-fomc-1.jpg",
      prompt: "A professional business concept showing USD bill and KRW symbols on a financial graph with an upward trend, stock market board in the background, cool tech colors"
    },
    // [8] 대신 크레온 이벤트
    {
      filename: "body-2026-06-19-daishin-creon-event-2.jpg",
      prompt: "A smartphone displaying a stock trading application with growth charts, gold coins scattering around, vibrant blue background, modern digital illustration"
    },
    // [9] 독립유공자 후손 지원
    {
      filename: "body-2026-06-19-independence-activist-descendant-support-2.jpg",
      prompt: "A conceptual illustration of national remembrance and honor. The Korean flag symbol beautifully integrated with a laurel wreath and gold star, warm solemn light"
    },
    // [10] 용인 출산 보조금
    {
      filename: "body-2026-06-20-yongin-fertility-subsidy-1.jpg",
      prompt: "A warm vector illustration of a baby stroller and small baby shoes, soft hearts floating around, cozy nursery room background, pastel colors"
    },
    // [11] 자연휴양림 할인
    {
      filename: "body-2026-06-16-forest-discount-2.jpg",
      prompt: "A beautiful green forest trail with towering trees and a cozy wooden cabin, sunny day, travel and nature adventure concept, clean digital painting"
    },
    // [12] 전북 서울 장학숙 기숙사
    {
      filename: "body-2026-06-16-jeonbuk-seoul-dormitory-2.jpg",
      prompt: "A clean modern university dormitory room with a study desk, bookshelf, cozy window light, students lifestyle concept, flat design vector illustration"
    },
    // [13] 소상공인 폐업 지원 1
    {
      filename: "body-2026-06-16-small-business-closure-support-1.jpg",
      prompt: "A friendly consultant talking to a store owner, clipboard with checklists, business consulting and restart support concept, warm flat illustration"
    },
    // [14] 남궁민 진아름 부부 임신
    {
      filename: "body-2026-06-19-namkoongmin-jina-reum-pregnancy-1.jpg",
      prompt: "A beautiful conceptual illustration of a happy Korean couple embracing warmly, surrounded by small cute flowers and soft warm lights, romantic webtoon style"
    }
  ];

  for (const task of tasks) {
    await runTask(task.prompt, task.filename);
  }

  console.log("\n=========================================");
  console.log("   모든 중복 이미지 갱신 작업이 성공적으로 끝났습니다!");
  console.log("=========================================");
}

main().catch(err => {
  console.error("일괄 실행 오류:", err);
});
