import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { fetchWithRetry } from './utils.js';
import { getPexelsImage, getPexelsImages } from './pexels.js';
import { getPixabayImage, getPixabayImages } from './pixabay.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 다운로드받은 이미지의 해시 및 크기를 기존 이미지들과 비교하여 중복 여부를 감지합니다.
 * @param {Buffer} buffer 다운로드된 이미지 버퍼
 * @returns {boolean} 중복 여부
 */
function isDuplicateImage(buffer) {
  const hash = crypto.createHash('md5').update(buffer).digest('hex');
  const size = buffer.length;

  // 사용자가 중복이라고 지적한 고유 블랙리스트 파일 크기 차단 (예: 책 위의 하트 끈 이미지 등)
  const BLACKLIST_SIZES = [201184, 408599];
  if (BLACKLIST_SIZES.includes(size)) {
    console.warn(`[중복 이미지 감지] 블랙리스트 이미지 크기 매칭 (${size} 바이트). 다운로드를 취소하고 AI 생성으로 넘어갑니다.`);
    return true;
  }

  const publicImagesDir = path.join(__dirname, '..', 'public', 'images');
  if (!fs.existsSync(publicImagesDir)) return false;

  const files = fs.readdirSync(publicImagesDir);
  for (const file of files) {
    const filePathFull = path.join(publicImagesDir, file);
    if (!fs.statSync(filePathFull).isFile()) continue;

    // 크기가 완전히 같은 경우에만 정밀 해시 비교 진행 (성능 최적화)
    const existingSize = fs.statSync(filePathFull).size;
    if (existingSize === size) {
      const existingBuffer = fs.readFileSync(filePathFull);
      const existingHash = crypto.createHash('md5').update(existingBuffer).digest('hex');
      if (existingHash === hash) {
        console.warn(`[중복 이미지 감지] 기존 파일 '${file}'과 동일한 이미지로 감지되어 차단합니다.`);
        return true;
      }
    }
  }
  return false;
}

/**
 * 외부 이미지 URL을 다운로드하여 로컬 파일로 저장합니다.
 */
async function downloadImage(url, filename) {
  const publicImagesDir = path.join(__dirname, '..', 'public', 'images');
  if (!fs.existsSync(publicImagesDir)) {
    fs.mkdirSync(publicImagesDir, { recursive: true });
  }
  const outputPath = path.join(publicImagesDir, filename);

  const response = await fetchWithRetry(url);
  if (!response.ok) {
    throw new Error(`이미지 다운로드 실패: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 중복 이미지 체크 수행
  if (isDuplicateImage(buffer)) {
    throw new Error(`다운로드한 이미지가 기존 이미지와 중복되어 다운로드를 중단합니다.`);
  }

  fs.writeFileSync(outputPath, buffer);
  return `/images/${filename}`;
}

/**
 * 이미지 URL을 받아 다운로드 후 중복 검사를 수행합니다.
 * 중복이 아니면 파일로 저장하고 true를 반환합니다. 중복이거나 에러 발생 시 false를 반환합니다.
 */
async function downloadAndCheckImage(url, filename) {
  try {
    const response = await fetchWithRetry(url);
    if (!response.ok) {
      console.warn(`[이미지 다운로드 실패] URL: ${url}, 상태: ${response.status}`);
      return false;
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 중복 이미지 체크
    if (isDuplicateImage(buffer)) {
      console.warn(`[이미지 다운로드 건너뜀] 중복된 이미지입니다: ${url}`);
      return false;
    }

    const publicImagesDir = path.join(__dirname, '..', 'public', 'images');
    if (!fs.existsSync(publicImagesDir)) {
      fs.mkdirSync(publicImagesDir, { recursive: true });
    }
    const outputPath = path.join(publicImagesDir, filename);
    fs.writeFileSync(outputPath, buffer);
    console.log(`[이미지 저장 완료] 성공적으로 저장되었습니다: ${outputPath}`);
    return true;
  } catch (err) {
    console.error(`[이미지 다운로드 및 중복 검사 오류]`, err.message);
    return false;
  }
}


export async function searchYouTubeOfficialVideo(keyword) {
  try {
    const res = await fetchWithRetry(`https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!res.ok) return null;
    const html = await res.text();
    const matches = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/g) || [];
    const ids = [...new Set(matches)].map(x => x.replace('/watch?v=', '')).slice(0, 5);

    for (const id of ids) {
      try {
        const oembedRes = await fetchWithRetry(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
        if (oembedRes.ok) {
          const info = await oembedRes.json();
          const maxresRes = await fetchWithRetry(`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`);
          let thumbUrl = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
          if (!maxresRes.ok) {
            thumbUrl = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
          }
          return {
            id,
            url: `https://www.youtube.com/watch?v=${id}`,
            title: info.title,
            author: info.author_name,
            thumbUrl
          };
        }
      } catch (e) {
        continue;
      }
    }
  } catch (err) {
    console.warn('[YouTube 실사 검색 에러]:', err.message);
  }
  return null;
}

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent';
const IMAGEN_ENDPOINT = 'https://generativelanguage.googleapis.com/v1/models/imagen-3.0-generate-002:predict';


/**
 * 블로그 포스트의 제목과 요약을 바탕으로 요약 인포그래픽 카드 이미지를 생성하고 로컬에 저장합니다.
 * @param {string} title 블로그 글 제목
 * @param {string} summary 블로그 글 요약
 * @param {string} filenameKey 파일명 키워드 (이미지 저장 파일명에 사용)
 * @returns {Promise<string|null>} 저장된 이미지의 상대 경로 (예: '/images/summary-keyword.jpg'), 실패 시 null
 */
export async function generateSummaryImage(title, summary, filenameKey, forceAI = false) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
  // 스포츠 관련 글이라도 강제로 AI 생성을 고집하지 않고 우선 무료 이미지 검색을 하도록 변경합니다.
  const finalForceAI = forceAI;
  try {
    if (!GEMINI_API_KEY) {
      console.warn('[이미지 생성] GEMINI_API_KEY 환경변수가 없어 이미지 생성을 생략합니다.');
      return null;
    }

    // 1단계: Gemini를 사용하여 이미지 생성용 정밀 영어 프롬프트 및 3단 요약 데이터 빌드
    const promptBuilderText = `Based on the Korean blog post title and summary below, analyze the key details and generate a JSON object with the following fields:
{
  "imagenPrompt": "A highly detailed, professional English prompt for Google's Imagen text-to-image model. The prompt must focus on visually conveying the core theme of the post (e.g., if the post is about interest rates, show banking documents, growth charts, or coins). Crucially, the image must contain NO TEXT, use a beautiful warm/pastel color palette, and be suitable as a background card. CRITICAL: To prevent safety policy blocks, do NOT include any specific celebrity/player names (like Lee Kang-in, Son Heung-min), specific trademarked team/brand names (like PSG, Apple), or specific politician names. Instead, use generic descriptions (e.g., 'a professional football player wearing a blue jersey', 'a gold championship trophy', 'a smartphone showing a chart'). If the post is about a specific celebrity or person, describe a generic character matching their gender, age, and style (e.g. 'a beautiful young Korean woman with long dark hair, smiling warmly, smart casual office wear' or 'a handsome Korean male actor with a warm smile, wearing a neat suit') in a modern webtoon or digital illustration style.",
  "pexelsQuery": "A simple, generic English search keyword representing the main topic for stock photo search (e.g., 'soccer', 'saving', 'elderly', 'festival', 'apartment'). No styling words, just the topic.",
  "subTitle": "A catchy, interesting Korean subtitle for the blog post (maximum 20 characters, NO quotes)",
  "points": [
    {
      "title": "Short keyword (max 8 chars in Korean)",
      "desc1": "Point 1 line 1 (STRICT MAX 9 chars in Korean)",
      "desc2": "Point 1 line 2 (STRICT MAX 9 chars in Korean)"
    },
    {
      "title": "Short keyword (max 8 chars in Korean)",
      "desc1": "Point 2 line 1 (STRICT MAX 9 chars in Korean)",
      "desc2": "Point 2 line 2 (STRICT MAX 9 chars in Korean)"
    },
    {
      "title": "Short keyword (max 8 chars in Korean)",
      "desc1": "Point 3 line 1 (STRICT MAX 9 chars in Korean)",
      "desc2": "Point 3 line 2 (STRICT MAX 9 chars in Korean)"
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
    let pexelsSearchQuery = infoData.pexelsQuery || title;
    if (pexelsSearchQuery.split(' ').length > 5) {
      pexelsSearchQuery = pexelsSearchQuery.split(' ').slice(0, 5).join(' ');
    }
    console.log(`[이미지 생성] 영어 프롬프트 빌드 완료: "${imagePrompt}"`);
    console.log(`[이미지 생성] Pexels 검색용 키워드: "${pexelsSearchQuery}"`);

    const cleanFilenameKey = filenameKey.replace(/[^a-zA-Z0-9\-_]/g, '');
    const bgFilename = `card-bg-${cleanFilenameKey}.jpg`;
    const publicImagesDir = path.join(__dirname, '..', 'public', 'images');
    if (!fs.existsSync(publicImagesDir)) {
      fs.mkdirSync(publicImagesDir, { recursive: true });
    }
    const bgOutputPath = path.join(publicImagesDir, bgFilename);

    let isRealPhotoUsed = false;

    // 1단계 (최우선): YouTube 공식 영상/방송 실물 캡처 검색 시도
    if (!finalForceAI) {
      try {
        console.log(`[YouTube 실사 검색 시도] 키워드: "${title}"`);
        const ytVideo = await searchYouTubeOfficialVideo(title);
        if (ytVideo && ytVideo.thumbUrl) {
          console.log(`[YouTube 실사 발견] 공식 영상: ${ytVideo.title} (${ytVideo.author})`);
          const success = await downloadAndCheckImage(ytVideo.thumbUrl, bgFilename);
          if (success) {
            isRealPhotoUsed = true;
            console.log(`[YouTube 실사 캡처 적용 완료] ${bgFilename}`);
          }
        }
      } catch (ytErr) {
        console.warn(`[YouTube 실사 검색 실패]:`, ytErr.message);
      }
    }

    // 2단계: Pexels API에서 이미지 검색 시도 (YouTube에서 못 찾았을 경우)
    if (!finalForceAI && !isRealPhotoUsed) {
      try {
        console.log(`[Pexels 검색 시도] 요약 배경 검색 중...`);
        const pexelsUrls = await getPexelsImages(pexelsSearchQuery, 5);
        if (pexelsUrls && pexelsUrls.length > 0) {
          console.log(`[Pexels 이미지 발견] ${pexelsUrls.length}개의 후보군을 순회하며 중복 검사 및 다운로드를 시도합니다.`);
          for (let i = 0; i < pexelsUrls.length; i++) {
            const success = await downloadAndCheckImage(pexelsUrls[i], bgFilename);
            if (success) {
              isRealPhotoUsed = true;
              break;
            }
          }
        } else {
          console.warn(`[Pexels 검색 결과] 해당하는 이미지 목록이 비어있습니다.`);
        }
      } catch (pexelsErr) {
        console.warn(`[Pexels 검색 실패] 오류가 발생하여 예비 AI 그리기로 넘어갑니다:`, pexelsErr.message);
      }
    } else if (finalForceAI) {
      console.log(`[AI 이미지 그리기 강제 활성화] 실사 검색을 생략하고 AI로 그립니다.`);
    }

    // 3단계: 실사 이미지를 못 찾았을 경우에만 Google Imagen API로 직접 그리기 수행
    if (!isRealPhotoUsed) {
      console.log(`[AI 이미지 그리기 시작] 펙셀 이미지가 없으므로 Google Imagen으로 그립니다.`);
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

      const base64Bytes = predictions[0].bytesBase64Encoded;
      const imgBuffer = Buffer.from(base64Bytes, 'base64');
      fs.writeFileSync(bgOutputPath, imgBuffer);
      console.log(`[이미지 생성] 배경 일러스트 저장 완료: ${bgOutputPath}`);
    }

    // 4단계: SVG 인포그래픽 카드 합성 및 저장
    const svgFilename = `card-${cleanFilenameKey}.svg`;
    const svgOutputPath = path.join(publicImagesDir, svgFilename);

    const savedBgBytes = fs.readFileSync(bgOutputPath);
    const base64Image = savedBgBytes.toString('base64');
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
export async function generateAndSaveImage(prompt, filename, aspectRatio = '4:3', imageIndex = 0, forceAI = false) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
  // 스포츠 관련 글이라도 강제로 AI 생성을 고집하지 않고 우선 무료 이미지 검색을 하도록 변경합니다.
  const finalForceAI = forceAI;

  try {
    let pixabaySearchQuery = prompt.split(',')[0].trim();
    // 400 에러 방지를 위해 검색어가 길면 최대 4단어로 단축
    if (pixabaySearchQuery.split(' ').length > 4) {
      pixabaySearchQuery = pixabaySearchQuery.split(' ').slice(0, 4).join(' ');
    }
    let isPixabayUsed = false;

    // 1단계: Pixabay API에서 이미지 검색 시도 (최대 5개 후보 중 중복되지 않는 첫 이미지 선택)
    if (!finalForceAI) {
      try {
        console.log(`[Pixabay 검색 시도] 본문 검색 키워드: "${pixabaySearchQuery}" (시작 인덱스: ${imageIndex})`);
        const pixabayUrls = await getPixabayImages(pixabaySearchQuery, 5);
        if (pixabayUrls && pixabayUrls.length > 0) {
          console.log(`[Pixabay 이미지 발견] ${pixabayUrls.length}개의 후보군을 순회하며 중복 검사 및 다운로드를 시도합니다.`);
          // imageIndex부터 순회하고, 부족하면 처음부터 순회하도록 인덱스 조정
          const startIndex = imageIndex % pixabayUrls.length;
          const orderedUrls = [...pixabayUrls.slice(startIndex), ...pixabayUrls.slice(0, startIndex)];

          for (let i = 0; i < orderedUrls.length; i++) {
            const success = await downloadAndCheckImage(orderedUrls[i], filename);
            if (success) {
              isPixabayUsed = true;
              break;
            }
          }
        } else {
          console.warn(`[Pixabay 검색 결과] 해당하는 이미지 목록이 비어있습니다.`);
        }
      } catch (pixabayErr) {
        console.warn(`[Pixabay 검색 실패] 오류가 발생하여 예비 AI 그리기로 넘어갑니다:`, pixabayErr.message);
      }
    } else {
      console.log(`[AI 이미지 그리기 강제 활성화] Pixabay 검색을 생략하고 AI로 그립니다.`);
    }

    // 2단계: 픽사베이에서 이미지를 찾지 못했을 경우에만 Imagen AI로 이미지 생성
    if (!isPixabayUsed) {
      if (!GEMINI_API_KEY) {
        console.warn('[이미지 생성] GEMINI_API_KEY 환경변수가 없어 이미지 생성을 생략합니다.');
        return null;
      }

      console.log(`[AI 이미지 그리기 시작] 펙셀 이미지가 없으므로 Google Imagen으로 그립니다.`);
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
    }

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

  // 글자 수 기준 강제 줄바꿈 헬퍼 (공백 또는 18글자 기준 무조건 쪼갬)
  const autoWrapText = (str, maxLen = 18) => {
    if (!str || str.length <= maxLen) return [str];
    const lines = [];
    let rem = str;
    while (rem.length > 0 && lines.length < 3) {
      if (rem.length <= maxLen) {
        lines.push(rem);
        break;
      }
      let cutIdx = rem.lastIndexOf(' ', maxLen);
      if (cutIdx <= 5) {
        cutIdx = maxLen;
      }
      lines.push(rem.substring(0, cutIdx).trim());
      rem = rem.substring(cutIdx).trim();
    }
    return lines;
  };

  if (styleChoice === 1) {
    // [스타일 1] 전면 일러스트형 - 하단 오버레이 멀티 라인 타이틀
    const overlayGradStart = isLight ? 'rgba(255,255,255,0)' : 'rgba(0,0,0,0)';
    const overlayGradMid = isLight ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
    const overlayGradEnd = isLight ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.9)';
    
    const badgeBg = isLight ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)';
    const badgeStroke = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.3)';
    const badgeText = isLight ? palette.lightAccent : '#FFFFFF';

    const titleLines = autoWrapText(safeTitle, 22);

    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
  <defs>
    <clipPath id="fullClip">
      <rect width="1200" height="800" rx="24" />
    </clipPath>
    <linearGradient id="textOverlayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${overlayGradStart}" />
      <stop offset="45%" stop-color="${overlayGradMid}" />
      <stop offset="100%" stop-color="${overlayGradEnd}" />
    </linearGradient>
  </defs>

  <g clip-path="url(#fullClip)">
    <image href="${bgImgPath}" width="1200" height="800" preserveAspectRatio="xMidYMid slice" />
    <rect y="350" width="1200" height="450" fill="url(#textOverlayGrad)" />

    <g transform="translate(60, 60)">
      <rect width="105" height="26" rx="13" fill="${badgeBg}" stroke="${badgeStroke}" stroke-width="1" />
      <text x="52.5" y="17" font-family="'Pretendard', sans-serif" font-size="12" font-weight="800" fill="${badgeText}" text-anchor="middle">REAL INFO</text>
      <text x="120" y="18" font-family="'Pretendard', sans-serif" font-size="13" font-weight="700" fill="${textColor}" fill-opacity="0.8">${todayStr}</text>
    </g>

    <!-- 하단 멀티라인 타이틀 (잘림 방지) -->
    <g transform="translate(60, ${640 - (titleLines.length - 1) * 45})">
      ${titleLines.map((line, idx) => `<text y="${idx * 46}" font-family="'Pretendard', sans-serif" font-size="38" font-weight="900" fill="${textColor}" filter="${isLight ? '' : 'drop-shadow(0px 4px 10px rgba(0,0,0,0.8))'}">${line}</text>`).join('\n      ')}
      <text y="${titleLines.length * 46 + 15}" font-family="'Pretendard', sans-serif" font-size="20" fill="${subTextColor}" font-weight="700" filter="${isLight ? '' : 'drop-shadow(0px 2px 5px rgba(0,0,0,0.8))'}">${safeSubTitle}</text>
    </g>
  </g>
</svg>
`;
  } else if (styleChoice === 2) {
    // [스타일 2] 반반 분할 레이아웃
    const titleLines = autoWrapText(safeTitle, 15);

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
      <stop offset="0%" stop-color="${bgColor[0]}" />
      <stop offset="100%" stop-color="${bgColor[1]}" />
    </linearGradient>
  </defs>

  <g clip-path="url(#fullClip)">
    <g clip-path="url(#leftClip)">
      <image href="${bgImgPath}" width="540" height="800" preserveAspectRatio="xMidYMid slice" />
    </g>

    <rect x="540" width="660" height="800" fill="url(#splitBg)" />
    <line x1="540" y1="0" x2="540" y2="800" stroke="${cardBorder}" stroke-width="1.5" />

    <g transform="translate(600, 80)">
      <g transform="translate(0, 0)">
        <rect width="105" height="26" rx="13" fill="${isLight ? '#FFFFFF' : '#334155'}" stroke="${cardBorder}" stroke-width="1" />
        <text x="52.5" y="17" font-family="'Pretendard', sans-serif" font-size="12" font-weight="800" fill="${accentColor}" text-anchor="middle">REAL INFO</text>
        <text x="120" y="18" font-family="'Pretendard', sans-serif" font-size="13" font-weight="700" fill="${subTextColor}">${todayStr}</text>
      </g>

      <!-- 우측 타이틀 (글자 수 기준 완전 분할) -->
      <g transform="translate(0, 80)">
        ${titleLines.map((line, idx) => `<text y="${idx * 48}" font-family="'Pretendard', sans-serif" font-size="34" font-weight="900" fill="${textColor}">${line}</text>`).join('\n        ')}
      </g>

      <line x1="0" y1="${titleLines.length * 48 + 90}" x2="500" y2="${titleLines.length * 48 + 90}" stroke="${cardBorder}" stroke-width="2" />

      <text y="${titleLines.length * 48 + 140}" font-family="'Pretendard', sans-serif" font-size="20" fill="${textColor}" font-weight="700">${safeSubTitle.substring(0, 26)}</text>
      ${safeSubTitle.length > 26 ? `<text y="${titleLines.length * 48 + 175}" font-family="'Pretendard', sans-serif" font-size="20" fill="${textColor}" font-weight="700">${safeSubTitle.substring(26, 52)}</text>` : ''}
      
      <text y="620" font-family="'Pretendard', sans-serif" font-size="16" fill="${accentColor}" font-weight="800" letter-spacing="1">TODAY'S SPECIAL ISSUE</text>
    </g>
  </g>
</svg>
`;
  } else {
    // [스타일 0] 3단 요약 카드 - 하단 3칸 글씨 대폭 확대 적용
    let cardsMarkup = '';
    for (let i = 0; i < 3; i++) {
      const pt = points[i] || { title: `핵심 요약 ${i + 1}`, desc1: '상세 내용을 본문에서', desc2: '확인해보세요' };
      const safePtTitle = escapeXml(pt.title);
      const safePtDesc1 = escapeXml(pt.desc1);
      const safePtDesc2 = escapeXml(pt.desc2);

      const xPos = 50 + (i * 380);
      const numberBgColor = i === 0 ? accentColor : (i === 1 ? '#10B981' : '#38BDF8');

      // 글자 수에 맞춰 폰트 크기와 잘림을 자동 조절하는 스마트 함수
      const getDescFontSize = (str) => {
        if (!str) return '20';
        if (str.length > 13) return '17';
        if (str.length > 10) return '19';
        return '21';
      };

      const fontSize1 = getDescFontSize(safePtDesc1);
      const fontSize2 = getDescFontSize(safePtDesc2);

      cardsMarkup += `
      <!-- Card ${i + 1} -->
      <g transform="translate(${xPos}, 515)">
        <rect width="340" height="240" rx="18" fill="${cardBg}" stroke="${cardBorder}" stroke-width="2.5" />
        <path d="M 16 0 L 324 0" stroke="${numberBgColor}" stroke-width="6" stroke-linecap="round" />
        <circle cx="45" cy="48" r="21" fill="${numberBgColor}" />
        <text x="45" y="55" font-family="'Pretendard', sans-serif" font-size="19" font-weight="900" fill="#FFFFFF" text-anchor="middle">${i + 1}</text>
        <text x="82" y="56" font-family="'Pretendard', sans-serif" font-size="24" font-weight="900" fill="${textColor}">${safePtTitle.substring(0, 10)}</text>
        <line x1="25" y1="92" x2="315" y2="92" stroke="${cardBorder}" stroke-width="1.5" />
        <text x="25" y="140" font-family="'Pretendard', sans-serif" font-size="${fontSize1}" fill="${textColor}" font-weight="800" letter-spacing="-0.5px">${safePtDesc1.substring(0, 16)}</text>
        <text x="25" y="182" font-family="'Pretendard', sans-serif" font-size="${fontSize2}" fill="${textColor}" font-weight="800" letter-spacing="-0.5px">${safePtDesc2.substring(0, 16)}</text>
      </g>
      `;
    }

    const titleLines = autoWrapText(safeTitle, 19);

    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
  <defs>
    <linearGradient id="mainBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgColor[0]}" />
      <stop offset="100%" stop-color="${bgColor[1]}" />
    </linearGradient>
  </defs>

  <rect width="1200" height="800" fill="url(#mainBg)" />

  <g transform="translate(50, 30)">
    <rect width="105" height="26" rx="13" fill="${isLight ? '#E2E8F0' : '#1E293B'}" stroke="${isLight ? '#CBD5E1' : '#475569'}" stroke-width="1" />
    <text x="52.5" y="17" font-family="'Pretendard', sans-serif" font-size="12" font-weight="800" fill="${accentColor}" text-anchor="middle">REAL INFO</text>
    <text x="115" y="18" font-family="'Pretendard', sans-serif" font-size="13" font-weight="700" fill="${subTextColor}">${todayStr}</text>
  </g>

  <!-- 메인 타이틀 (글자 수 기준 18자 강제 줄바꿈으로 절대 안 잘림) -->
  <g transform="translate(50, 80)">
    ${titleLines.map((line, idx) => `<text y="${idx * 42}" font-family="'Pretendard', sans-serif" font-size="${titleLines.length > 2 ? '30' : '36'}" font-weight="900" fill="${textColor}">${line}</text>`).join('\n    ')}
  </g>

  <!-- 이미지 영영 -->
  <g>
    <clipPath id="imageClip">
      <rect x="50" y="${titleLines.length > 2 ? 215 : 180}" width="1100" height="${titleLines.length > 2 ? 270 : 305}" rx="16" />
    </clipPath>
    <rect x="50" y="${titleLines.length > 2 ? 215 : 180}" width="1100" height="${titleLines.length > 2 ? 270 : 305}" rx="16" fill="${isLight ? '#F1F5F9' : '#1F2937'}" stroke="${isLight ? '#E2E8F0' : '#374151'}" stroke-width="1.5" />
    <image href="${bgImgPath}" x="50" y="${titleLines.length > 2 ? 215 : 180}" width="1100" height="${titleLines.length > 2 ? 270 : 305}" clip-path="url(#imageClip)" preserveAspectRatio="xMidYMid slice" />
  </g>

  <!-- 하단 3칸 카드 (빅 폰트 적용) -->
  <g>
    ${cardsMarkup}
  </g>
</svg>
`;
  }
}

