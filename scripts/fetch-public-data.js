import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DATA_API_KEY = process.env.PUBLIC_DATA_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const PUBLIC_DATA_ENDPOINT = 'https://api.odcloud.kr/api/gov24/v3/serviceList';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const LOCAL_INFO_PATH = path.join(__dirname, '..', 'public', 'data', 'local-info.json');

async function main() {
  try {
    if (!PUBLIC_DATA_API_KEY) {
      throw new Error('PUBLIC_DATA_API_KEY 환경변수가 없습니다.');
    }
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY 환경변수가 없습니다.');
    }

    // [1단계] 공공데이터포털 API에서 데이터 가져오기
    const params = new URLSearchParams({
      page: '1',
      perPage: '20',
      returnType: 'JSON',
      serviceKey: PUBLIC_DATA_API_KEY
    });
    const url = `${PUBLIC_DATA_ENDPOINT}?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`공공데이터 API 호출 실패: ${response.status}`);
    }
    const result = await response.json();
    const items = result.data || [];

    if (items.length === 0) {
      console.log('새로운 데이터가 없습니다');
      return;
    }

    // 필터링: 용인 -> 경기 -> 전체
    const containsYongin = items.filter(item => 
      (item.서비스명 && item.서비스명.includes('용인')) ||
      (item.서비스목적요약 && item.서비스목적요약.includes('용인')) ||
      (item.지원대상 && item.지원대상.includes('용인')) ||
      (item.소관기관명 && item.소관기관명.includes('용인'))
    );

    let candidates = [];
    if (containsYongin.length > 0) {
      candidates = containsYongin;
    } else {
      const containsGyeonggi = items.filter(item => 
        (item.서비스명 && item.서비스명.includes('경기')) ||
        (item.서비스목적요약 && item.서비스목적요약.includes('경기')) ||
        (item.지원대상 && item.지원대상.includes('경기')) ||
        (item.소관기관명 && item.소관기관명.includes('경기'))
      );
      if (containsGyeonggi.length > 0) {
        candidates = containsGyeonggi;
      } else {
        candidates = items;
      }
    }

    // [2단계] 기존 데이터와 비교
    let existingData = [];
    if (fs.existsSync(LOCAL_INFO_PATH)) {
      try {
        existingData = JSON.parse(fs.readFileSync(LOCAL_INFO_PATH, 'utf-8'));
      } catch (e) {
        existingData = [];
      }
    }

    const existingNames = new Set(existingData.map(item => item.name));
    const newItems = candidates.filter(item => item.서비스명 && !existingNames.has(item.서비스명));

    if (newItems.length === 0) {
      console.log('새로운 데이터가 없습니다');
      return;
    }

    const targetItem = newItems[0];

    // [3단계] Gemini AI로 새 항목 1개만 가공
    const nextId = existingData.length > 0 
      ? Math.max(...existingData.map(item => typeof item.id === 'number' ? item.id : 0)) + 1 
      : 1;

    const todayStr = new Date().toISOString().split('T')[0];
    const prompt = `아래 공공데이터 1건을 분석해서 JSON 객체로 변환해줘. 형식:
{id: 숫자, name: 서비스명, category: '행사' 또는 '혜택', startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD', location: 장소 또는 기관명, target: 지원대상, summary: 한줄요약, link: 상세URL}
category는 내용을 보고 행사/축제면 '행사', 지원금/서비스면 '혜택'으로 판단해.
startDate가 없으면 오늘 날짜, endDate가 없으면 '상시'로 넣어.
반드시 JSON 객체만 출력해. 다른 텍스트 없이.

공공데이터:
${JSON.stringify(targetItem)}`;

    const geminiUrl = `${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`;
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API 호출 실패: ${geminiResponse.status}`);
    }

    const geminiResult = await geminiResponse.json();
    let text = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // 마크다운 코드블록 제거
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsedItem = JSON.parse(text);
    parsedItem.id = nextId;
    if (!parsedItem.startDate) {
      parsedItem.startDate = todayStr;
    }

    // [4단계] 기존 데이터에 추가
    existingData.push(parsedItem);
    fs.writeFileSync(LOCAL_INFO_PATH, JSON.stringify(existingData, null, 2), 'utf-8');
    console.log('데이터 추가 완료');

  } catch (error) {
    console.error('에러 발생:', error.message);
  }
}

main();
