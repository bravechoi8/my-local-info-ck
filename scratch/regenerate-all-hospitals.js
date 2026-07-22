import fs from 'fs';
import path from 'path';
import { buildSvgTemplate } from '../scripts/image-generator.js';

const postsDir = path.resolve('src/content/posts');
const publicImagesDir = path.resolve('public/images');

const files = fs.readdirSync(postsDir)
  .filter(f => f.endsWith('.md'))
  .filter(f => f.includes('hospital') || f.includes('vet') || f.includes('pharmacy') || f.startsWith('2026-07-21'));

console.log(`[모든 병원/동물병원/오늘 포스트(${files.length}개) 빅 폰트 강제 재발행] 대문 이미지를 스드메 글처럼 커진 폰트로 100% 갱신합니다...`);

for (const file of files) {
  const filePath = path.join(postsDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');

  const titleMatch = content.match(/title:\s*"?([^"\r\n]+)"?/);
  const summaryMatch = content.match(/summary:\s*"?([^"\r\n]+)"?/);

  if (!titleMatch) continue;

  const title = titleMatch[1];
  const summary = summaryMatch ? summaryMatch[1] : '';

  let bgImgPath = `/images/card-bg-${file.replace('.md', '')}.jpg`;
  if (!fs.existsSync(path.join(publicImagesDir, `card-bg-${file.replace('.md', '')}.jpg`))) {
    bgImgPath = '/images/card-bg-2026-07-21-holiday-hospital-pharmacy.jpg';
  }

  // 글씨가 스드메 글처럼 굵고 큼직한 3단 요약 카드 데이터
  let points = [];
  if (file.includes('hospital') || file.includes('pharmacy')) {
    points = [
      { title: '병원·약국 조회', desc1: '연휴 문 여는 곳', desc2: '간편 실시간 검색' },
      { title: '응급 대처 요령', desc1: '증상별 대처 숙지', desc2: '위급할 땐 119' },
      { title: '유용한 비상 안내', desc1: '응급포털 이용', desc2: '120 콜센터 활용' }
    ];
  } else if (file.includes('vet')) {
    points = [
      { title: '24시 동물병원', desc1: '야간·공휴일 진료', desc2: '인근 수의사 상주' },
      { title: '응급 처치 수칙', desc1: '이물질 섭취 대응', desc2: '체온 유지 이동' },
      { title: '방문 체크리스트', desc1: '전화 사전 확인', desc2: '야간 진료비 안내' }
    ];
  } else {
    points = [
      { title: '핵심 혜택 안내', desc1: '전국 주요 정보', desc2: '상세 가이드 공개' },
      { title: '알뜰 이용 팁', desc1: '거품 없는 선택', desc2: '알뜰 패키지 가이드' },
      { title: '스마트 활용법', desc1: '공식 사이트 활용', desc2: '스마트 예산 관리' }
    ];
  }

  const svgContent = buildSvgTemplate(title, summary, bgImgPath, points);
  const svgFilename = `card-${file.replace('.md', '')}.svg`;
  const svgOutputPath = path.join(publicImagesDir, svgFilename);

  fs.writeFileSync(svgOutputPath, svgContent, 'utf-8');
  console.log(`[빅 폰트 100% 갱신 완료] ${svgFilename}`);
}

console.log('[모든 병원/동물병원/최신 포스트 대문 카드 빅 폰트 재발행 완전 성공!]');
