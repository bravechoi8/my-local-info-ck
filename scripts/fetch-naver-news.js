import fs from 'fs';
import path from 'url';
import fileFs from 'fs';
import filePath from 'path';
import { fileURLToPath } from 'url';
import { generateSummaryImage, generateAndSaveImage } from './image-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = filePath.dirname(__filename);

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const NAVER_ENDPOINT = 'https://openapi.naver.com/v1/search/news.json';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent';
const POSTS_DIR_PATH = filePath.join(__dirname, '..', 'src', 'content', 'posts');

const BLOCK_KEYWORDS = ['어선', '어업', '원양', '옵서버', '수산물', '어선원', '해양선사', '수산', '선박', '어항'];

function isBlocked(item) {
  const text = ((item.title || '') + ' ' + (item.description || '')).toLowerCase();
  return BLOCK_KEYWORDS.some(kw => text.includes(kw));
}

/**
 * 본문 내의 [IMAGE_PROMPT: ...] 형식의 플레이스홀더를 찾아 실시간으로 이미지를 생성하고 치환합니다.
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

  console.log(`[본문 이미지 생성] 총 ${matches.length}개의 이미지 생성 요청을 감지했습니다.`);
  let updatedContent = markdownContent;

  for (let i = 0; i < matches.length; i++) {
    const { fullMatch, promptText } = matches[i];
    // 프롬프트에 공통 스타일 데코레이터 추가 (블로그 일러스트 스타일)
    const styleDecorator = "clean, modern flat design vector illustration for a blog post, minimalist, beautiful color palette, no text";
    const finalPrompt = `${promptText}, ${styleDecorator}`;
    const filename = `body-${safeFilename}-${i + 1}.jpg`;

    console.log(`[본문 이미지 생성 ${i + 1}/${matches.length}] 프롬프트: "${finalPrompt}"`);
    
    // API 레이트 리밋 우회를 위해 두 번째 이미지 생성부터 2초 대기
    if (i > 0) {
      console.log(`[본문 이미지 생성] API 제한 방지를 위해 2초 대기 중...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const imgPath = await generateAndSaveImage(finalPrompt, filename, '4:3');
    if (imgPath) {
      updatedContent = updatedContent.replace(fullMatch, `![포스트 소개](${imgPath})`);
    } else {
      // 이미지 생성 실패 시 플레이스홀더 제거
      updatedContent = updatedContent.replace(fullMatch, '');
    }
  }

  return updatedContent;
}

// HTML 태그 제거 및 특수문자 변환 함수
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/<\/?[^>]+(>|$)/g, "") // HTML 태그 제거 (<b> 등)
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/**
 * 네이버 뉴스 검색 API에서 최근 뉴스들을 수집한 뒤,
 * Gemini AI를 사용해 오늘 가장 핫한 이슈 키워드 3개를 자동으로 추출합니다.
 */
async function fetchTrendingKeywords() {
  console.log('[실시간 트렌드 분석] 최신 뉴스 데이터 수집 중...');
  try {
    const seedQueries = [
      { q: '속보', sort: 'date', count: 20 },
      { q: '지원금', sort: 'sim', count: 20 },
      { q: '재테크 꿀팁', sort: 'sim', count: 15 }
    ];
    const newsItems = [];

    for (const seed of seedQueries) {
      const params = new URLSearchParams({
        query: seed.q,
        display: String(seed.count),
        sort: seed.sort
      });

      const response = await fetch(`${NAVER_ENDPOINT}?${params.toString()}`, {
        headers: {
          'X-Naver-Client-Id': NAVER_CLIENT_ID,
          'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
        }
      });

      if (response.ok) {
        const result = await response.json();
        const items = result.items || [];
        newsItems.push(...items);
      } else {
        console.error(`네이버 API 호출 실패 (시드: ${seed.q}): ${response.status}`);
      }
    }

    if (newsItems.length === 0) {
      return [];
    }

    // 뉴스 제목들만 모으기
    const titles = newsItems.map(item => cleanText(item.title)).join('\n');

    console.log('[실시간 트렌드 분석] Gemini AI를 통해 핫 키워드 추출 중...');
    const prompt = `오늘 생산된 아래 뉴스 헤드라인 목록을 보고, 오늘 한국 대중들 사이에서 가장 관심이 뜨겁고 생활 밀착형 정보성 블로그 글로 쓰기 적합한 핵심 키워드 3개를 선정해줘.
예를 들어 '스타벅스 환불', '지방선거 사전투표소', '근로장려금 신청'처럼 2~3단어로 구성되고 검색창에 입력하기 좋은 명확한 단어로 해줘.
CRITICAL: 3개의 키워드는 반드시 서로 다른 분야(예: 하나가 사회/정치 핫이슈라면, 다른 하나는 재테크/부동산/정부지원금/혜택, 나머지 하나는 날씨/생활꿀팁/생활정보 등)여야 합니다. 절대로 모든 키워드가 '핫이슈'나 사건/사고에 치우쳐서는 안 됩니다. 다양한 독자 유입을 위해 주제를 골고루 다양하게 선정해 주세요.
반드시 아래 JSON 배열 형식으로만 응답해줘. 다른 텍스트는 일체 포함하지 마:
["키워드1", "키워드2", "키워드3"]

뉴스 헤드라인 목록:
${titles}`;

    const geminiResponse = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
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
      console.error(`Gemini API 호출 실패 (트렌드 분석): ${geminiResponse.status}`);
      return [];
    }

    const geminiResult = await geminiResponse.json();
    let text = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || '';
    text = text.trim().replace(/^```json\s*/gi, '').replace(/^```\s*/g, '').replace(/```\s*$/g, '').trim();

    const keywords = JSON.parse(text);
    if (Array.isArray(keywords) && keywords.length > 0) {
      console.log(`[실시간 트렌드 분석 완료] 오늘 선정된 핫 키워드: ${keywords.join(', ')}`);
      return keywords;
    }
  } catch (err) {
    console.error('[실시간 트렌드 분석 오류]:', err.message);
  }
  return [];
}

async function main() {
  try {
    if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
      throw new Error('NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET 환경변수가 없습니다.');
    }
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY 환경변수가 없습니다.');
    }

    // [1단계] 키워드 목록 작성 (실시간 트렌드 또는 로또/손없는날 등 특수 날짜 감안하여 선정)
    const nowUtc = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(nowUtc.getTime() + kstOffset);
    const dayOfWeek = kstDate.getUTCDay(); // 0: 일요일, 1: 월요일 ...
    const dayOfMonth = kstDate.getUTCDate(); // 1~31: 날짜

    const tasks = [];

    // 만약 환경변수 SELECTED_KEYWORD가 있다면 우선적으로 포함
    if (process.env.SELECTED_KEYWORD) {
      tasks.push({ keyword: process.env.SELECTED_KEYWORD, isSonMonthFirst: false, isLottoSunday: false });
    }

    // 일요일에는 로또 당첨번호 추가
    if (dayOfWeek === 0 && !process.env.SELECTED_KEYWORD) {
      tasks.push({
        keyword: '로또 당첨번호',
        isSonMonthFirst: false,
        isLottoSunday: true
      });
    }

    // 매월 1일에는 손없는날 추가
    if (dayOfMonth === 1 && !process.env.SELECTED_KEYWORD) {
      const currentYear = kstDate.getUTCFullYear();
      const currentMonth = kstDate.getUTCMonth() + 1;
      tasks.push({
        keyword: `${currentYear}년 ${currentMonth}월 손없는날`,
        isSonMonthFirst: true,
        isLottoSunday: false
      });
    }

    // 실시간 트렌드 키워드 수집 (총 3개에서 특수 키워드를 제외한 나머지만큼 채우기)
    const neededKeywordsCount = 3 - tasks.length;
    if (neededKeywordsCount > 0) {
      const trendingKeywords = await fetchTrendingKeywords();
      for (let i = 0; i < Math.min(neededKeywordsCount, trendingKeywords.length); i++) {
        tasks.push({ keyword: trendingKeywords[i], isSonMonthFirst: false, isLottoSunday: false });
      }
    }

    // 백업 키워드 풀 (트렌드 수집 실패 시 활용)
    if (tasks.length < 3) {
      const categoryKeywords = {
        finance: ['재테크 꿀팁', '부동산 청약', '세금 환급', '지원금 신청'],
        life: ['생활 꿀팁', '실시간 트렌드', '이슈 분석', '정부 지원 혜택'],
        entertainment: ['화제 드라마', '인기 예능 방송', '넷플릭스 추천']
      };
      const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
      const backupKeywords = [
        getRandomItem(categoryKeywords.finance),
        getRandomItem(categoryKeywords.life),
        getRandomItem(categoryKeywords.entertainment)
      ];
      for (const kw of backupKeywords) {
        if (tasks.length >= 3) break;
        if (!tasks.some(t => t.keyword === kw)) {
          tasks.push({ keyword: kw, isSonMonthFirst: false, isLottoSunday: false });
        }
      }
    }

    console.log('오늘 수집할 뉴스 키워드 목록:', tasks.map(t => t.keyword).join(', '));

    if (!fileFs.existsSync(POSTS_DIR_PATH)) {
      fileFs.mkdirSync(POSTS_DIR_PATH, { recursive: true });
    }

    // 각 키워드 태스크별 루프 수행
    for (const task of tasks) {
      const selectedKeyword = task.keyword;
      const isLottoSunday = task.isLottoSunday;
      const isSonMonthFirst = task.isSonMonthFirst;

      console.log(`\n--- 키워드 처리 시작: ${selectedKeyword} ---`);

      let items = [];
      if (isSonMonthFirst) {
        items = [{
          title: `${kstDate.getUTCFullYear()}년 ${kstDate.getUTCMonth() + 1}월 손없는날`,
          description: '이번 달과 다음 달의 손없는날 정보를 일목요연하게 알려드립니다.',
          link: `https://real-infos.com/son-eom-neun-nal-${kstDate.getUTCFullYear()}-${kstDate.getUTCMonth() + 1}`
        }];
      } else {
        const params = new URLSearchParams({
          query: selectedKeyword,
          display: '30',
          sort: isLottoSunday ? 'date' : 'sim'
        });

        const response = await fetch(`${NAVER_ENDPOINT}?${params.toString()}`, {
          headers: {
            'X-Naver-Client-Id': NAVER_CLIENT_ID,
            'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
          }
        });

        if (!response.ok) {
          console.error(`네이버 API 호출 실패 (${selectedKeyword}): ${response.status}`);
          continue;
        }

        const result = await response.json();
        items = (result.items || []).filter(item => !isBlocked(item));
      }

      if (items.length === 0) {
        console.log(`[${selectedKeyword}] 검색 결과가 없습니다.`);
        continue;
      }

      // [2단계] 기존 포스트와 중복 비교 (매번 최신 파일 목록을 읽어 반영)
      const existingFiles = fileFs.readdirSync(POSTS_DIR_PATH).filter(file => file.endsWith('.md'));
      let targetItem = null;

      for (const item of items) {
        const cleanTitle = cleanText(item.title);
        let alreadyExists = false;

        for (const file of existingFiles) {
          const content = fileFs.readFileSync(filePath.join(POSTS_DIR_PATH, file), 'utf-8');
          if (content.includes(cleanTitle) || content.includes(item.link)) {
            alreadyExists = true;
            break;
          }
        }

        if (!alreadyExists) {
          targetItem = item;
          break;
        }
      }

      if (!targetItem) {
        console.log(`[${selectedKeyword}] 새롭게 포스팅할 새로운 뉴스 데이터가 없습니다.`);
        continue;
      }

      const title = cleanText(targetItem.title);
      const description = cleanText(targetItem.description);
      const link = targetItem.link;
      const escapedTitle = title.replace(/"/g, '\\"');
      const escapedLink = link.replace(/"/g, '\\"');

      console.log(`대상 뉴스 선정: ${title}`);

      const isLottoOrSon = selectedKeyword.includes('손없는날') || selectedKeyword === '로또 당첨번호';
      const postCategory = isLottoOrSon ? '생활정보' : selectedKeyword;

      // [3단계] Gemini AI로 블로그 글 생성
      const todayStr = kstDate.toISOString().split('T')[0];
      let prompt = '';

      if (isSonMonthFirst) {
        const year = kstDate.getUTCFullYear();
        const month = kstDate.getUTCMonth() + 1;
        let nextYear = year;
        let nextMonth = month + 1;
        if (nextMonth > 12) {
          nextMonth = 1;
          nextYear = year + 1;
        }
        prompt = `이번 달(${year}년 ${month}월)과 다음 달(${nextYear}년 ${nextMonth}월)의 이사/개업/결혼하기 좋은 '손없는날' 달력을 안내하는 정보성 블로그 글을 아주 친근하고 읽기 쉽게 작성해줘.
      
음력 9일, 10일, 19일, 20일, 29일, 30일에 해당하는 양력 날짜들을 정확하게 매칭하여 두 달 치 손없는날 날짜 목록이나 표(Table)로 잘 정리해줘.
이사나 행사를 준비할 때 체크해야 할 필수 정보나 손없는날의 의미/유래, 유용한 이사 꿀팁 3가지 이상을 본문에 친근하고 상세하게 적어줘.

아래 형식으로 출력해줘. 반드시 이 형식만 출력하고 다른 텍스트는 없이:
---
title: (친근하고 흥미로운 제목, 예: ${year}년 ${month}월~${nextMonth}월 이사 가기 좋은 손없는날 달력 및 꿀팁 총정리, 절대로 작은따옴표 ' 나 큰따옴표 " 를 포함하지 말 것)
date: ${todayStr}
summary: (한 줄 요약, 절대로 작은따옴표 ' 나 큰따옴표 " 를 포함하지 말 것)
category: (반드시 [행사, 혜택, 핫이슈, 재테크, 생활정보, 연예인이슈] 중 이 글의 주제에 가장 어울리는 카테고리명을 하나 골라 기재해줘. 다른 텍스트는 허용 안 됨)
tags: [네이버 및 구글 검색 노출에 최적화된 연관 검색어 및 핵심 해시태그 5~8개 입력]
naver_title: "${escapedTitle}"
naver_link: "${escapedLink}"
---

(본문: 글의 분량은 억지로 늘리지 말고 내용에 맞게 탄력적으로 조율해줘. 단순 정보 전달이나 가벼운 안내글의 경우에는 글자수에 구애받지 않고 핵심 메시지만 짧고 간결하게 전달하도록 핵심 내용 위주로 짧게 작성하고, 깊은 해설이 필요한 주제일 때만 1000자 내외로 상세하게 작성해줘.
본문 흐름 중간중간에 관련된 이미지 삽입을 위해, 글의 내용과 흐름에 맞춰 어울리는 위치에 최소 2개에서 최대 4개 사이(매번 2~4개 사이로 랜덤하게 다르게)의 다음과 같은 형식의 플레이스홀더를 삽입해줘:
[IMAGE_PROMPT: A detailed, clear English description of the illustration for this section]

**주의**: 플레이스홀더를 마크다운 이미지 링크 형식으로 만들지 말고, 반드시 대괄호 형태의 \`[IMAGE_PROMPT: ...]\` 형식 그대로 작성해줘.
프롬프트 내용(English description)은 본문 해당 단락의 주제와 어울리는 구체적인 개념적 설명이어야 하고, 사람, 금융, 이사 등 구체적 대상을 지정하되 텍스트가 들어가선 안 돼.
)

마지막 줄에 FILENAME: ${todayStr}-son-eom-neun-nal 형식으로 파일명도 출력해줘.`;
      } else {
        prompt = `아래 뉴스를 분석해서 친근하고 흥미로운 블로그 정보 글을 작성해줘.
    
뉴스 정보:
제목: ${title}
요약: ${description}
출처 링크: ${link}

아래 형식으로 출력해줘. 반드시 이 형식만 출력하고 다른 텍스트는 없이:
---
title: (친근하고 흥미진진하여 사람들의 클릭을 부르는 매력적인 제목. 검색어 노출이 잘 되도록 중요한 키워드를 자연스럽게 포함하면서도 딱딱한 뉴스투를 벗어나 'OO하는 법', 'OO 총정리', '놓치면 손해보는 OO' 등 호기심이나 혜택을 강조한 친근한 말투로 지어줘. 절대로 작은따옴표 ' 나 큰따옴표 " 를 포함하지 말 것)
date: ${todayStr}
summary: (한 줄 요약, 절대로 작은따옴표 ' 나 큰따옴표 " 를 포함하지 말 것)
category: (반드시 [행사, 혜택, 핫이슈, 재테크, 생활정보, 연예인이슈] 중 이 글의 주제에 가장 어울리는 카테고리명을 하나 골라 기재해줘. 다른 텍스트는 허용 안 됨)
tags: [네이버 및 구글 검색 노출에 최적화된 연관 검색어 및 핵심 해시태그 5~8개 입력]
naver_title: "${escapedTitle}"
naver_link: "${escapedLink}"
---

(본문: 글의 분량은 최소 700자에서 1000자 내외로 상세하게 작성해줘. 단순 정보 나열로 대충 짧게 끝내지 말고, 독자들에게 도움이 되는 배경지식, 유용한 팁, 혹은 대중들의 반응 등을 골고루 풀어써서 알차고 매력적인 글이 되도록 해줘.
CRITICAL: 지원금, 혜택, 행사 관련 정보성 글인 경우, 독자들이 직접 신청할 수 있는 상세한 방법(신청 자격, 지급 금액, 신청 준비물, 신청 장소/방법 등)과 공식 신청/안내 홈페이지(혹은 관련 지자체/기관의 대표 사이트) 링크를 본문 중간 또는 하단에 명확한 인터넷 주소와 함께 '공식 신청 및 안내: [홈페이지명](URL)' 형태로 반드시 기재해줘.
글의 맨 마지막 줄에는 반드시 원본 뉴스 링크 주소인 ${link}를 그대로 사용해 출처 표시(예: **출처:** [뉴스 원본 기사 보러가기](${link}))를 한 줄 기재하고, 이를 절대로 누락하지 말아줘.

본문 흐름 중간중간에 관련된 이미지 삽입을 위해, 글의 내용과 흐름에 맞춰 어울리는 위치에 반드시 2개에서 3개 사이로 다음과 같은 형식의 플레이스홀더를 삽입해줘:
[IMAGE_PROMPT: A detailed, clear English description of the illustration for this section]

**주의**: 플레이스홀더를 마크다운 이미지 링크 형식으로 만들지 말고, 반드시 대괄호 형태의 \`[IMAGE_PROMPT: ...]\` 형식 그대로 작성해줘.
CRITICAL FOR IMAGE SAFETY: To prevent safety policy blocks from the image generator, you must NOT include any specific celebrity names (like Lee Kang-in), player names, politician names, or specific trademarked team/brand names (like PSG, Apple) inside the English description of the IMAGE_PROMPT. Instead, use generic and descriptive terms (e.g., 'a professional soccer player in a blue jersey on a field', 'a gold cup trophy on a pedestal', 'a futuristic computer desk').
)

만약 키워드가 '로또 당첨번호'인 경우, 사람들의 큰 관심을 끌 수 있는 로또 당첨번호 안내 포스팅(예: '1120회 로또 1등 당첨번호 명당 어디? 실수령액까지 완벽 요약')으로 친근하고 호기심 있게 작성해줘. 1등 번호, 보너스 번호, 1등 명당(판매점) 정보들을 뉴스 내용에서 정밀하게 파싱해서 보기 쉽게 안내해줘.

만약 키워드에 '손없는날'이 포함되어 있는 경우, 이번 달과 다음 달의 이사/개업/결혼하기 좋은 '손없는날' 달력을 일목요연하게 안내하는 정보성 포스팅(예: '2026년 5월 6월 이사하기 좋은 손없는날 달력 및 꿀팁 정리')으로 친근하고 상세하게 작성해줘. 음력 9일, 10일, 19일, 20일, 29일, 30일에 해당하는 양력 날짜들을 정확하게 매칭하여 표(Table)나 깔끔한 리스트로 정리해 주고, 이사할 때 체크해야 할 필수 정보나 팁 3가지도 본문에 함께 담아줘.

마지막 줄에 FILENAME: ${todayStr}-keyword 형식으로 파일명도 출력해줘. 키워드는 영문으로.`;
      }

      const geminiResponse = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
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
        console.error(`Gemini API 호출 실패 (${selectedKeyword}): ${geminiResponse.status}`);
        continue;
      }

      const geminiResult = await geminiResponse.json();
      let text = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // [4단계] 파일 저장
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
        filenameLine = `FILENAME: ${todayStr}-naver-news`;
        contentLines = lines;
      }

      const filenameKey = filenameLine.replace('FILENAME:', '').trim();
      const safeFilename = filenameKey.replace(/[^a-zA-Z0-9\-_]/g, '').replace(/^-+|-+$/g, '');
      const outputFilename = `${safeFilename}.md`;
      const outputPath = filePath.join(POSTS_DIR_PATH, outputFilename);

      if (fileFs.existsSync(outputPath)) {
        console.log(`[${selectedKeyword}] 이미 파일이 존재합니다: ${outputFilename}`);
        continue;
      }

      let markdownContent = contentLines.join('\n').trim();
      markdownContent = markdownContent.replace(/^```markdown\s*/gi, '').replace(/^```\s*/g, '').replace(/```\s*$/g, '').trim();

      // 메타데이터 파싱하여 요약 이미지 생성
      const titleMatch = markdownContent.match(/title:\s*(.+)/);
      const summaryMatch = markdownContent.match(/summary:\s*(.+)/);
      const titleVal = titleMatch ? titleMatch[1].replace(/['"]/g, '').trim() : title;
      const summaryVal = summaryMatch ? summaryMatch[1].replace(/['"]/g, '').trim() : '';

      console.log(`[이미지 생성 실행] 타이틀: ${titleVal}, 요약: ${summaryVal}`);
      const imgPath = await generateSummaryImage(titleVal, summaryVal, safeFilename);
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
        // 요약 이미지 생성 직후이므로 본문 이미지 생성을 위해 2초 대기
        console.log(`[본문 이미지 생성 대기] 요약 이미지 생성 후 2초 대기 중...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // 본문 이미지 실시간 생성 및 치환
      markdownContent = await processBodyImages(markdownContent, safeFilename);

      fileFs.writeFileSync(outputPath, markdownContent, 'utf-8');
      console.log(`[${selectedKeyword}] 글 생성 및 이미지 자동화 완료: ${outputFilename}`);
    }

  } catch (error) {
    console.error('에러 발생:', error.message);
  }
}

main();
