import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateSummaryImage, generateAndSaveImage } from '../scripts/image-generator.js';

// === 로컬 환경변수 파일(.env.local) 수동 로드 ===
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

async function run() {
  console.log("==================================================");
  console.log("📢 오늘 아침 글들의 이미지를 펙셀스(Pexels) 실사로 재생성합니다.");
  console.log("==================================================");

  // 1. 경기도 고유가 피해지원금 포스트 이미지 업데이트
  console.log("\n[1/2] 경기도 고유가 지원금 포스트 이미지 생성 중...");
  try {
    const card1 = await generateSummaryImage(
      "찾아가서 챙겨주는 경기도 고유가 피해지원금 신청 방법과 취약계층 혜택 총정리",
      "경기도가 거동이 불편한 취약계층을 위해 직접 찾아가는 고유가 피해지원금 신청 서비스를 운영해 총 2만 3천여 건을 지원했습니다.",
      "2026-06-11-gyeonggi-oil-subsidy"
    );
    console.log("✅ 요약 카드 완료:", card1);

    const body1_1 = await generateAndSaveImage(
      "gas station fuel pump, car refueling",
      "body-2026-06-11-gyeonggi-oil-subsidy-1.jpg",
      "4:3"
    );
    console.log("✅ 본문 이미지 1 완료:", body1_1);

    const body1_2 = await generateAndSaveImage(
      "elderly care home visit, social worker helping senior",
      "body-2026-06-11-gyeonggi-oil-subsidy-2.jpg",
      "4:3"
    );
    console.log("✅ 본문 이미지 2 완료:", body1_2);
  } catch (err) {
    console.error("❌ 경기도 지원금 이미지 생성 실패:", err.message);
  }

  // 2. 미국 이란 이틀 연속 공습 포스트 이미지 업데이트
  console.log("\n[2/2] 미국 이란 공습 포스트 이미지 생성 중...");
  try {
    const card2 = await generateSummaryImage(
      "미국 이란 이틀 연속 공습으로 중동 전쟁 위기 최고조 기름값 폭등 우려와 우리가 꼭 알아야 할 경제적 영향 총정리",
      "미국이 이란에 이틀 연속으로 추가 공습을 단행하면서 중동 지역의 군사적 긴장감이 최고조로 치닫고 있습니다.",
      "2026-06-11-us-iran-airstrikes"
    );
    console.log("✅ 요약 카드 완료:", card2);

    const body2_1 = await generateAndSaveImage(
      "military fighter jet, sky flight or military aircraft",
      "body-2026-06-11-us-iran-airstrikes-1.jpg",
      "4:3"
    );
    console.log("✅ 본문 이미지 1 완료:", body2_1);

    const body2_2 = await generateAndSaveImage(
      "global financial stock market chart down, dollar exchange rate rise",
      "body-2026-06-11-us-iran-airstrikes-2.jpg",
      "4:3"
    );
    console.log("✅ 본문 이미지 2 완료:", body2_2);
  } catch (err) {
    console.error("❌ 미국 이란 공습 이미지 생성 실패:", err.message);
  }

  console.log("\n==================================================");
  console.log("🎉 이미지 펙셀스 실사 재생성 작업 완료!");
  console.log("==================================================");
}

run();
