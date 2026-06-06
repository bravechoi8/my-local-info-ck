import fs from 'fs';
import path from 'path';

// 경로 설정
const imagePath = 'C:\\Users\\cloud\\.gemini\\antigravity-ide\\brain\\7b8d7aed-01da-46a2-a5f7-b06e06f77cd1\\media__1780633166689.png';
const outputDir = 'c:\\Users\\cloud\\Desktop\\my-local-info-ck\\public\\images';
const outputPath = path.join(outputDir, 'woo-seo-yoon-profile.svg');

function main() {
  try {
    // 1. 이미지 존재 확인 및 base64 인코딩
    if (!fs.existsSync(imagePath)) {
      console.error(`원본 이미지가 존재하지 않습니다: ${imagePath}`);
      return;
    }
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const dataUri = `data:image/png;base64,${base64Image}`;

    // 2. SVG 내용 작성 (1200x800 프리미엄 인포그래픽 프로필 카드)
    const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
  <defs>
    <!-- 부드러운 웜 로즈골드 톤 그라데이션 배경 -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDFBF7" />
      <stop offset="100%" stop-color="#EFE5E0" />
    </linearGradient>
    
    <!-- 장식용 원 그라데이션 -->
    <radialGradient id="decorGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFF2F2" stop-opacity="0.6" />
      <stop offset="100%" stop-color="#EFE5E0" stop-opacity="0" />
    </radialGradient>

    <!-- 카드 섀도우 효과 -->
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="15" stdDeviation="20" flood-color="#7A6860" flood-opacity="0.15" />
    </filter>
    <filter id="imgShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="10" stdDeviation="15" flood-color="#000000" flood-opacity="0.12" />
    </filter>

    <!-- 좌측 인물 이미지 둥근 모서리 클리핑 패스 -->
    <clipPath id="imageClip">
      <rect x="0" y="0" width="450" height="600" rx="28" />
    </clipPath>
  </defs>

  <!-- 배경 -->
  <rect width="1200" height="800" fill="url(#bgGrad)" />
  <circle cx="1000" cy="100" r="400" fill="url(#decorGrad)" />
  <circle cx="100" cy="700" r="300" fill="url(#decorGrad)" />

  <!-- 중앙 메인 카드 컨테이너 -->
  <g transform="translate(80, 80)" filter="url(#cardShadow)">
    <!-- 카드 배경 (화이트 글래스모피즘 느낌) -->
    <rect width="1040" height="640" rx="32" fill="#FFFFFF" fill-opacity="0.92" stroke="#F0E5E1" stroke-width="2" />
    
    <!-- 좌측 인물 이미지 영역 -->
    <g transform="translate(40, 20)" filter="url(#imgShadow)">
      <!-- 이미지 원본 내장 -->
      <image href="${dataUri}" width="450" height="600" clip-path="url(#imageClip)" preserveAspectRatio="xMidYMid slice" />
      <!-- 이미지 테두리 오버레이 -->
      <rect width="450" height="600" rx="28" fill="none" stroke="#FFFFFF" stroke-width="4" opacity="0.9" />
    </g>

    <!-- 우측 프로필 정보 텍스트 영역 (시작점 X: 530) -->
    <g transform="translate(530, 60)">
      
      <!-- 뱃지: 2026 MISS KOREA -->
      <g>
        <rect width="170" height="34" rx="17" fill="#F4EAE6" />
        <text x="85" y="22" font-family="'Pretendard', -apple-system, sans-serif" font-size="13" font-weight="800" fill="#9F786C" text-anchor="middle" letter-spacing="1.5">2026 MISS KOREA</text>
      </g>

      <!-- 메인 타이틀 (이름) -->
      <text x="0" y="95" font-family="'Pretendard', -apple-system, sans-serif" font-size="52" font-weight="900" fill="#2D221E">우서윤</text>
      <text x="160" y="95" font-family="'Pretendard', -apple-system, sans-serif" font-size="22" font-weight="700" fill="#8C766D">Woo Seo-yoon</text>

      <!-- 서브 타이틀 -->
      <text x="0" y="138" font-family="'Pretendard', -apple-system, sans-serif" font-size="18" font-weight="600" fill="#B08D82">농구 황태자 우지원 장녀 • 미모와 지성의 아이콘</text>

      <!-- 장식 구분선 -->
      <line x1="0" y1="165" x2="470" y2="165" stroke="#EAE0DC" stroke-width="1.5" stroke-dasharray="4 4" />

      <!-- 프로필 상세 목록 -->
      <g transform="translate(0, 200)">
        
        <!-- 학력 정보 -->
        <g transform="translate(0, 0)">
          <!-- 아이콘 (학사모) 배경 -->
          <rect width="44" height="44" rx="14" fill="#FBF8F6" stroke="#F0E6E2" stroke-width="1" />
          <!-- 학사모 모양 데코 문자 -->
          <text x="22" y="28" font-family="'Pretendard', sans-serif" font-size="20" text-anchor="middle">🎓</text>
          
          <text x="64" y="18" font-family="'Pretendard', -apple-system, sans-serif" font-size="14" font-weight="800" fill="#B08D82" letter-spacing="0.5">EDUCATION</text>
          <text x="64" y="38" font-family="'Pretendard', -apple-system, sans-serif" font-size="18" font-weight="700" fill="#42342E">미국 터프츠 대학교 (Tufts University)</text>
          <text x="64" y="58" font-family="'Pretendard', -apple-system, sans-serif" font-size="15" font-weight="500" fill="#7D6961">Fine Arts (미술학) 전공</text>
        </g>

        <!-- 수상 경력 -->
        <g transform="translate(0, 95)">
          <rect width="44" height="44" rx="14" fill="#FBF8F6" stroke="#F0E6E2" stroke-width="1" />
          <text x="22" y="28" font-family="'Pretendard', sans-serif" font-size="20" text-anchor="middle">👑</text>
          
          <text x="64" y="18" font-family="'Pretendard', -apple-system, sans-serif" font-size="14" font-weight="800" fill="#B08D82" letter-spacing="0.5">AWARDS</text>
          <text x="64" y="38" font-family="'Pretendard', -apple-system, sans-serif" font-size="18" font-weight="700" fill="#42342E">2026 미스코리아 미스 서울·경기·인천 '선(善)'</text>
          <text x="64" y="58" font-family="'Pretendard', -apple-system, sans-serif" font-size="15" font-weight="500" fill="#7D6961">데일리랩스상 수상 (2관왕 달성)</text>
        </g>

        <!-- 방송 및 활동 -->
        <g transform="translate(0, 190)">
          <rect width="44" height="44" rx="14" fill="#FBF8F6" stroke="#F0E6E2" stroke-width="1" />
          <text x="22" y="28" font-family="'Pretendard', sans-serif" font-size="20" text-anchor="middle">📺</text>
          
          <text x="64" y="18" font-family="'Pretendard', -apple-system, sans-serif" font-size="14" font-weight="800" fill="#B08D82" letter-spacing="0.5">BROADCAST</text>
          <text x="64" y="38" font-family="'Pretendard', -apple-system, sans-serif" font-size="18" font-weight="700" fill="#42342E">SBS '스타주니어쇼 붕어빵' 출연</text>
          <text x="64" y="58" font-family="'Pretendard', -apple-system, sans-serif" font-size="15" font-weight="500" fill="#7D6961">tvN STORY '내 새끼의 연애2' 출연</text>
        </g>
        
      </g>

      <!-- 하단 문구 -->
      <g transform="translate(0, 480)">
        <rect width="470" height="40" rx="12" fill="#FDFBF7" stroke="#F5EBE6" stroke-width="1" />
        <text x="15" y="25" font-family="'Pretendard', -apple-system, sans-serif" font-size="13" font-weight="700" fill="#8C766D">미모와 지성을 고루 갖춘 라이징 스타의 탄생을 축하합니다!</text>
      </g>

    </g>
  </g>
</svg>
`;

    // 3. 파일 저장
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(outputPath, svgContent, 'utf-8');
    console.log(`성공적으로 프로필 카드가 생성되었습니다: ${outputPath}`);

  } catch (err) {
    console.error(`에러 발생: ${err.message}`);
  }
}

main();
