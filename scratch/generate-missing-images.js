import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateSummaryImage, generateAndSaveImage } from '../scripts/image-generator.js';

// Load .env.local manually
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.substring(0, idx).trim();
      const val = trimmed.substring(idx + 1).trim();
      process.env[key] = val;
    }
  }
}

const postsDir = path.join(__dirname, '..', 'src', 'content', 'posts');

async function run() {
  const tasks = [];

  // 1. 2026-06-05-basic-pension.md
  const pensionFile = path.join(postsDir, '2026-06-05-basic-pension.md');
  if (fs.existsSync(pensionFile)) {
    console.log('Generating images for basic pension (in parallel)...');
    const task = (async () => {
      let content = fs.readFileSync(pensionFile, 'utf-8');
      
      // 동시에 카드 이미지와 본문 이미지 생성하기
      const [cardPath, body1, body2] = await Promise.all([
        generateSummaryImage(
          "노후 생활의 든든한 버팀목 기초연금 얼마나 받으면 적당할까 어르신들이 직접 답한 적정 금액과 신청 꿀팁 총정리",
          "국민연금연구원 설문조사를 통해 알아본 어르신들이 원하는 적정 기초연금액과 기초연금 신청 자격 및 방법을 알기 쉽게 정리해 드립니다",
          "2026-06-05-basic-pension"
        ),
        generateAndSaveImage(
          "an elderly couple looking at their piggy bank and smiling, cozy warm pastel illustration",
          "body-2026-06-05-basic-pension-1.jpg",
          "4:3"
        ),
        generateAndSaveImage(
          "a smartphone screen showing a government mobile app and documents, clean flat design vector illustration",
          "body-2026-06-05-basic-pension-2.jpg",
          "4:3"
        )
      ]);

      if (cardPath) {
        const frontmatterEnd = content.indexOf('\n---', 4);
        if (frontmatterEnd !== -1) {
          content = content.substring(0, frontmatterEnd + 4) +
            `\n\n![포스트 소개](${cardPath})` +
            content.substring(frontmatterEnd + 4);
        }
      }

      if (body1) {
        content = content.replace(
          /(현재 지급되고 있는 기초연금액\(약 33만 원 선\)보다 조금 더 현실적인 생활비 보조가 필요하다는 목소리가 반영된 결과로 보입니다\.)\s*(---)/,
          (match, p1, p2) => p1 + '\n\n![포스트 소개](' + body1 + ')\n\n' + p2
        );
      }

      if (body2) {
        content = content.replace(
          /(\* 전·월세 계약서 \(해당하는 경우\))\s*(#### \*\*🏢 신청 장소 및 방법\*\*)/,
          (match, p1, p2) => p1 + '\n\n![포스트 소개](' + body2 + ')\n\n' + p2
        );
      }

      fs.writeFileSync(pensionFile, content, 'utf-8');
      console.log('Basic pension updated!');
    })();
    tasks.push(task);
  }

  // 2. 2026-06-05-jensen-huang-korea-visit.md
  const jensenFile = path.join(postsDir, '2026-06-05-jensen-huang-korea-visit.md');
  if (fs.existsSync(jensenFile)) {
    console.log('Generating images for Jensen Huang visit (in parallel)...');
    const task = (async () => {
      let content = fs.readFileSync(jensenFile, 'utf-8');

      // 동시에 본문 이미지 생성하기
      const [body1, body2] = await Promise.all([
        generateAndSaveImage(
          "a clean vector illustration of business people sharing a friendly meal around a modern dining table, beautiful warm color palette",
          "body-2026-06-05-jensen-huang-korea-visit-1.jpg",
          "4:3"
        ),
        generateAndSaveImage(
          "a minimalist illustration of two hands shaking, with digital semiconductor patterns and lines in the background",
          "body-2026-06-05-jensen-huang-korea-visit-2.jpg",
          "4:3"
        )
      ]);

      if (body1) {
        content = content.replace(
          /(오늘 이 뜨거운 만남의 숨겨진 이야기와 주요 비하인드를 쏙쏙 정리해 드릴게요\.)\s*(이번 삼쏘 회동의 라인업은)/,
          (match, p1, p2) => p1 + '\n\n![포스트 소개](' + body1 + ')\n\n' + p2
        );
      }

      if (body2) {
        content = content.replace(
          /(글로벌 빅테크 기업과의 파트너십 지도에 미묘한 변화가 감지되는 대목이기도 합니다\.)\s*(글로벌 시가총액 최상위권을 다투는)/,
          (match, p1, p2) => p1 + '\n\n![포스트 소개](' + body2 + ')\n\n' + p2
        );
      }

      fs.writeFileSync(jensenFile, content, 'utf-8');
      console.log('Jensen Huang visit updated!');
    })();
    tasks.push(task);
  }

  // 3. 2026-06-05-nh-card-fuel-support.md
  const nhFile = path.join(postsDir, '2026-06-05-nh-card-fuel-support.md');
  if (fs.existsSync(nhFile)) {
    console.log('Generating images for NH card fuel support (in parallel)...');
    const task = (async () => {
      let content = fs.readFileSync(nhFile, 'utf-8');

      // 동시에 카드 이미지와 본문 이미지 생성하기
      const [cardPath, body1] = await Promise.all([
        generateSummaryImage(
          "주유비 폭등 시대 탈출법 NH농협카드 고유가 피해지원금 신청 315만 명 돌파 혜택 및 신청 방법 총정리",
          "주유비 부담을 덜어줄 NH농협카드 고유가 피해지원금 신청이 315만 건을 돌파한 가운데 나만 놓치면 손해인 지원금 혜택과 신청 자격 방법을 상세히 알려드립니다.",
          "2026-06-05-nh-card-fuel-support"
        ),
        generateAndSaveImage(
          "a car at a gas station under a bright sky, flat design clean vector illustration",
          "body-2026-06-05-nh-card-fuel-support-1.jpg",
          "4:3"
        )
      ]);

      if (cardPath) {
        const frontmatterEnd = content.indexOf('\n---', 4);
        if (frontmatterEnd !== -1) {
          content = content.substring(0, frontmatterEnd + 4) +
            `\n\n![포스트 소개](${cardPath})` +
            content.substring(frontmatterEnd + 4);
        }
      }

      if (body1) {
        content = content.replace(
          /(오늘 이 지원금의 정체와 나도 받을 수 있는 신청 자격, 꿀팁까지 아주 알기 쉽게 쏙쏙 정리해 드릴게요\!)\s*(---)/,
          (match, p1, p2) => p1 + '\n\n![포스트 소개](' + body1 + ')\n\n' + p2
        );
      }

      fs.writeFileSync(nhFile, content, 'utf-8');
      console.log('NH card fuel support updated!');
    })();
    tasks.push(task);
  }

  // 모든 생성 작업을 동시에 실행하고 끝날 때까지 대기
  await Promise.all(tasks);
  console.log('All images generated successfully in parallel!');
}

run();
