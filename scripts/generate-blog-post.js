import pkg from '@next/env';
const { loadEnvConfig } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 로컬 환경변수 파일(.env.local) 자동 로드
loadEnvConfig(path.join(__dirname, '..'));

import { generateSummaryImage, generateAndSaveImage } from './image-generator.js';
import { fetchWithRetry } from './utils.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent';
const DATA_FILE_PATH = path.join(__dirname, '..', 'public', 'data', 'local-info.json');
const POSTS_DIR_PATH = path.join(__dirname, '..', 'src', 'content', 'posts');

const BLOCK_KEYWORDS = [
  '건설노동자', '건설근로자', '난임', '유산', '사산', '어선', '어업', '원양', 
  '옵서버', '수산물', '어선원', '해양선사', '수산', '선박', '어항', '해산비',
  '참전유공자', '독립유공자', '농촌맞춤형', '재능나눔', '농촌', '농어촌', '농촌형', '농어촌형', '농어촌버스', '농촌보육', '농촌돌봄',
  '천안', '장애인', '다문화', '자연휴양림', '휴양림', '북한이탈주민', '탈북민',
  '미래행복통장', '제대군인', '보훈', '보훈대상자', '국가유공자', '원산지검증',
  '관세청', 'fta', '문화관광해설사', '관광해설사', '육아휴직', '출산육아기',
  '용인', '용인시', '처인구', '기흥구', '수지구', '구청', '주민센터',
  '안양', '안양시', '골목상권', '가스안전', '가스 안전', '가스', '쌀 가공', '쌀가공', '무역보험',
  // 비인기 키워드 추가 (산후조리비, 도매시장, 귀농귀촌, 특정 지엽적 수당 등)
  '연탄', '보일러', '연탄보일러', '연탄쿠폰',
  '장애학생', '특수교육', '장애아동', '특수학교',
  '노인복지시설', '요양시설', '경로당', '요양원', '노인요양', '요양보호', '실버타운',
  '승강기', '엘리베이터', '승강기기술자', '승강기검사', '엘리베이터검사', '기능사',
  '환경오염', '배출시설', '오염물질', '환경오염물질', '대기오염', '수질오염', '폐기물',
  '인권침해', '권리구제', '군인', '장병', '전역예정', '군 생활', '입대', '군 복무', '병역',
  '원정출산', '국적', '원정 출산',
  '농식품', '스케일업', '민간투자', '벤처투자', '창업기업', '기술창업', '창업도약',
  '산후조리', '산후조리비', '청년기본소득', '청년수당', '청년통장', '귀농', '귀촌', '귀농귀촌',
  '영농', '임업', '농업인', '임업인', '어업인', '도매시장', '시설현대화', '물류센터',
  '도매업', '도매인', '농지', '직불금', '농작물', '농기계', '축산물', '가축', '비료',
  '태양광', '친환경에너지', '태양광설치',
  '수학여행', '수학여행비', '현장체험', '현장체험학습', '체험학습비', '체험학습',
  // 서울 25개 구청 명칭 추가 (구 단위 소식 전면 차단)
  '종로구', '중구', '용산구', '성동구', '광진구', '동대문구', '중랑구', '성북구', '강북구',
  '도봉구', '노원구', '은평구', '서대문구', '마포구', '양천구', '강서구', '구로구', '금천구',
  '영등포구', '동작구', '관악구', '서초구', '강남구', '송파구', '강동구',
  // 법률 및 농산물 직거래 관련 비인기 키워드 차단
  '납북자', '전시납북', '법률구조', '법률상담', '소송대리', '법률지원', '대한법률구조공단', '법률조력', 
  '무료 변호사', '소송 대리', '법률 상담', '직거래', '농산물', '농수산물', '농식품', '직거래장터', 
  '로컬푸드', '급식지원센터', '학교급식', '먹거리통합지원', '친환경농산물', '임산물'
];

function isBlocked(item) {
  const text = (
    (item.name || '') + ' ' + 
    (item.title || '') + ' ' + 
    (item.summary || '') + ' ' + 
    (item.target || '') + ' ' + 
    (item.agency || '') + ' ' + 
    (item.location || '') + ' ' + 
    (item.소관기관명 || '')
  ).toLowerCase();
  
  // 1. 기본 BLOCK_KEYWORDS 필터링
  if (BLOCK_KEYWORDS.some(kw => text.includes(kw))) {
    return true;
  }

  // 2. 구 단위 및 로컬 소도시 정보 원천 차단 (블로그 생성 단계 2차 방어망 구축)
  const localGuList = [
    '종로구', '중구', '용산구', '성동구', '광진구', '동대문구', '중랑구', '성북구', '강북구',
    '도봉구', '노원구', '은평구', '서대문구', '마포구', '양천구', '강서구', '구로구', '금천구',
    '영등포구', '동작구', '관악구', '서초구', '강남구', '송파구', '강동구'
  ];
  if (localGuList.some(gu => text.includes(gu))) {
    console.log(`[블로그 생성 차단] 서울 구 단위 정보 제외: ${item.name || item.title}`);
    return true;
  }

  const ggCities = [
    '수원시', '고양시', '성남시', '부천시', '안산시', '남양주시', '안양시', '화성시',
    '평택시', '의정부시', '파주시', '시흥시', '김포시', '광명시', '광주시', '군포시',
    '오산시', '이천시', '양주시', '안성시', '구리시', '포천시', '의왕시', '하남시',
    '여주시', '양평군', '동두천시', '과천시', '가평군', '연천군'
  ];
  if (ggCities.some(city => text.includes(city))) {
    console.log(`[블로그 생성 차단] 경기도 소도시 정보 제외: ${item.name || item.title}`);
    return true;
  }

  return false;
}

/**
 * 본문 내의 [IMAGE_PROMPT: ...] 형식의 플레이스홀더를 찾아 실시간으로 이미지를 생성하고 치환합니다.
 * (병렬 처리 및 개별 재시도 기능 탑재)
 * @param {string} markdownContent 마크다운 본문
 * @param {string} safeFilename 안전한 파일명 접두사
 * @returns {Promise<string>} 이미지가 치환된 마크다운 본문
 */
async function processBodyImages(markdownContent, safeFilename) {
  const regex = /\[IMAGE_PROMPT:\s*(.+?)\]/g;
  let matches = [];
  let match;
  while ((match = regex.exec(markdownContent)) !== null) {
    matches.push({ fullMatch: match[0], promptText: match[1] });
  }

  if (matches.length === 0) {
    return markdownContent;
  }

  // 글 하나당 본문 이미지 생성 개수를 최대 2개 이하로 엄격히 제한
  if (matches.length > 2) {
    console.log(`[본문 이미지 제한] 감지된 ${matches.length}개 중 앞의 2개만 생성하고 나머지는 제외합니다.`);
    // 2개를 초과하는 플레이스홀더는 본문에서 미리 공백으로 치환하여 삭제 처리
    for (let i = 2; i < matches.length; i++) {
      markdownContent = markdownContent.replace(matches[i].fullMatch, '');
    }
    matches = matches.slice(0, 2);
  }

  console.log(`[본문 이미지 생성] 총 ${matches.length}개의 이미지 생성 요청을 처리합니다.`);
  
  // 모든 이미지 생성을 병렬로 실행
  const promises = matches.map(async (item, i) => {
    const { fullMatch, promptText } = item;
    const styleDecorator = "clean, modern flat design vector illustration for a blog post, minimalist, beautiful color palette, no text";
    const finalPrompt = `${promptText}, ${styleDecorator}`;
    const filename = `body-${safeFilename}-${i + 1}.jpg`;

    console.log(`[본문 이미지 생성 ${i + 1}/${matches.length}] 프롬프트: "${finalPrompt}"`);
    
    let imgPath = null;
    let retries = 3;
    while (retries > 0) {
      try {
        imgPath = await generateAndSaveImage(finalPrompt, filename, '4:3', i);
        if (imgPath) break;
      } catch (err) {
        console.warn(`[본문 이미지 생성 실패, 재시도 남음: ${retries - 1}] ${err.message}`);
      }
      retries--;
      if (retries > 0) {
        console.log(`[본문 이미지 생성] ${3 - retries}차 실패로 인해 3초 후 재시도합니다...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    return { fullMatch, imgPath };
  });

  const results = await Promise.all(promises);
  let updatedContent = markdownContent;
  for (const { fullMatch, imgPath } of results) {
    if (imgPath) {
      updatedContent = updatedContent.replace(fullMatch, `![포스트 소개](${imgPath})`);
    } else {
      // 이미지 생성 결국 실패 시 본문에서 플레이스홀더 제거
      updatedContent = updatedContent.replace(fullMatch, '');
    }
  }

  return updatedContent;
}

async function main() {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY 환경변수가 없습니다.');
    }

    // [1단계] 최신 데이터 확인
    if (!fs.existsSync(DATA_FILE_PATH)) {
      throw new Error('local-info.json 파일이 없습니다.');
    }

    const dataList = JSON.parse(fs.readFileSync(DATA_FILE_PATH, 'utf-8'));
    if (!Array.isArray(dataList) || dataList.length === 0) {
      throw new Error('데이터 리스트가 비어 있습니다.');
    }

    if (!fs.existsSync(POSTS_DIR_PATH)) {
      fs.mkdirSync(POSTS_DIR_PATH, { recursive: true });
    }

    // 기존 posts 파일들의 내용 전부 읽어두기
    const existingFiles = fs.readdirSync(POSTS_DIR_PATH).filter(file => file.endsWith('.md'));
    const existingContents = existingFiles.map(file => fs.readFileSync(path.join(POSTS_DIR_PATH, file), 'utf-8'));

    // 아직 포스팅되지 않은 아이템들 선별
    const itemsToPost = [];
    for (const item of dataList) {
      const itemName = item.name || item.title || '';
      if (!itemName) continue;

      // 대중성이 낮아 인기 없을 만한 글 필터링
      if (isBlocked(item)) {
        console.log(`[인기 필터링] 대중성 낮은 혜택 제외: ${itemName}`);
        continue;
      }

      let isPosted = false;
      for (const content of existingContents) {
        // 1. 프론트매터의 original_id 또는 original_name 매칭 확인
        if (content.includes(`original_id: ${item.id}`) || content.includes(`original_name: ${item.name}`)) {
          isPosted = true;
          break;
        }
        // 2. 서비스명 텍스트 포함 확인
        if (content.includes(itemName)) {
          isPosted = true;
          break;
        }
        // 3. 고유 링크 포함 확인
        if (item.link && item.link.includes('/dtlEx/') && content.includes(item.link)) {
          isPosted = true;
          break;
        }
      }

      if (!isPosted) {
        itemsToPost.push(item);
      }
    }

    if (itemsToPost.length === 0) {
      console.log('이미 모든 데이터가 포스팅되었습니다.');
      return;
    }

    console.log(`총 ${itemsToPost.length}개의 새로운 공공데이터 포스트 생성을 시작합니다.`);

    // [2단계] Gemini AI로 블로그 글 생성 루프
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(new Date().getTime() + kstOffset);
    const todayStr = kstDate.toISOString().split('T')[0];
    const todayFullStr = kstDate.toISOString().slice(0, 19) + '+09:00';

    for (const item of itemsToPost) {
      const itemName = item.name || item.title || '';
      console.log(`블로그 글 생성 중: ${itemName}`);

      const prompt = `아래 공공서비스 정보를 바탕으로 블로그 글을 작성해줘.

정보: ${JSON.stringify(item)}

아래 형식으로 출력해줘. 반드시 이 형식만 출력하고 다른 텍스트는 없이:
---
title: (검색어 노출이 잘 되도록 중요한 키워드를 자연스럽게 포함하면서도 딱딱한 안내문 형식의 어투를 벗어나 'OO하는 법', 'OO 총정리', '놓치면 손해보는 OO' 등 혜택을 강조한 제목으로 지어줘. YAML 파싱 오류를 방지하기 위해 제목 전체를 반드시 큰따옴표 " 로 감싸서 출력해줘. 예: title: "[2026 최신] 혜택 받는 법")
date: ${todayFullStr}
summary: (한 줄 요약. YAML 파싱 오류를 방지하기 위해 내용 전체를 반드시 큰따옴표 " 로 감싸서 출력해줘. 예: summary: "청년들을 위한 혜택을 모았습니다.")
category: (글의 주제와 성격에 가장 잘 어울리는 카테고리를 다음 목록 중 하나만 골라서 적어줘: '행사', '혜택', '핫이슈', '재테크', '생활정보', '연예인이슈')
tags: [네이버 및 구글 검색 노출에 최적화된 연관 검색어 및 핵심 해시태그 5~8개 입력]
---

[글쓰기 스타일 및 구성 가이드라인 - 한글 AI 티 제거 (Humanize KR v2.0) 지침]
이 글은 인공지능이 작성한 어조를 완벽히 제거하고, 한국어 모국어 화자가 직접 쓴 것처럼 자연스러운 리듬과 표현으로 구성되어야 합니다. 아래 10대 감지 패턴(A~J)을 의식하여 글을 작성하세요.

1. **A. 번역투 조사 및 피동 표현 금지 (최우선)**
   - "~를 통해", "~에 대해", "~에 있어서", "~에서의", "~에의", "~로의" 같이 영어 직역에서 파생된 어색한 조사와 중복 조사를 배제하세요. (예: "AI 기술을 통해 효율을 높인다" -> "AI로 효율을 높인다")
   - "그", "그녀", "그것", "그들" 같은 영어식 3인칭 대명사는 한국어 맥락상 불필요하므로 절대 쓰지 마세요.
   - 이중 피동 표현(예: "~되어진다", "~되어지고 있다")을 피하고 능동태를 기본으로 쓰세요.
   - 영어 'have'를 번역한 "~를 가지고 있다", "~를 가지다"는 "~가 있다"나 "~를 갖췄다"로 고쳐 쓰세요.
2. **B. 불필요한 영어 병기 및 괄호 남용 금지**: 한글로 뜻이 통하면 굳이 괄호 안에 영어를 덧붙이지 마세요.
3. **C. 기계적 구조 및 나열 방지**: "첫째, 둘째, 셋째" 혹은 "1단계, 2단계" 같은 기계적인 번호 나열이나 접속사 뒤 쉼표(예: "따라서, 이 혜택은~", "하지만, 신청할 때는~")를 쓰지 마세요. 소제목에 불필요한 콜론(X: Y)도 지양하세요.
4. **D. AI 상투적 관용구 전면 제거**: "결론적으로", "시사하는 바가 크다", "주목할 만하다", "혁신적인", "획기적인", "눈부신 발전", "압도적", "대대적" 같은 로봇의 대표 어휘를 쓰지 마세요.
5. **E. 문장의 리듬감 및 어조 일관성**: 동일한 종결어미(예: "~입니다", "~할 것입니다")가 3번 이상 연속으로 반복되지 않도록 다양하게 변형하고, 존댓말을 처음부터 끝까지 일관되게 적용하세요.
6. **F. 불필요한 수식어 및 명사화 접미사 축소**: "매우", "정말" 같은 수식어를 줄이고, 영어 명사형을 직역한 "~적", "~성", "~화"(예: "지속적인 발전" -> "꾸준한 발전", "효율성 극대화" -> "효율 높이기")를 불필요하게 사용하지 마세요.
7. **G. 완곡한 표현(Hedging) 남용 금지**: 소극적인 대답(예: "~할 수 있을 것으로 보입니다", "~일 수 있습니다", "~라고 생각됩니다") 대신 혜택 정보는 신뢰감 있게 명확하고 단호하게 서술하세요.
8. **H. 접속사 남발 자제**: 문장 머리에 "또한", "따라서", "즉", "나아가", "하지만" 등의 접속사를 계속 쓰지 마세요. 문장 자체의 자연스러운 맥락 흐름으로 이어지게 하세요.
9. **I. 늘어지는 형식명사 제거**: "~하는 것이다", "~하는 점", "~하는 바", "~할 필요가 있다" 처럼 말을 길게 늘어뜨리지 말고, 문장을 명확하고 간결하게 맺으세요. (예: "신청을 추천하는 것이다" -> "신청을 추천합니다")
10. **J. 시각 장식 및 이모지 남용 금지**: 제목, 소제목, 본문 중간에 🚀, 💡, ✨, 🌟 같은 감정 섞인 이모티콘을 사용하지 마세요. 과도한 볼드(굵은 글씨)나 긴 대시(—) 등 시각 장식도 줄이세요.

[4대 철칙]
- **의미 불변**: 공식적인 혜택 명칭, 지원금 수치, 신청 조건 등 사실 데이터는 100% 원문 그대로 보존하세요.
- **가독성 확보**: 표(Table)나 문맥 전환을 활용해 독자가 쉽게 읽을 수 있는 디자인 레이아웃을 구성하세요.
- **전문성 유지**: 가볍거나 장난스러운 말투 대신 친절하고 정중하면서도 공공 정보 전달에 맞는 신뢰감을 제공하세요.

[구글 애드센스 승인(E-E-A-T)을 위한 핵심 고도화 가이드]
1. **사회경제적 필요성 서술**: 서론에 이 정책이나 혜택이 왜 도입되었고, 현재 독자들에게 왜 중요한지 2~3개 문단으로 상세히 설명해 줘. (예: 물가 인상에 따른 비용 부담 완화, 청년 자립 자금 지원의 장기적 의미 등)
2. **모의 혜택 및 절감액 시뮬레이션 제공**: 본문 중간에 이 혜택을 수혜 받았을 때 실제로 얼마의 돈이 절약되는지 예시 시나리오를 들어 가상 계산을 해주는 '실제 예상 혜택 계산 섹션'을 꼭 포함해 줘.
3. **소비자 타겟 그룹별 꿀팁**: 이 혜택을 신청하면 특히 좋은 계층(예: 맞벌이, 미취업자, 1인 가구 등)을 최소 2개 그룹 이상으로 나누어 상황별 신청 조건과 조언을 각각 설명해 줘.
4. **신청 장애 극복을 위한 Action Plan**: 신청 시 서류 누락이나 대상 탈락을 막기 위한 실무 꿀팁(예: 발급 기한이 1개월 이내인 등본 필수, 온라인 신청 사이트 먹통 대처 요령 등)을 작성해 줘.
5. **글 본문 중간 링크 삽입 규칙**: 맨 아래에만 참고 링크를 몰아두지 말고, 글의 본문 맥락상 해당 서비스나 사이트가 언급되는 지점(예: '조회 방법', '신청하기', '로그인' 단계 등)에 직접 클릭할 수 있는 마크다운 링크([사이트 이름(설명)](link 주소))를 최소 1~2개 이상 삽입해 줘.

[본문 분량 및 구성]
글의 분량은 무조건 **최소 2000자에서 2500자 내외**로 책의 한 단원을 보듯이 매우 상세하고 전문성 있게 채워 작성해야 해. 단순히 데이터 한두 줄을 늘려 쓰는 게 아니라, 구체적인 조건, 필요 서류 및 발급처 목록, 신청 진행 프로세스 단계별 꿀팁, 그리고 '자주 묻는 질문(FAQ)' 코너(최소 3개 질문 이상)를 반드시 포함하여 분량을 풍부하게 채워 줘.
글의 맨 마지막 줄에는 반드시 입력 데이터에 포함된 공식 안내 링크(link)를 그대로 사용해 출처 및 신청 안내 표시(예: **상세 안내 및 신청:** [공식 홈페이지 바로가기](link 주소))를 한 줄 기재하고, 이를 절대로 누락하지 말아줘.

[이미지 삽입 가이드라인]
1. 본문 흐름 중간중간에 관련된 이미지 삽입을 위해, 글의 내용과 흐름에 맞춰 어울리는 위치에 다음과 같은 형식의 플레이스홀더를 삽입해줘:
[IMAGE_PROMPT: A detailed, clear English description of the illustration for this section]
2. 글의 주제와 내용 분량에 따라 이미지의 개수를 **최소 1개에서 최대 2개 이하로만 매번 유동적이고 랜덤하게** 조율해서 넣어줘. 글이 짧다면 본문에 1개만 들어가도 충분하고, 정보가 많고 긴 글이라도 최대 2개까지만 제한해서 들어가도록 해줘. 이미지 개수가 모든 글마다 같으면 기계가 작성한 것처럼 보이므로 1개 또는 2개로 랜덤하게 지정해줘.
3. **주의**: 플레이스홀더를 마크다운 이미지 링크 형식으로 만들지 말고, 반드시 대괄호 형태의 \`[IMAGE_PROMPT: ...]\` 형식 그대로 작성해줘.
4. 프롬프트 내용(English description)은 본문 해당 단락의 주제와 어울리는 구체적인 개념적 설명이어야 하고, 사람, 금융, 지원금 등 구체적 대상을 지정하되 텍스트가 들어가선 안 돼.

마지막 줄에 FILENAME: ${todayStr}-keyword 형식으로 파일명도 출력해줘. 키워드는 영문으로.`;

      try {
        const response = await fetchWithRetry(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
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

        if (!response.ok) {
          console.error(`Gemini API 호출 실패 (${itemName}): ${response.status}`);
          continue;
        }

        const result = await response.json();
        let text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // [3단계] 파일 저장
        const lines = text.trim().split('\n');
        let filenameLine = '';
        let contentLines = [];

        for (let i = lines.length - 1; i >= 0; i--) {
          if (lines[i].trim().startsWith('FILENAME:')) {
            filenameLine = lines[i].trim();
            contentLines = lines.slice(0, i);
            break;
          }
        }

        if (!filenameLine) {
          filenameLine = `FILENAME: ${todayStr}-post`;
          contentLines = lines;
        }

        const filenameKey = filenameLine.replace('FILENAME:', '').trim();
        const safeFilename = filenameKey.replace(/[^a-zA-Z0-9\-_]/g, '').replace(/^-+|-+$/g, '');
        const outputFilename = `${safeFilename}.md`;
        const outputPath = path.join(POSTS_DIR_PATH, outputFilename);

        if (fs.existsSync(outputPath)) {
          console.log(`이미 파일이 존재합니다: ${outputFilename}`);
          continue;
        }

        let markdownContent = contentLines.join('\n').trim();
        markdownContent = markdownContent.replace(/^```markdown\s*/gi, '').replace(/^```\s*/g, '').replace(/```\s*$/g, '').trim();

        // YAML 파싱 오류 방지를 위해 title과 summary 필드가 큰따옴표로 감싸져 있는지 확인하고 보정합니다.
        markdownContent = markdownContent.replace(/^title:\s*(.+)$/m, (match, p1) => {
          const trimmed = p1.trim();
          if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
            return match;
          }
          return `title: "${trimmed.replace(/"/g, '\\"')}"`;
        });
        markdownContent = markdownContent.replace(/^summary:\s*(.+)$/m, (match, p1) => {
          const trimmed = p1.trim();
          if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
            return match;
          }
          return `summary: "${trimmed.replace(/"/g, '\\"')}"`;
        });

        // 프론트매터에 고유 ID와 원래 이름을 기재하여 차후 중복 포스팅을 원천 차단
        const frontEnd = markdownContent.indexOf('\n---', 4);
        if (frontEnd !== -1) {
          markdownContent = markdownContent.substring(0, frontEnd) +
            `\noriginal_id: ${item.id}\noriginal_name: ${item.name}` +
            markdownContent.substring(frontEnd);
        }

        // 메타데이터 파싱하여 요약 이미지 생성
        const titleMatch = markdownContent.match(/title:\s*(.+)/);
        const summaryMatch = markdownContent.match(/summary:\s*(.+)/);
        const titleVal = titleMatch ? titleMatch[1].replace(/['"]/g, '').trim() : itemName;
        const summaryVal = summaryMatch ? summaryMatch[1].replace(/['"]/g, '').trim() : '';

        console.log(`[이미지 생성 실행] 타이틀: ${titleVal}, 요약: ${summaryVal}`);
        
        let imgPath = null;
        let summaryRetries = 3;
        while (summaryRetries > 0) {
          try {
            imgPath = await generateSummaryImage(titleVal, summaryVal, safeFilename);
            if (imgPath) break;
          } catch (err) {
            console.warn(`[요약 이미지 생성 실패, 재시도 남음: ${summaryRetries - 1}] ${err.message}`);
          }
          summaryRetries--;
          if (summaryRetries > 0) {
            console.log(`[요약 이미지 생성] 3초 후 재시도합니다...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }

        if (imgPath) {
          const frontmatterEndIndex = markdownContent.indexOf('\n---', 4);
          if (frontmatterEndIndex !== -1) {
            const insertPos = frontmatterEndIndex + 4;
            markdownContent = markdownContent.substring(0, insertPos) +
              `\n\n![포스트 소개](${imgPath})` +
              markdownContent.substring(insertPos);
          } else {
            markdownContent = `![포스트 소개](${imgPath})\n\n` + markdownContent;
          }
        }

        // 본문 이미지 실시간 생성 및 치환
        markdownContent = await processBodyImages(markdownContent, safeFilename);

        fs.writeFileSync(outputPath, markdownContent, 'utf-8');
        console.log(`글 생성 및 이미지 자동화 완료: ${outputFilename}`);

      } catch (err) {
        console.error(`글 생성 중 오류 발생 (${itemName}):`, err.message);
      }
      
      // 구글 API 분당 요청 한도(RPM) 초과 예방을 위한 12초 안전 대기 시간 추가
      console.log(`[API 한도 방어] 다음 글 요청까지 12초간 대기합니다...`);
      await new Promise(resolve => setTimeout(resolve, 12000));
    }

  } catch (error) {
    console.error('에러 발생:', error.message);
    process.exit(1);
  }
}

main();
