import pkg from '@next/env';
const { loadEnvConfig } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 로컬 환경변수 파일(.env.local) 자동 로드
loadEnvConfig(path.join(__dirname, '..'));

import { fetchWithRetry } from './utils.js';

const PUBLIC_DATA_API_KEY = process.env.PUBLIC_DATA_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const PUBLIC_DATA_ENDPOINT = 'https://api.odcloud.kr/api/gov24/v3/serviceList';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent';
const LOCAL_INFO_PATH = path.join(__dirname, '..', 'public', 'data', 'local-info.json');

const EVENT_KEYWORDS = ['축제', '행사', '공연', '전시', '대회', '문화', '예술', '콘서트', '페스티벌', '영화', '체험', '관광', '여행', '음악회', '독서실'];
const BENEFIT_KEYWORDS = ['지원금', '지원', '수당', '연금', '혜택', '감면', '할인', '보조금', '비용', '자금', '대출', '금융', '융자', '바우처', '일자리', '취업', '장학', '장려금'];
const BLOCK_KEYWORDS = [
  '어선', '어업', '원양', '옵서버', '수산물', '어선원', '해양선사', '수산', 
  '선박', '어항', '도서관', '도서대출', '도서 대출', '도서 대여', '책 대출', 
  '책 대여', '달성군', '달성교육재단', '울주', '울주군', '처인구', '기흥구', 
  '수지구', '용인시', '용인', '구청', '동주민센터', '행정복지센터', '안양시', '안양',
  '무역보험', '수출입', '가스안전', '가스 사업자', '가스사업자', '융자지원', '쌀 가공', '쌀가공',
  '도정업', '양곡', '임업', '농업인', '어민', '농민', '농가', '어가', '농촌', '농어촌', '농촌형', '농어촌형', '농어촌버스', '농촌보육', '농촌돌봄',
  // 비인기 키워드 대거 추가
  '연탄', '보일러', '연탄보일러', '연탄쿠폰',
  '장애학생', '장애 학생', '특수교육', '장애아동', '특수학교', '장애인 체육', '체육 장학금', '장애인', '다문화',
  '산재', '산재근로자', '산재 근로자', '산재 장해인', '산재장해인', '장해인', '직업훈련', '직장복귀', '직장 복귀',
  '보훈', '보훈대상자', '참전유공자', '독립유공자', '국가유공자', '보훈처', '제대군인',
  '우체국', '재해', '수수료', '출산', '출생', '임신', '출산육아기', '육아휴직',
  '숙련기술자', '우수숙련기술자', '취약계층', '소외계층', '저소득층', '차상위',
  '노인복지시설', '요양시설', '경로당', '요양원', '노인요양', '요양보호', '실버타운',
  '승강기', '엘리베이터', '승강기기술자', '승강기검사', '엘리베이터검사', '기능사',
  '환경오염', '배출시설', '오염물질', '환경오염물질', '대기오염', '수질오염', '폐기물',
  '인권침해', '권리구제', '군인', '장병', '전역예정', '군 생활', '입대', '군 복무', '병역',
  '원정출산', '국적', '원정 출산',
  '농식품', '스케일업', '민간투자', '벤처투자', '창업기업', '기술창업', '창업도약',
  // 법률 및 농산물 직거래 관련 비인기 키워드 차단
  '납북자', '전시납북', '법률구조', '법률상담', '소송대리', '법률지원', '대한법률구조공단', '법률조력', 
  '무료 변호사', '소송 대리', '법률 상담', '직거래', '농산물', '농수산물', '농식품', '직거래장터', 
  '로컬푸드', '급식지원센터', '학교급식', '먹거리통합지원', '친환경농산물', '임산물'
];

function isBlocked(item) {
  const text = (
    (item.서비스명 || '') + ' ' + 
    (item.서비스목적요약 || '') + ' ' + 
    (item.지원대상 || '') + ' ' + 
    (item.소관기관명 || '') + ' ' + 
    (item.선정기준 || '')
  ).toLowerCase();
  
  // 1. 금지 키워드가 포함된 경우 즉시 차단
  if (BLOCK_KEYWORDS.some(kw => text.includes(kw))) {
    return true;
  }

  // 2. 구 단위 및 로컬 시 단위 정보 원천 차단 (광역/전국 정책만 수용)
  const localGuList = [
    // 서울 25개 구
    '종로구', '중구', '용산구', '성동구', '광진구', '동대문구', '중랑구', '성북구', '강북구',
    '도봉구', '노원구', '은평구', '서대문구', '마포구', '양천구', '강서구', '구로구', '금천구',
    '영등포구', '동작구', '관악구', '서초구', '강남구', '송파구', '강동구',
    // 타 광역시 구/군 및 공통 구 명칭
    '연수구', '남동구', '부평구', '계양구', '미추홀구', 
    '영도구', '부산진구', '동래구', '해운대구', '사하구', '금정구', '연제구', '수영구', '사상구', 
    '수성구', '달서구', 
    '광산구', 
    '유성구', '대덕구', 
    '동구', '서구', '남구', '북구',
    '강화군', '옹진군', '기장군', '군위군'
  ];
  if (localGuList.some(gu => text.includes(gu))) {
    console.log(`[원천 차단] 구 단위 정보 제외: ${item.서비스명}`);
    return true;
  }

  const ggCities = [
    '수원시', '고양시', '성남시', '부천시', '안산시', '남양주시', '안양시', '화성시',
    '평택시', '의정부시', '파주시', '시흥시', '김포시', '광명시', '광주시', '군포시',
    '오산시', '이천시', '양주시', '안성시', '구리시', '포천시', '의왕시', '하남시',
    '여주시', '양평군', '동두천시', '과천시', '가평군', '연천군'
  ];
  if (ggCities.some(city => text.includes(city))) {
    console.log(`[원천 차단] 경기도 소도시 정보 제외: ${item.서비스명}`);
    return true;
  }

  // 3. 소관기관 필터링
  const agency = (item.소관기관명 || '').toLowerCase();
  if (agency) {
    const isNational = /부$|처$|청$|공단$|공사$|정부|대한민국|국가|국민/.test(agency);
    const isGyeonggiProvincial = agency.includes('경기') && !agency.endsWith('시') && !agency.endsWith('군') && !agency.endsWith('구');
    const isEvent = classifyItem(item) === '행사';
    
    if (isEvent) {
      // 행사/축제 글인 경우: 전국 단위이거나 경기도 광역 또는 경기도 산하 지자체(시, 군)인 경우 수집 허용
      // 단, 서울시 등 타 지역 광역지자체 및 용인(이미 BLOCK_KEYWORDS에서 걸림) 등은 배제
      const isGyeonggiLocal = agency.includes('경기') || agency.endsWith('도');
      const isOtherRegion = /서울특별시|서울시|부산|대구|인천|광주|대전|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주/.test(agency);
      
      if (!isNational && !isGyeonggiLocal && !isGyeonggiProvincial) {
        return true;
      }
      if (isOtherRegion && !agency.includes('경기')) {
        return true;
      }
    } else {
      // 혜택 글인 경우: 철저히 전국 단위 또는 경기도 광역(도청 등)만 수집 허용
      if (!isNational && !isGyeonggiProvincial) {
        console.log(`[원천 차단] 경기도 광역/전국 단위가 아닌 지자체 혜택 제외: ${item.서비스명} (소관기관: ${item.소관기관명})`);
        return true;
      }
    }
  }

  return false;
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
  const name = item.서비스명 || '';
  const desc = item.서비스목적요약 || '';
  const target = item.지원대상 || '';
  const agency = item.소관기관명 || '';
  
  const text = (name + ' ' + desc + ' ' + target + ' ' + agency).toLowerCase();
  let score = 0;

  // 1. 전국 단위 및 중앙정부 부처 정책 우선 (+30점)
  const isNationalAgency = /부$|처$|청$|공단$|공사$|정부|대한민국|국가|국민/.test(agency);
  if (isNationalAgency) {
    score += 30;
  }

  // 2. 핵심 타겟 지역 가산점 (+20점)
  // 경기도청(광역 단위) 정책
  const isGyeonggiProvincial = agency.includes('경기') && !agency.endsWith('시') && !agency.endsWith('군') && !agency.endsWith('구');

  if (isGyeonggiProvincial) score += 20;

  const isEvent = classifyItem(item) === '행사';

  // 3. 타 지역 기초단체 및 산하기관(서울/용인/경기가 아닌 타 시/군/구/재단/공사/진흥원 등) 정책은 강력하게 감점 (행사 글은 예외) (-30점)
  // 예: 양주시, 수원시, 서초구, 달성교육재단, 거제해양관광개발공사 등
  const isOtherLocalAgency = (
    agency.endsWith('시') || 
    agency.endsWith('군') || 
    agency.endsWith('구') || 
    agency.includes('재단') || 
    agency.includes('공사') || 
    agency.includes('진흥원') ||
    agency.includes('센터')
  ) 
    && !agency.includes('용인') 
    && !agency.includes('서울') 
    && !agency.includes('경기');

  if (isOtherLocalAgency && !isEvent) {
    score -= 30;
  }

  // 타 광역지자체 및 타 지자체명 감점 (행사 글은 예외) (-100점) - 전국 단위가 아닌 타 지역 전용 정책은 절대 선정되지 않도록 차단
  const otherRegions = [
    '부산', '대구', '인천', '광주', '대전', '울산', '세종', 
    '강원', '충북', '충청북', '충남', '충청남', '전북', '전라북', '전남', '전라남', 
    '경북', '경상북', '경남', '경상남', '제주', '달성', '거제', '울주'
  ];
  const hasOtherRegion = otherRegions.some(reg => text.includes(reg));
  if (hasOtherRegion && !isEvent) {
    const isRealGyeonggi = agency === '경기도' || (agency.includes('경기') && !agency.endsWith('시') && !agency.endsWith('군') && !agency.endsWith('구'));
    if (!isRealGyeonggi) {
      score -= 100;
    }
  }

  // 특정 구(서울의 개별 구청) 또는 특정 경기도 소도시(용인 제외) 명칭이 텍스트에 포함되어 있다면
  // 광역(서울전체, 경기전체)이 아닌 극도로 좁은 지역 혜택이므로 감점 (행사 글은 예외) (-40점)
  const seoulGu = [
    '종로구', '중구', '용산구', '성동구', '광진구', '동대문구', '중랑구', '성북구', '강북구',
    '도봉구', '노원구', '은평구', '서대문구', '마포구', '양천구', '강서구', '구로구', '금천구',
    '영등포구', '동작구', '관악구', '서초구', '강남구', '송파구', '강동구'
  ];
  
  const ggCities = [
    '수원시', '고양시', '성남시', '부천시', '안산시', '남양주시', '안양시', '화성시',
    '평택시', '의정부시', '파주시', '시흥시', '김포시', '광명시', '광주시', '군포시',
    '오산시', '이천시', '양주시', '안성시', '구리시', '포천시', '의왕시', '하남시',
    '여주시', '양평군', '동두천시', '과천시', '가평군', '연천군'
  ];

  const hasSeoulGu = seoulGu.some(gu => text.includes(gu));
  const hasGgCity = ggCities.some(city => text.includes(city));

  if ((hasSeoulGu || hasGgCity) && !isEvent) {
    score -= 40;
  }

  // 4. 인기 주제 가산점 (+15점)
  const popularKeywords = [
    '지원금', '장려금', '환급', '보조금', '수당', '재난지원금',
    '대출', '금리', '금융', '융자', '보증',
    '월세', '주택', '청약', '전세', '부동산',
    '청년', '신혼부부', '출산', '육아', '아동',
    '세금', '연말정산', '소득세', '소상공인',
    '일자리', '구직', '취업', '창업'
  ];
  const hasPopularKeyword = popularKeywords.some(kw => text.includes(kw));
  if (hasPopularKeyword) {
    score += 15;
  }

  // 5. 비인기/소수 타겟 주제 감점 (-40점)
  const unpopularKeywords = [
    '농업', '어업', '임업', '수산업', '농가', '어가', '어선', '선박', '양식장', '농민', '어민',
    '효행', '효도', '4대', '대가족', '독거',
    '박물관', '미술관', '예술가', '문화재', '창작자',
    '가축', '양돈', '양계', '동물보호'
  ];
  const hasUnpopularKeyword = unpopularKeywords.some(kw => text.includes(kw));
  if (hasUnpopularKeyword) {
    score -= 40;
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
    const initialRes = await fetchWithRetry(`${PUBLIC_DATA_ENDPOINT}?${initialParams.toString()}`);
    if (!initialRes.ok) {
      throw new Error(`공공데이터 API 초기 호출 실패: ${initialRes.status}`);
    }
    const initialResult = await initialRes.json();
    const totalCount = initialResult.totalCount || 10000;
    
    // 전체 페이지 수 계산
    const perPage = 20;
    const totalPages = Math.ceil(totalCount / perPage);
    
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

    const targetItems = [];
    let attempts = 0;
    const maxAttempts = 30;

    console.log(`전체 공공서비스 개수: ${totalCount}개 (총 ${totalPages}페이지)`);

    while (targetItems.length < 2 && attempts < maxAttempts) {
      attempts++;
      const randomPage = Math.floor(Math.random() * totalPages) + 1;
      console.log(`[수집 시도 ${attempts}/${maxAttempts}] 무작위 선정 페이지: ${randomPage}페이지`);

      const params = new URLSearchParams({
        page: String(randomPage),
        perPage: String(perPage),
        returnType: 'JSON',
        serviceKey: PUBLIC_DATA_API_KEY
      });
      const url = `${PUBLIC_DATA_ENDPOINT}?${params.toString()}`;
      
      try {
        const response = await fetchWithRetry(url);
        if (!response.ok) {
          console.warn(`공공데이터 API 호출 실패 (페이지 ${randomPage}): ${response.status}`);
          continue;
        }
        const result = await response.json();
        const items = result.data || [];

        if (items.length === 0) continue;

        // 미등록 및 차단 키워드가 없는 아이템들 필터링
        const newItems = items.filter(item => item.서비스명 && !existingNames.has(item.서비스명) && !isBlocked(item));

        if (newItems.length === 0) continue;

        // 행사와 혜택 분류 (지역/전국 단위 기준 점수 30점 이상인 대중적이고 확실한 정보만 수집)
        const eventCandidates = newItems.filter(item => classifyItem(item) === '행사' && scoreItem(item) >= 30);
        const benefitCandidates = newItems.filter(item => classifyItem(item) === '혜택' && scoreItem(item) >= 30);

        eventCandidates.sort((a, b) => scoreItem(b) - scoreItem(a));
        benefitCandidates.sort((a, b) => scoreItem(b) - scoreItem(a));

        const currentTargetNames = new Set(targetItems.map(item => item.서비스명));

        // 혜택과 행사 각각 1개씩 골고루 섞어 담는 로직
        const hasEvent = targetItems.some(item => classifyItem(item) === '행사');
        if (!hasEvent && eventCandidates.length > 0) {
          const cand = eventCandidates.find(c => !currentTargetNames.has(c.서비스명));
          if (cand) {
            targetItems.push(cand);
            currentTargetNames.add(cand.서비스명);
            console.log(`[행사 수집 성공] 서비스명: ${cand.서비스명} (점수: ${scoreItem(cand)})`);
          }
        }

        const hasBenefit = targetItems.some(item => classifyItem(item) === '혜택');
        if (!hasBenefit && benefitCandidates.length > 0) {
          const cand = benefitCandidates.find(c => !currentTargetNames.has(c.서비스명));
          if (cand) {
            targetItems.push(cand);
            currentTargetNames.add(cand.서비스명);
            console.log(`[혜택 수집 성공] 서비스명: ${cand.서비스명} (점수: ${scoreItem(cand)})`);
          }
        }

        // 여전히 2개가 채워지지 않았다면, 남는 후보 중 30점 이상인 것을 차순위로 보충
        if (targetItems.length < 2) {
          const remainingCandidates = [...eventCandidates, ...benefitCandidates]
            .filter(c => !currentTargetNames.has(c.서비스명))
            .sort((a, b) => scoreItem(b) - scoreItem(a));

          for (const cand of remainingCandidates) {
            if (targetItems.length < 2) {
              targetItems.push(cand);
              currentTargetNames.add(cand.서비스명);
              console.log(`[대체 보충 수집] 서비스명: ${cand.서비스명} (점수: ${scoreItem(cand)})`);
            }
          }
        }

      } catch (err) {
        console.error(`데이터 수집 중 에러 발생: ${err.message}`);
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

    const kstOffset = 9 * 60 * 60 * 1000;
    const todayStr = new Date(new Date().getTime() + kstOffset).toISOString().split('T')[0];
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
      const geminiResponse = await fetchWithRetry(geminiUrl, {
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
    process.exit(1);
  }
}

main();
