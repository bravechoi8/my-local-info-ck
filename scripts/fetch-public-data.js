// scripts/fetch-public-data.js
// 매일 1회 자동 실행: 공공데이터 1건을 가져와 local-info.json에 추가

const fs = require('fs');
const path = require('path');

// ──────────────────────────────────────────────
// 설정
// ──────────────────────────────────────────────
const PUBLIC_DATA_API_KEY = process.env.PUBLIC_DATA_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const PUBLIC_DATA_ENDPOINT = 'https://api.odcloud.kr/api/gov24/v3/serviceList';
const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const LOCAL_INFO_PATH = path.join(__dirname, '..', 'public', 'data', 'local-info.json');

// ──────────────────────────────────────────────
// 유틸: 오늘 날짜 (YYYY-MM-DD)
// ──────────────────────────────────────────────
function today() {
  return new Date().toISOString().slice(0, 10);
}

// ──────────────────────────────────────────────
// 1단계: 공공데이터포털 API 호출
// ──────────────────────────────────────────────
async function fetchPublicData() {
  if (!PUBLIC_DATA_API_KEY) {
    throw new Error('환경변수 PUBLIC_DATA_API_KEY 가 설정되지 않았습니다.');
  }

  const params = new URLSearchParams({
    page: '1',
    perPage: '20',
    returnType: 'JSON',
    serviceKey: PUBLIC_DATA_API_KEY,
  });

  const url = `${PUBLIC_DATA_ENDPOINT}?${params.toString()}`;
  console.log('[1단계] 공공데이터포털 API 호출 중...');

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`공공데이터 API 응답 오류: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  const items = json.data ?? json.items ?? json.result ?? [];

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('공공데이터 API에서 항목을 가져오지 못했습니다.');
  }

  console.log(`  → 총 ${items.length}건 수신`);
  return items;
}

// ──────────────────────────────────────────────
// 필터링: 성남 → 경기 → 전체
// ──────────────────────────────────────────────
function filterItems(items) {
  const fields = ['서비스명', '서비스목적요약', '지원대상', '소관기관명'];

  function contains(item, keyword) {
    return fields.some((f) => (item[f] ?? '').includes(keyword));
  }

  const seongnam = items.filter((item) => contains(item, '성남'));
  if (seongnam.length > 0) {
    console.log(`  → "성남" 포함 항목 ${seongnam.length}건 필터링`);
    return seongnam;
  }

  const gyeonggi = items.filter((item) => contains(item, '경기'));
  if (gyeonggi.length > 0) {
    console.log(`  → "경기" 포함 항목 ${gyeonggi.length}건 필터링`);
    return gyeonggi;
  }

  console.log('  → 필터 없이 전체 항목 사용');
  return items;
}

// ──────────────────────────────────────────────
// 2단계: 기존 데이터와 비교 (중복 제거)
// ──────────────────────────────────────────────
function loadExistingData() {
  if (!fs.existsSync(LOCAL_INFO_PATH)) {
    console.log('[2단계] local-info.json 없음 → 빈 배열로 시작');
    return [];
  }
  const raw = fs.readFileSync(LOCAL_INFO_PATH, 'utf-8');
  return JSON.parse(raw);
}

function findNewItem(candidates, existingData) {
  const existingNames = new Set(existingData.map((item) => item.name));

  for (const candidate of candidates) {
    const name = candidate['서비스명'] ?? '';
    if (name && !existingNames.has(name)) {
      return candidate;
    }
  }
  return null;
}

// ──────────────────────────────────────────────
// 3단계: Gemini AI로 데이터 가공
// ──────────────────────────────────────────────
async function processWithGemini(rawItem, nextId) {
  if (!GEMINI_API_KEY) {
    throw new Error('환경변수 GEMINI_API_KEY 가 설정되지 않았습니다.');
  }

  const prompt = `아래 공공데이터 1건을 분석해서 JSON 객체로 변환해줘. 형식:
{id: 숫자, name: 서비스명, category: '행사' 또는 '혜택', startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD', location: 장소 또는 기관명, target: 지원대상, summary: 한줄요약, link: 상세URL}
category는 내용을 보고 행사/축제면 '행사', 지원금/서비스면 '혜택'으로 판단해.
startDate가 없으면 오늘 날짜(${today()}), endDate가 없으면 '상시'로 넣어.
id는 ${nextId}로 고정해.
반드시 JSON 객체만 출력해. 다른 텍스트 없이.

데이터:
${JSON.stringify(rawItem, null, 2)}`;

  console.log('[3단계] Gemini AI로 데이터 가공 중...');

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API 응답 오류: ${res.status} - ${errText}`);
  }

  const json = await res.json();
  const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  // 마크다운 코드블록 제거 후 JSON 파싱
  const cleaned = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  const parsed = JSON.parse(cleaned);
  console.log(`  → 가공 완료: ${parsed.name}`);
  return parsed;
}

// ──────────────────────────────────────────────
// 4단계: local-info.json에 저장
// ──────────────────────────────────────────────
function saveData(existingData, newItem) {
  const updated = [...existingData, newItem];

  // 디렉터리가 없으면 생성
  const dir = path.dirname(LOCAL_INFO_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(LOCAL_INFO_PATH, JSON.stringify(updated, null, 2), 'utf-8');
  console.log(`[4단계] local-info.json 저장 완료 (총 ${updated.length}건)`);
}

// ──────────────────────────────────────────────
// 메인 실행
// ──────────────────────────────────────────────
(async () => {
  try {
    // 1단계: API 호출
    const allItems = await fetchPublicData();
    const filtered = filterItems(allItems);

    // 2단계: 기존 데이터 로드 & 중복 제거
    console.log('[2단계] 기존 데이터와 비교 중...');
    const existingData = loadExistingData();
    const newRawItem = findNewItem(filtered, existingData);

    if (!newRawItem) {
      console.log('새로운 데이터가 없습니다.');
      process.exit(0);
    }

    const nextId =
      existingData.length > 0
        ? Math.max(...existingData.map((item) => item.id ?? 0)) + 1
        : 1;

    // 3단계: Gemini 가공
    const processedItem = await processWithGemini(newRawItem, nextId);

    // 4단계: 저장
    saveData(existingData, processedItem);
  } catch (err) {
    console.error('오류 발생 — 기존 local-info.json 유지됩니다.');
    console.error(err.message);
    process.exit(1);
  }
})();
