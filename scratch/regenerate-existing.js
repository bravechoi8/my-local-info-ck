import fs from 'fs';
import path from 'path';
import { buildSvgTemplate } from '../scripts/image-generator.js';

const publicImagesDir = 'c:\\Users\\cloud\\Desktop\\my-local-info-ck\\public\\images';

const postsToUpdate = [
  {
    svgName: 'card-2026-06-01-starbucks-refund.svg',
    bgName: 'card-bg-2026-06-01-starbucks-refund.jpg',
    title: '스타벅스 카드 환불 대란 다들 왜 서두를까요',
    subTitle: '환불 대란, 당신도 서두르나요?',
    points: [
      { title: '환불 시작', desc1: '스타벅스 카드', desc2: '전액 환불 개시' },
      { title: '접속 폭주', desc1: '온라인 환불', desc2: '이용자 접속 러시' },
      { title: '서두르는 이유', desc1: '전액 환불 혜택', desc2: '기회 놓칠까봐' }
    ]
  },
  {
    svgName: 'card-2026-06-01-advance-voting-cctv-transparency.svg',
    bgName: 'card-bg-2026-06-01-advance-voting-cctv-transparency.jpg',
    title: '우리 동네 사전투표함 선관위 CCTV 영상 누구나 볼 수 있대요',
    subTitle: '사전투표함 CCTV 실시간 중계',
    points: [
      { title: '투명한 선거', desc1: '사전투표함', desc2: 'CCTV 화면 공개' },
      { title: '누구나 가능', desc1: '관심 있는 국민', desc2: '언제든 열람' },
      { title: '신뢰성 상승', desc1: '선거 공정성', desc2: '의혹 사전 차단' }
    ]
  }
];

for (const p of postsToUpdate) {
  const svgPath = path.join(publicImagesDir, p.svgName);
  const bgPath = path.join(publicImagesDir, p.bgName);

  if (fs.existsSync(bgPath)) {
    const bgBuffer = fs.readFileSync(bgPath);
    const base64 = bgBuffer.toString('base64');
    const dataUri = `data:image/jpeg;base64,${base64}`;

    const newSvgContent = buildSvgTemplate(p.title, p.subTitle, dataUri, p.points);
    fs.writeFileSync(svgPath, newSvgContent, 'utf-8');
    console.log(`Successfully regenerated ${p.svgName}`);
  } else {
    console.log(`Background image not found: ${bgPath}`);
  }
}
