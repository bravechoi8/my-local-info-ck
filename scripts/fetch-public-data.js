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

const EVENT_KEYWORDS = ['축제', '행사', '공연', '전시', '대회', '문화', '예술', '콘서트', '페스티벌', '영화', '체험', '관광', '여행', '음악회', '독서실', '도서관'];
const BENEFIT_KEYWORDS = ['지원금', '지원', '수당', '연금', '혜택', '감면', '할인', '보조금', '비용', '자금', '대출', '금융', '융자', '바우처', '일자리', '취업', '장학', '장려금'];
const BLOCK_KEYWORDS = ['어선', '어업', '원양', '옵서버', '수산물', '어선원', '해양선사', '수산', '선박', '어항'];

function isBlocked(item) {
  const text = ((item.서비스명 || '') + ' ' + (item.서비스목적요약 || '') + ' ' + (item.지원대상 || '')).toLowerCase();
  return BLOCK_KEYWORDS.some(kw => text.includes(kw));
}

function classifyItem(item) {
  const text = ((item.서비스명 || '') + ' ' + (item.서비스목적요약 || '') + ' ' + (item.지원대상 || '')).toLowerCase();
  const hasEvent = EVENT_KEYWORDS.some(kw => text.includes(kw));
  const hasBenefit = BENEFIT_KEYWORDS.some(kw => text.includes(kw));
  if (hasEvent && !hasBenefit) return '행사';
  if (hasBenefit && !hasEvent) return '혜택';
  return hasEvent ? '행사' : '혜택';
}

function scoreItem(item) {
  const text = ((item.서비스명 || '') + ' ' + (item.서비스목적요약 || '') + ' ' + (item.지원대상 || '') + ' ' + (item.소관기관명 || '')).toLowerCase();
  let score = 0;
  if (text.includes('용인')) {
    score += 10;
  } else if (text.includes('경기')) {
    score += 5;
  }
  return score;
}

async function main() {
  try {
    if (!PUBLIC_DATA_API_KEY) {
      throw new Error('PUBLIC_DATA_API_KEY 환경변수가 없습니다.');
    }
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY 환경변수가 없습니다.');
    }

    // [1단계] 공공데이터포털 API에서 전체 데이터 수 파악 후 무작위 페이지 데이터 가져오기
    const initialParams = new URLSearchParams({
      page: '1',
      perPage: '1',
      returnType: 'JSON',
      serviceKey: PUBLIC_DATA_API_KEY
    });
    const initialRes = await fetch(`${PUBLIC_DATA_ENDPOINT}?${initialParams.toString()}`);
    if (!initialRes.ok) {
      throw new Error(`공공데이터 API 초기 호출 실패: ${initialRes.status}`);
    }
    const initialResult = await initialRes.json();
    const totalCount = initialResult.totalCount || 10000;
    
    // 전체 페이지 수 계산 및 무작위 페이지 선택
    const perPage = 20;
    const totalPages = Math.ceil(totalCount / perPage);
    const randomPage = Math.floor(Math.random() * totalPages) + 1;
    
    console.log(`전체 공공서비스 개수: ${totalCount}개 (총 ${totalPages}페이지)`);
    console.log(`무작위 선정 페이지: ${randomPage}페이지`);

    const params = new URLSearchParams({
      page: String(randomPage),
      perPage: String(perPage),
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

    // [2단계] 기존 데이터와 비교를 위해 기존 이름 목록 로드
    let existingData = [];
    if (fs.existsSync(LOCAL_INFO_PATH)) {
      try {
        existingData = JSON.parse(fs.readFileSync(LOCAL_INFO_PATH, 'utf-8'));
      } catch (e) {
        existingData = [];
      }
    }
    const existingNames = new Set(existingData.map(item => item.name));

    // 미등록 및 차단 키워드가 없는 아이템들 필터링
    const newItems = items.filter(item => item.서비스명 && !existingNames.has(item.서비스명) && !isBlocked(item));

    if (newItems.length === 0) {
      console.log('새로운 데이터가 없습니다');
      return;
    }

    // 행사와 혜택 분류
    const eventCandidates = newItems.filter(item => classifyItem(item) === '행사');
    const benefitCandidates = newItems.filter(item => classifyItem(item) === '혜택');

    // 스코어링 후 정렬
    eventCandidates.sort((a, b) => scoreItem(b) - scoreItem(a));
    benefitCandidates.sort((a, b) => scoreItem(b) - scoreItem(a));

    const targetItems = [];

    // 행사 1개 선택
    if (eventCandidates.length > 0) {
      targetItems.push(eventCandidates[0]);
      console.log(`선택된 행사: ${eventCandidates[0].서비스명} (지역점수: ${scoreItem(eventCandidates[0])})`);
    } else {
      console.log('오늘 자 행사 관련 미등록 공공데이터가 없습니다.');
    }

    // 혜택 1개 선택
    if (benefitCandidates.length > 0) {
      targetItems.push(benefitCandidates[0]);
      console.log(`선택된 혜택: ${benefitCandidates[0].서비스명} (지역점수: ${scoreItem(benefitCandidates[0])})`);
    } else {
      console.log('오늘 자 혜택 관련 미등록 공공데이터가 없습니다.');
    }

    // 만약 둘 중 한 쪽만 선별되어 총 2개가 채워지지 않았다면, 예비용으로 다른 쪽의 차순위 아이템을 채워줍니다.
    if (targetItems.length === 1) {
      const selected = targetItems[0];
      const fallback = newItems.find(item => item.서비스명 !== selected.서비스명);
      if (fallback) {
        targetItems.push(fallback);
        console.log(`대체 수집 대상 추가: ${fallback.서비스명}`);
      }
    } else if (targetItems.length === 0) {
      // 둘 다 아예 없을 경우 전체 미등록 데이터 중 우선순위 높은 순으로 최대 2개 채워줌
      const fallbackCandidates = [...newItems].sort((a, b) => scoreItem(b) - scoreItem(a));
      targetItems.push(...fallbackCandidates.slice(0, 2));
      if (targetItems.length > 0) {
        console.log('비상 대체 데이터 수집:', targetItems.map(item => item.서비스명).join(', '));
      }
    }

    if (targetItems.length === 0) {
      console.log('수집할 새로운 데이터가 없습니다.');
      return;
    }

    // [3단계] Gemini AI로 새 항목 가공
    let nextId = existingData.length > 0 
      ? Math.max(...existingData.map(item => typeof item.id === 'number' ? item.id : 0)) + 1 
      : 1;

    const todayStr = new Date().toISOString().split('T')[0];
    const addedItems = [];

    for (const targetItem of targetItems) {
      console.log(`데이터 처리 중: ${targetItem.서비스명}`);
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
        console.error(`Gemini API 호출 실패 (${targetItem.서비스명}): ${geminiResponse.status}`);
        continue;
      }

      const geminiResult = await geminiResponse.json();
      let text = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // 마크다운 코드블록 제거
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      try {
        const parsedItem = JSON.parse(text);
        parsedItem.id = nextId++;
        if (!parsedItem.startDate) {
          parsedItem.startDate = todayStr;
        }
        addedItems.push(parsedItem);
      } catch (e) {
        console.error(`JSON 파싱 에러 (${targetItem.서비스명}):`, e.message);
      }
    }

    // [4단계] 기존 데이터에 추가
    if (addedItems.length > 0) {
      existingData.push(...addedItems);
      fs.writeFileSync(LOCAL_INFO_PATH, JSON.stringify(existingData, null, 2), 'utf-8');
      console.log(`${addedItems.length}개 데이터 추가 완료`);
    } else {
      console.log('새롭게 추가된 데이터가 없습니다.');
    }

  } catch (error) {
    console.error('에러 발생:', error.message);
  }
}

main();
