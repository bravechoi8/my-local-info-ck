import fs from 'fs';
import path from 'path';

// 임포트할 모듈 경로
const publicImagesDir = 'c:\\Users\\cloud\\Desktop\\my-local-info-ck\\public\\images';

// scripts/image-generator.js에서 buildSvgTemplate 함수를 복사해 오거나 직접 활용
// 여기서는 간편하게 직접 구현된 함수를 로드
import { generateSummaryImage } from '../scripts/image-generator.js';

// SVG 템플릿 재생성기 직접 임포트
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 직접 buildSvgTemplate 함수를 복제하여 사용 (가장 안전)
function buildSvgTemplate(title, subTitle, bgImgPath, points) {
  const escapeXml = (str) => {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const safeTitle = escapeXml(title);
  const safeSubTitle = escapeXml(subTitle);

  const kstOffset = 9 * 60 * 60 * 1000;
  const todayStr = new Date(new Date().getTime() + kstOffset).toISOString().split('T')[0];

  const styleChoice = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 3;
  console.log(`Title: "${title}" -> Style Choice: ${styleChoice}`);

  if (styleChoice === 1) {
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
  <defs>
    <clipPath id="fullClip">
      <rect width="1200" height="800" rx="24" />
    </clipPath>
    <linearGradient id="textOverlayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="transparent" stop-opacity="0" />
      <stop offset="45%" stop-color="#000000" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.85" />
    </linearGradient>
  </defs>
  <g clip-path="url(#fullClip)">
    <image href="${bgImgPath}" width="1200" height="800" preserveAspectRatio="xMidYMid slice" />
    <rect y="350" width="1200" height="450" fill="url(#textOverlayGrad)" />
    <g transform="translate(60, 60)">
      <rect width="105" height="26" rx="13" fill="#000000" fill-opacity="0.4" stroke="#FFFFFF" stroke-width="1" stroke-opacity="0.3" />
      <text x="52.5" y="17" font-family="'Pretendard', sans-serif" font-size="12" font-weight="800" fill="#FFFFFF" text-anchor="middle">REAL INFO</text>
      <text x="120" y="18" font-family="'Pretendard', sans-serif" font-size="13" font-weight="700" fill="#FFFFFF" fill-opacity="0.7">${todayStr}</text>
    </g>
    <g transform="translate(60, 620)">
      <text font-family="'Pretendard', sans-serif" font-size="40" font-weight="900" fill="#FFFFFF" filter="drop-shadow(0px 4px 10px rgba(0,0,0,0.7))">${safeTitle}</text>
      <text y="60" font-family="'Pretendard', sans-serif" font-size="19" fill="#E2E8F0" font-weight="600" filter="drop-shadow(0px 2px 5px rgba(0,0,0,0.7))">${safeSubTitle}</text>
    </g>
  </g>
</svg>
`;
  } else if (styleChoice === 2) {
    const splitTitle = (str) => {
      const midpoint = Math.floor(str.length / 2);
      const spaceIndex = str.indexOf(' ', midpoint);
      if (spaceIndex === -1) {
        const prevSpaceIndex = str.lastIndexOf(' ', midpoint);
        if (prevSpaceIndex === -1) {
          return [str, ''];
        }
        return [str.substring(0, prevSpaceIndex), str.substring(prevSpaceIndex + 1)];
      }
      return [str.substring(0, spaceIndex), str.substring(spaceIndex + 1)];
    };
    const [titleLine1, titleLine2] = splitTitle(safeTitle);

    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
  <defs>
    <clipPath id="fullClip">
      <rect width="1200" height="800" rx="24" />
    </clipPath>
    <clipPath id="leftClip">
      <rect width="540" height="800" />
    </clipPath>
    <linearGradient id="splitBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E293B" />
      <stop offset="100%" stop-color="#0F172A" />
    </linearGradient>
  </defs>
  <g clip-path="url(#fullClip)">
    <g clip-path="url(#leftClip)">
      <image href="${bgImgPath}" width="540" height="800" preserveAspectRatio="xMidYMid slice" />
    </g>
    <rect x="540" width="660" height="800" fill="url(#splitBg)" />
    <line x1="540" y1="0" x2="540" y2="800" stroke="#334155" stroke-width="1.5" />
    <g transform="translate(600, 100)">
      <g transform="translate(0, 0)">
        <rect width="105" height="26" rx="13" fill="#334155" stroke="#475569" stroke-width="1" />
        <text x="52.5" y="17" font-family="'Pretendard', sans-serif" font-size="12" font-weight="800" fill="#38BDF8" text-anchor="middle">REAL INFO</text>
        <text x="120" y="18" font-family="'Pretendard', sans-serif" font-size="13" font-weight="700" fill="#64748B">${todayStr}</text>
      </g>
      <text y="140" font-family="'Pretendard', sans-serif" font-size="34" font-weight="900" fill="#FFFFFF">${titleLine1}</text>
      ${titleLine2 ? `<text y="205" font-family="'Pretendard', sans-serif" font-size="34" font-weight="900" fill="#FFFFFF">${titleLine2}</text>` : ''}
      <line x1="0" y1="285" x2="500" y2="285" stroke="#334155" stroke-width="2" />
      <text y="340" font-family="'Pretendard', sans-serif" font-size="18" fill="#94A3B8" font-weight="500">${safeSubTitle}</text>
      <text y="600" font-family="'Pretendard', sans-serif" font-size="15" fill="#38BDF8" font-weight="700" letter-spacing="1">TODAY'S SPECIAL ISSUE</text>
    </g>
  </g>
</svg>
`;
  } else {
    let cardsMarkup = '';
    for (let i = 0; i < 3; i++) {
      const pt = points[i] || { title: `핵심 요약 ${i + 1}`, desc1: '상세 내용을 본문에서', desc2: '확인해보세요' };
      const safePtTitle = escapeXml(pt.title);
      const safePtDesc1 = escapeXml(pt.desc1);
      const safePtDesc2 = escapeXml(pt.desc2);

      const xPos = 50 + (i * 380);
      const numberBgColor = i === 0 ? '#F59E0B' : (i === 1 ? '#10B981' : '#38BDF8');

      cardsMarkup += `
      <!-- Card ${i + 1} -->
      <g transform="translate(${xPos}, 530)">
        <rect width="340" height="220" rx="16" fill="#1E293B" stroke="#334155" stroke-width="1.5" />
        <path d="M 16 0 L 324 0" stroke="${numberBgColor}" stroke-width="4" stroke-linecap="round" />
        <circle cx="45" cy="45" r="16" fill="${numberBgColor}" />
        <text x="45" y="50" font-family="'Pretendard', sans-serif" font-size="14" font-weight="900" fill="#FFFFFF" text-anchor="middle">${i + 1}</text>
        <text x="75" y="51" font-family="'Pretendard', sans-serif" font-size="18" font-weight="800" fill="#FFFFFF">${safePtTitle}</text>
        <line x1="25" y1="85" x2="315" y2="85" stroke="#334155" stroke-width="1" />
        <text x="25" y="125" font-family="'Pretendard', sans-serif" font-size="15" fill="#94A3B8" font-weight="500">${safePtDesc1}</text>
        <text x="25" y="160" font-family="'Pretendard', sans-serif" font-size="15" fill="#94A3B8" font-weight="500">${safePtDesc2}</text>
      </g>
      `;
    }

    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
  <defs>
    <linearGradient id="mainBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B0F19" />
      <stop offset="100%" stop-color="#111827" />
    </linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#mainBg)" />
  <g transform="translate(50, 45)">
    <rect width="105" height="26" rx="13" fill="#1E293B" stroke="#475569" stroke-width="1" />
    <text x="52.5" y="17" font-family="'Pretendard', sans-serif" font-size="12" font-weight="800" fill="#38BDF8" text-anchor="middle">REAL INFO</text>
    <text x="115" y="18" font-family="'Pretendard', sans-serif" font-size="13" font-weight="700" fill="#64748B">${todayStr}</text>
  </g>
  <text x="50" y="110" font-family="'Pretendard', sans-serif" font-size="34" font-weight="900" fill="#FFFFFF">${safeTitle}</text>
  <text x="50" y="142" font-family="'Pretendard', sans-serif" font-size="16" fill="#94A3B8" font-weight="500">${safeSubTitle}</text>
  <g>
    <clipPath id="imageClip">
      <rect x="50" y="170" width="1100" height="325" rx="16" />
    </clipPath>
    <rect x="50" y="170" width="1100" height="325" rx="16" fill="#1F2937" stroke="#374151" stroke-width="1.5" />
    <image href="${bgImgPath}" x="50" y="170" width="1100" height="325" clip-path="url(#imageClip)" preserveAspectRatio="xMidYMid slice" />
    <rect x="50" y="170" width="1100" height="325" rx="16" fill="none" stroke="#FFFFFF" stroke-width="1" opacity="0.1" />
  </g>
  <g>
    ${cardsMarkup}
  </g>
</svg>
`;
  }
}

// 재생성 대상 데이터 정의
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
