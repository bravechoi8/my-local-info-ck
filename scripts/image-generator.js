import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchWithRetry } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent';
const IMAGEN_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict';

/**
 * 블로그 포스트의 제목과 요약을 바탕으로 요약 인포그래픽 카드 이미지를 생성하고 로컬에 저장합니다.
 * @param {string} title 블로그 글 제목
 * @param {string} summary 블로그 글 요약
 * @param {string} filenameKey 파일명 키워드 (이미지 저장 파일명에 사용)
 * @returns {Promise<string|null>} 저장된 이미지의 상대 경로 (예: '/images/summary-keyword.jpg'), 실패 시 null
 */
export async function generateSummaryImage(title, summary, filenameKey) {
  try {
    if (!GEMINI_API_KEY) {
      console.warn('[이미지 생성] GEMINI_API_KEY 환경변수가 없어 이미지 생성을 생략합니다.');
      return null;
    }

    // 1단계: Gemini를 사용하여 이미지 생성용 정밀 영어 프롬프트 및 3단 요약 데이터 빌드
    const promptBuilderText = `Based on the Korean blog post title and summary below, analyze the key details and generate a JSON object with the following fields:
{
  "imagenPrompt": "A highly detailed, professional English prompt for Google's Imagen text-to-image model. The prompt must focus on visually conveying the core theme of the post (e.g., if the post is about interest rates, show banking documents, growth charts, or coins). Crucially, the image must contain NO TEXT, use a beautiful warm/pastel color palette, and be suitable as a background card. CRITICAL: To prevent safety policy blocks, do NOT include any specific celebrity/player names (like Lee Kang-in, Son Heung-min), specific trademarked team/brand names (like PSG, Apple), or specific politician names. Instead, use generic descriptions (e.g., 'a professional football player wearing a blue jersey', 'a gold championship trophy', 'a smartphone showing a chart').",
  "subTitle": "A catchy, interesting Korean subtitle for the blog post (maximum 20 characters, NO quotes)",
  "points": [
    {
      "title": "A short keyword summarizing Point 1 (maximum 10 characters in Korean)",
      "desc1": "A clear description of Point 1, line 1 (maximum 18 characters in Korean)",
      "desc2": "A clear description of Point 1, line 2 (maximum 18 characters in Korean, optional, empty if not needed)"
    },
    {
      "title": "A short keyword summarizing Point 2 (maximum 10 characters in Korean)",
      "desc1": "A clear description of Point 2, line 1 (maximum 18 characters in Korean)",
      "desc2": "A clear description of Point 2, line 2 (maximum 18 characters in Korean, optional, empty if not needed)"
    },
    {
      "title": "A short keyword summarizing Point 3 (maximum 10 characters in Korean)",
      "desc1": "A clear description of Point 3, line 1 (maximum 18 characters in Korean)",
      "desc2": "A clear description of Point 3, line 2 (maximum 18 characters in Korean, optional, empty if not needed)"
    }
  ]
}

Ensure you ONLY output the valid JSON block and nothing else. Do not wrap in markdown code blocks.

Title: ${title}
Summary: ${summary}`;

    const geminiUrl = `${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`;
    const geminiRes = await fetchWithRetry(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: promptBuilderText
          }]
        }]
      })
    });

    if (!geminiRes.ok) {
      console.error(`[이미지 생성] Gemini 데이터 생성 실패: ${geminiRes.status}`);
      return null;
    }

    const geminiData = await geminiRes.json();
    let responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    responseText = responseText.trim();

    // 마크다운 코드블록 제거
    responseText = responseText.replace(/^```json\s*/gi, '').replace(/^```\s*/g, '').replace(/```\s*$/g, '').trim();

    let infoData;
    try {
      infoData = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('[이미지 생성] JSON 파싱 에러. 응답 텍스트:', responseText);
      // 예비용 Fallback 데이터 생성
      infoData = {
        imagenPrompt: `${title}, flat design illustration`,
        subTitle: summary.substring(0, 20),
        points: [
          { title: "핵심 요약 1", desc1: "상세 내용을 블로그", desc2: "본문에서 확인해보세요" },
          { title: "핵심 요약 2", desc1: "유용한 정보와 꿀팁이", desc2: "가득 담겨 있습니다" },
          { title: "핵심 요약 3", desc1: "지금 바로 아래의", desc2: "글을 끝까지 읽어보세요" }
        ]
      };
    }

    const imagePrompt = infoData.imagenPrompt || `${title}, flat design illustration`;
    console.log(`[이미지 생성] 영어 프롬프트 빌드 완료: "${imagePrompt}"`);

    // 2단계: Imagen API 호출하여 이미지 생성
    const imagenUrl = `${IMAGEN_ENDPOINT}?key=${GEMINI_API_KEY}`;
    const payload = {
      instances: [
        {
          prompt: imagePrompt
        }
      ],
      parameters: {
        sampleCount: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '16:9'
      }
    };

    const imagenRes = await fetchWithRetry(imagenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!imagenRes.ok) {
      const errMsg = await imagenRes.text();
      console.error(`[이미지 생성] Imagen API 호출 실패: ${imagenRes.status} - ${errMsg}`);
      return null;
    }

    const imagenData = await imagenRes.json();
    const predictions = imagenData.predictions || [];
    if (predictions.length === 0) {
      console.error('[이미지 생성] 생성된 이미지가 응답에 없습니다.');
      return null;
    }

    // 3단계: 배경용 이미지(JPG) 저장
    const base64Bytes = predictions[0].bytesBase64Encoded;
    const imgBuffer = Buffer.from(base64Bytes, 'base64');

    const publicImagesDir = path.join(__dirname, '..', 'public', 'images');
    if (!fs.existsSync(publicImagesDir)) {
      fs.mkdirSync(publicImagesDir, { recursive: true });
    }

    const cleanFilenameKey = filenameKey.replace(/[^a-zA-Z0-9\-_]/g, '');
    const bgFilename = `card-bg-${cleanFilenameKey}.jpg`;
    const bgOutputPath = path.join(publicImagesDir, bgFilename);

    fs.writeFileSync(bgOutputPath, imgBuffer);
    console.log(`[이미지 생성] 배경 일러스트 저장 완료: ${bgOutputPath}`);

    // 4단계: SVG 인포그래픽 카드 합성 및 저장
    const svgFilename = `card-${cleanFilenameKey}.svg`;
    const svgOutputPath = path.join(publicImagesDir, svgFilename);

    const base64Image = imgBuffer.toString('base64');
    const dataUri = `data:image/jpeg;base64,${base64Image}`;

    const svgContent = buildSvgTemplate(
      title, 
      infoData.subTitle || '', 
      dataUri, 
      infoData.points || []
    );

    fs.writeFileSync(svgOutputPath, svgContent, 'utf-8');
    console.log(`[이미지 생성] 하이브리드 SVG 카드 저장 완료: ${svgOutputPath}`);

    return `/images/${svgFilename}`;
  } catch (err) {
    console.error('[이미지 생성] 오류 발생:', err.message);
    return null;
  }
}

/**
 * 주어진 영어 프롬프트와 옵션을 기반으로 이미지를 생성하여 로컬에 저장합니다.
 * @param {string} prompt 이미지 생성용 영어 프롬프트
 * @param {string} filename 저장할 파일명 (예: 'body-lotto-1.jpg')
 * @param {string} aspectRatio 화면비 (기본값 '4:3', 지원값: '1:1', '16:9', '4:3' 등)
 * @returns {Promise<string|null>} 저장된 이미지의 상대 경로, 실패 시 null
 */
export async function generateAndSaveImage(prompt, filename, aspectRatio = '4:3') {
  try {
    if (!GEMINI_API_KEY) {
      console.warn('[이미지 생성] GEMINI_API_KEY 환경변수가 없어 이미지 생성을 생략합니다.');
      return null;
    }

    const imagenUrl = `${IMAGEN_ENDPOINT}?key=${GEMINI_API_KEY}`;
    const payload = {
      instances: [
        {
          prompt: prompt
        }
      ],
      parameters: {
        sampleCount: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: aspectRatio
      }
    };

    const imagenRes = await fetchWithRetry(imagenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!imagenRes.ok) {
      const errMsg = await imagenRes.text();
      console.error(`[이미지 생성] Imagen API 호출 실패: ${imagenRes.status} - ${errMsg}`);
      return null;
    }

    const imagenData = await imagenRes.json();
    const predictions = imagenData.predictions || [];
    if (predictions.length === 0) {
      console.error('[이미지 생성] 생성된 이미지가 응답에 없습니다.');
      return null;
    }

    const base64Bytes = predictions[0].bytesBase64Encoded;
    const imgBuffer = Buffer.from(base64Bytes, 'base64');

    const publicImagesDir = path.join(__dirname, '..', 'public', 'images');
    if (!fs.existsSync(publicImagesDir)) {
      fs.mkdirSync(publicImagesDir, { recursive: true });
    }

    const outputPath = path.join(publicImagesDir, filename);
    fs.writeFileSync(outputPath, imgBuffer);
    console.log(`[이미지 생성] 이미지 저장 완료: ${outputPath}`);

    return `/images/${filename}`;
  } catch (err) {
    console.error('[이미지 생성] 오류 발생:', err.message);
    return null;
  }
}

/**
 * 고화질 요약 인포그래픽 SVG 카드를 조립합니다.
 * @param {string} title 대제목
 * @param {string} subTitle 부제목
 * @param {string} bgImgPath AI가 생성한 이미지의 상대 경로 (예: '/images/card-bg-xxx.jpg')
 * @param {Array} points 3단 요약 카드 데이터 배열
 * @returns {string} 완성된 SVG 코드 문자열
 */
export function buildSvgTemplate(title, subTitle, bgImgPath, points) {
  // 따옴표 이스케이프 및 XML 안전 문자 변환
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

  // 오늘 날짜 얻기 (KST 기준)
  const kstOffset = 9 * 60 * 60 * 1000;
  const todayStr = new Date(new Date().getTime() + kstOffset).toISOString().split('T')[0];

  // 6가지 세련된 컬러 팔레트 정의
  const colorPalettes = [
    // 0: 클래식 네이비 (Classic Navy)
    {
      darkBg: ['#0B0F19', '#111827'],
      lightBg: ['#F8FAFC', '#F1F5F9'],
      darkText: '#FFFFFF',
      lightText: '#1E293B',
      subDarkText: '#94A3B8',
      subLightText: '#475569',
      accent: '#38BDF8',
      lightAccent: '#0284C7',
      cardDarkBg: '#1E293B',
      cardLightBg: '#FFFFFF',
      cardBorderDark: '#334155',
      cardBorderLight: '#E2E8F0'
    },
    // 1: 웜 피치/로즈 (Warm Peach)
    {
      darkBg: ['#1A1016', '#2A1A24'],
      lightBg: ['#FFFDF9', '#FFF1F2'],
      darkText: '#FFF1F2',
      lightText: '#4C0519',
      subDarkText: '#FDA4AF',
      subLightText: '#9F1239',
      accent: '#FB7185',
      lightAccent: '#E11D48',
      cardDarkBg: '#3F2D3A',
      cardLightBg: '#FFF1F2',
      cardBorderDark: '#4D3647',
      cardBorderLight: '#FECDD3'
    },
    // 2: 에메랄드/세이지 (Forest Sage)
    {
      darkBg: ['#061A14', '#0D2D22'],
      lightBg: ['#F7FDF9', '#E8F5E9'],
      darkText: '#ECFDF5',
      lightText: '#064E3B',
      subDarkText: '#6EE7B7',
      subLightText: '#047857',
      accent: '#34D399',
      lightAccent: '#059669',
      cardDarkBg: '#163E32',
      cardLightBg: '#ECFDF5',
      cardBorderDark: '#1E5242',
      cardBorderLight: '#A7F3D0'
    },
    // 3: 로얄 퍼플/라벤더 (Royal Lavender)
    {
      darkBg: ['#130C25', '#201435'],
      lightBg: ['#FAF9FE', '#F3E8FF'],
      darkText: '#F5F3FF',
      lightText: '#3B0764',
      subDarkText: '#C084FC',
      subLightText: '#6B21A8',
      accent: '#C084FC',
      lightAccent: '#7C3AED',
      cardDarkBg: '#2E1E47',
      cardLightBg: '#F5F3FF',
      cardBorderDark: '#3C285C',
      cardBorderLight: '#E9D5FF'
    },
    // 4: 모던 차콜/골드 (Charcoal Gold)
    {
      darkBg: ['#18181B', '#09090B'],
      lightBg: ['#FAFAFA', '#F4F4F5'],
      darkText: '#F4F4F5',
      lightText: '#18181B',
      subDarkText: '#A1A1AA',
      subLightText: '#52525B',
      accent: '#FBBF24',
      lightAccent: '#D97706',
      cardDarkBg: '#27272A',
      cardLightBg: '#FFFFFF',
      cardBorderDark: '#3F3F46',
      cardBorderLight: '#E4E4E7'
    },
    // 5: 파스텔 스카이/오션 (Sky Ocean)
    {
      darkBg: ['#0F172A', '#020617'],
      lightBg: ['#F4FAFF', '#E0F2FE'],
      darkText: '#F0F9FF',
      lightText: '#0C4A6E',
      subDarkText: '#7DD3FC',
      subLightText: '#0369A1',
      accent: '#60A5FA',
      lightAccent: '#0284C7',
      cardDarkBg: '#1E293B',
      cardLightBg: '#F0F9FF',
      cardBorderDark: '#334155',
      cardBorderLight: '#BAE6FD'
    }
  ];

  // 타이틀 글자들을 기반으로 결정론적 랜덤 변수들 계산
  const titleHash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const styleChoice = titleHash % 3; // 0, 1, 2 (레이아웃 스타일)
  const themeChoice = Math.floor(titleHash / 3) % 2; // 0: Dark, 1: Light (테마)
  const colorIndex = Math.floor(titleHash / 6) % colorPalettes.length; // 컬러 팔레트 번호

  const palette = colorPalettes[colorIndex];
  const isLight = themeChoice === 1;

  // 선택된 테마별 색상 설정
  const bgColor = isLight ? palette.lightBg : palette.darkBg;
  const textColor = isLight ? palette.lightText : palette.darkText;
  const subTextColor = isLight ? palette.subLightText : palette.subDarkText;
  const accentColor = isLight ? palette.lightAccent : palette.accent;
  const cardBg = isLight ? palette.cardLightBg : palette.cardDarkBg;
  const cardBorder = isLight ? palette.cardBorderLight : palette.cardBorderDark;

  if (styleChoice === 1) {
    // [스타일 1] 전면 일러스트형 (Visual Cover) - 전면 이미지 + 하단 타이틀 오버레이
    const overlayGradStart = isLight ? 'rgba(255,255,255,0)' : 'rgba(0,0,0,0)';
    const overlayGradMid = isLight ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
    const overlayGradEnd = isLight ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.9)';
    
    const badgeBg = isLight ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)';
    const badgeStroke = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.3)';
    const badgeText = isLight ? palette.lightAccent : '#FFFFFF';

    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
  <defs>
    <!-- 전체 둥근 모서리 클리핑 -->
    <clipPath id="fullClip">
      <rect width="1200" height="800" rx="24" />
    </clipPath>
    <!-- 글씨가 잘 보이도록 하는 하단 그라데이션 레이어 -->
    <linearGradient id="textOverlayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${overlayGradStart}" />
      <stop offset="45%" stop-color="${overlayGradMid}" />
      <stop offset="100%" stop-color="${overlayGradEnd}" />
    </linearGradient>
  </defs>

  <g clip-path="url(#fullClip)">
    <!-- AI 배경 이미지 -->
    <image href="${bgImgPath}" width="1200" height="800" preserveAspectRatio="xMidYMid slice" />
    <rect y="350" width="1200" height="450" fill="url(#textOverlayGrad)" />

    <!-- 상단 리얼인포 뱃지 -->
    <g transform="translate(60, 60)">
      <rect width="105" height="26" rx="13" fill="${badgeBg}" stroke="${badgeStroke}" stroke-width="1" />
      <text x="52.5" y="17" font-family="'Pretendard', sans-serif" font-size="12" font-weight="800" fill="${badgeText}" text-anchor="middle">REAL INFO</text>
      <text x="120" y="18" font-family="'Pretendard', sans-serif" font-size="13" font-weight="700" fill="${textColor}" fill-opacity="0.8">${todayStr}</text>
    </g>

    <!-- 하단 제목 및 설명문 -->
    <g transform="translate(60, 620)">
      <text font-family="'Pretendard', sans-serif" font-size="40" font-weight="900" fill="${textColor}" filter="${isLight ? '' : 'drop-shadow(0px 4px 10px rgba(0,0,0,0.7))'}">${safeTitle}</text>
      <text y="60" font-family="'Pretendard', sans-serif" font-size="19" fill="${subTextColor}" font-weight="600" filter="${isLight ? '' : 'drop-shadow(0px 2px 5px rgba(0,0,0,0.7))'}">${safeSubTitle}</text>
    </g>
  </g>
</svg>
`;
  } else if (styleChoice === 2) {
    // [스타일 2] 반반 분할 레이아웃형 (Split Layout) - 왼쪽 그림 + 오른쪽 대형 타이포그래피
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
    <!-- 우측 배경용 그라데이션 -->
    <linearGradient id="splitBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgColor[0]}" />
      <stop offset="100%" stop-color="${bgColor[1]}" />
    </linearGradient>
  </defs>

  <g clip-path="url(#fullClip)">
    <!-- 왼쪽: AI 이미지 -->
    <g clip-path="url(#leftClip)">
      <image href="${bgImgPath}" width="540" height="800" preserveAspectRatio="xMidYMid slice" />
    </g>

    <!-- 오른쪽: 텍스트 영역 -->
    <rect x="540" width="660" height="800" fill="url(#splitBg)" />
    <line x1="540" y1="0" x2="540" y2="800" stroke="${cardBorder}" stroke-width="1.5" />

    <!-- 우측 텍스트 콘텐츠 -->
    <g transform="translate(600, 100)">
      <!-- 뱃지 -->
      <g transform="translate(0, 0)">
        <rect width="105" height="26" rx="13" fill="${isLight ? '#FFFFFF' : '#334155'}" stroke="${cardBorder}" stroke-width="1" />
        <text x="52.5" y="17" font-family="'Pretendard', sans-serif" font-size="12" font-weight="800" fill="${accentColor}" text-anchor="middle">REAL INFO</text>
        <text x="120" y="18" font-family="'Pretendard', sans-serif" font-size="13" font-weight="700" fill="${subTextColor}">${todayStr}</text>
      </g>

      <!-- 제목 (2줄 자동 분할) -->
      <text y="140" font-family="'Pretendard', sans-serif" font-size="34" font-weight="900" fill="${textColor}">${titleLine1}</text>
      ${titleLine2 ? `<text y="205" font-family="'Pretendard', sans-serif" font-size="34" font-weight="900" fill="${textColor}">${titleLine2}</text>` : ''}

      <!-- 구분선 -->
      <line x1="0" y1="285" x2="500" y2="285" stroke="${cardBorder}" stroke-width="2" />

      <!-- 설명문 -->
      <text y="340" font-family="'Pretendard', sans-serif" font-size="18" fill="${subTextColor}" font-weight="500">${safeSubTitle}</text>
      
      <!-- 하단 데코 문구 -->
      <text y="600" font-family="'Pretendard', sans-serif" font-size="15" fill="${accentColor}" font-weight="700" letter-spacing="1">TODAY'S SPECIAL ISSUE</text>
    </g>
  </g>
</svg>
`;
  } else {
    // [스타일 0] 기존 3단 요약 카드 (Infographic Card)
    let cardsMarkup = '';
    for (let i = 0; i < 3; i++) {
      const pt = points[i] || { title: `핵심 요약 ${i + 1}`, desc1: '상세 내용을 본문에서', desc2: '확인해보세요' };
      const safePtTitle = escapeXml(pt.title);
      const safePtDesc1 = escapeXml(pt.desc1);
      const safePtDesc2 = escapeXml(pt.desc2);

      const xPos = 50 + (i * 380);
      const numberBgColor = i === 0 ? accentColor : (i === 1 ? '#10B981' : '#38BDF8');

      cardsMarkup += `
      <!-- Card ${i + 1} -->
      <g transform="translate(${xPos}, 530)">
        <rect width="340" height="220" rx="16" fill="${cardBg}" stroke="${cardBorder}" stroke-width="1.5" />
        <path d="M 16 0 L 324 0" stroke="${numberBgColor}" stroke-width="4" stroke-linecap="round" />
        <circle cx="45" cy="45" r="16" fill="${numberBgColor}" />
        <text x="45" y="50" font-family="'Pretendard', sans-serif" font-size="14" font-weight="900" fill="#FFFFFF" text-anchor="middle">${i + 1}</text>
        <text x="75" y="51" font-family="'Pretendard', sans-serif" font-size="18" font-weight="800" fill="${textColor}">${safePtTitle}</text>
        <line x1="25" y1="85" x2="315" y2="85" stroke="${cardBorder}" stroke-width="1" />
        <text x="25" y="125" font-family="'Pretendard', sans-serif" font-size="15" fill="${subTextColor}" font-weight="500">${safePtDesc1}</text>
        <text x="25" y="160" font-family="'Pretendard', sans-serif" font-size="15" fill="${subTextColor}" font-weight="500">${safePtDesc2}</text>
      </g>
      `;
    }

    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="mainBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgColor[0]}" />
      <stop offset="100%" stop-color="${bgColor[1]}" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="800" fill="url(#mainBg)" />

  <!-- HEADER AREA -->
  <g transform="translate(50, 45)">
    <rect width="105" height="26" rx="13" fill="${isLight ? '#E2E8F0' : '#1E293B'}" stroke="${isLight ? '#CBD5E1' : '#475569'}" stroke-width="1" />
    <text x="52.5" y="17" font-family="'Pretendard', sans-serif" font-size="12" font-weight="800" fill="${accentColor}" text-anchor="middle">REAL INFO</text>
    <text x="115" y="18" font-family="'Pretendard', sans-serif" font-size="13" font-weight="700" fill="${subTextColor}">${todayStr}</text>
  </g>

  <!-- Main Title -->
  <text x="50" y="110" font-family="'Pretendard', sans-serif" font-size="34" font-weight="900" fill="${textColor}">${safeTitle}</text>
  
  <!-- Subtitle -->
  <text x="50" y="142" font-family="'Pretendard', sans-serif" font-size="16" fill="${subTextColor}" font-weight="500">${safeSubTitle}</text>

  <!-- CENTRAL GRAPHIC (AI Image Frame) -->
  <g>
    <clipPath id="imageClip">
      <rect x="50" y="170" width="1100" height="325" rx="16" />
    </clipPath>
    <rect x="50" y="170" width="1100" height="325" rx="16" fill="${isLight ? '#F1F5F9' : '#1F2937'}" stroke="${isLight ? '#E2E8F0' : '#374151'}" stroke-width="1.5" />
    <image href="${bgImgPath}" x="50" y="170" width="1100" height="325" clip-path="url(#imageClip)" preserveAspectRatio="xMidYMid slice" />
    <rect x="50" y="170" width="1100" height="325" rx="16" fill="none" stroke="${textColor}" stroke-width="1" opacity="0.1" />
  </g>

  <!-- BOTTOM THREE CARDS -->
  <g>
    ${cardsMarkup}
  </g>
</svg>
`;
  }
}

