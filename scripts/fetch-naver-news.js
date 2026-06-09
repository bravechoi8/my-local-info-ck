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

  console.log(`[본문 이미지 생성] 총 ${matches.length}개의 이미지 생성 요청을 감지했습니다.`);
  
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
        imgPath = await generateAndSaveImage(finalPrompt, filename, '4:3');
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
      { q: '속보', sort: 'date', count: 15 },
      { q: '지원금', sort: 'sim', count: 15 },
      { q: '재테크 꿀팁', sort: 'sim', count: 10 },
      { q: '환율', sort: 'date', count: 10 }, // 고환율 등 뜨거운 경제 이슈 반영
      { q: '연예 핫이슈', sort: 'sim', count: 10 }, // 대중적 관심사인 방송/연예 이슈 반영
      { q: '화제', sort: 'sim', count: 10 } // 온라인 화제 및 트렌드 반영
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

    // 최근 작성된 포스트 제목 목록을 가져와 중복 주제 선정 방지
    const recentTitles = [];
    if (fileFs.existsSync(POSTS_DIR_PATH)) {
      const files = fileFs.readdirSync(POSTS_DIR_PATH)
        .filter(file => file.endsWith('.md'))
        .sort()
        .slice(-15);
      for (const file of files) {
        try {
          const content = fileFs.readFileSync(filePath.join(POSTS_DIR_PATH, file), 'utf-8');
          const titleMatch = content.match(/title:\s*(.+)/);
          if (titleMatch) {
            recentTitles.push(titleMatch[1].replace(/['"]/g, '').trim());
          }
        } catch (e) {
          // ignore
        }
      }
    }

    console.log('[실시간 트렌드 분석] Gemini AI를 통해 핫 키워드 추출 중...');
    const prompt = `오늘 생산된 아래 뉴스 헤드라인 목록을 보고, 오늘 한국 대중들 사이에서 가장 관심이 뜨겁고 생활 밀착형 정보성 블로그 글로 쓰기 적합한 핵심 키워드 3개를 선정해줘.
예를 들어 '스타벅스 환불', '원달러 환율', '연예인 열애설'처럼 2~3단어로 구성되고 검색창에 입력하기 좋은 명확한 단어로 해줘.

CRITICAL RULES:
1. 지방/지역 관련 글 제외 (지방글 배제 규칙):
   - 전국 단위의 정책/이슈이거나, 서울특별시(서울), 경기도(경기), 용인시 관련 이슈만 허용합니다.
   - 그 외의 특정 지방 지자체(예: 괴산군, 양주시, 부산, 대구, 강원도, 충청도 등 서울/경기/용인이 아닌 타 지역)의 고유 혜택이나 지역 뉴스는 키워드로 절대 선정하지 마세요. (예: '괴산군 지원금' 절대 금지)
2. 최근 작성된 글과의 중복 절대 금지:
   - 최근에 이미 작성된 글들과 주제가 겹치지 않아야 합니다. (예: 최근에 '엄마 카드(엄카)' 세금 관련 글이나 증여세/상속세 관련 글이 이미 존재한다면, 비슷한 세금/카드 주제는 절대 피하세요.)
   - 최근 작성된 글 제목 목록:
     ${recentTitles.map(t => `- ${t}`).join('\n     ')}
3. 분야 다양성 및 대중성 (이슈/혜택 균형):
   - 3개의 키워드는 반드시 서로 다른 분야(예: 하나가 '원달러 환율 급등'이나 '기준금리 인상'처럼 경제/재테크 이슈라면, 다른 하나는 대중의 큰 흥미를 끄는 '연예/방송/트렌드' 이슈, 나머지 하나는 생활 정보나 정부 혜택/지원금 등)여야 합니다.
   - 특히 대중들의 검색 트래픽이 몰리는 환율 급등 같은 경제 핫이슈나, 사람들의 흥미를 유발할 수 있는 연예/방송가 핫이슈가 기사 목록에 있다면 반드시 하나 이상 핵심 키워드로 적극 선정해줘.

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

    // [1단계] 키워드 목록 작성
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
      for (const kw of trendingKeywords) {
        if (tasks.length >= 3) break;
        // 이미 tasks에 '로또' 관련 키워드가 있는 경우, 또 다른 '로또' 키워드가 트렌드에서 추가되는 것을 방지합니다.
        if (kw.includes('로또') && tasks.some(t => t.keyword.includes('로또'))) {
          console.log(`[중복 키워드 필터] '로또' 관련 작업이 이미 존재하므로 '${kw}' 키워드는 제외합니다.`);
          continue;
        }
        tasks.push({ keyword: kw, isSonMonthFirst: false, isLottoSunday: false });
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
      const todayFullStr = kstDate.toISOString().slice(0, 19) + '+09:00';
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
date: ${todayFullStr}
summary: (한 줄 요약, 절대로 작은따옴표 ' 나 큰따옴표 " 를 포함하지 말 것)
category: (반드시 [행사, 혜택, 핫이슈, 재테크, 생활정보, 연예인이슈] 중 이 글의 주제에 가장 어울리는 카테고리명을 하나 골라 기재해줘. 다른 텍스트는 허용 안 됨)
tags: [네이버 및 구글 검색 노출에 최적화된 연관 검색어 및 핵심 해시태그 5~8개 입력]
naver_title: "${escapedTitle}"
naver_link: "${escapedLink}"
---

[글쓰기 스타일 및 구성 가이드라인 - 정보 전달 중심]
1. 이 글은 날짜 정보를 일목요연하게 전달하는 것이 주 목적이므로, 너무 과하게 사적이거나 감정적인 수다는 피하고, 친절하면서도 신뢰감을 주는 명확하고 정중한 설명조를 사용해줘.
2. 로봇이나 AI가 작성한 것처럼 느껴지는 딱딱하고 전형적인 말투(예: "~에 대해 알아보겠습니다", "이상으로 포스팅을 마치겠습니다" 등)는 절대로 쓰지 마세요.
3. 도입부에서 이사나 중요한 행사를 앞둔 설렘과 걱정에 대해 가볍게 공감해주며 관심을 환기해줘.
4. 본문의 손없는날 날짜는 독자들이 한눈에 파악할 수 있도록 **표(Table)** 형태로 양력 날짜와 함께 깔끔하게 구성해줘.
5. 마무리 부분도 뻔한 요약 대신, 안전하고 기분 좋은 이사나 행사가 되기를 진심으로 바라는 따뜻한 인사말로 마무리해줘.

[본문 분량 및 구성]
글의 분량은 억지로 늘리지 말고 내용에 맞게 탄력적으로 조율해줘. 단순 정보 전달이나 가벼운 안내글의 경우에는 글자수에 구애받지 않고 핵심 메시지만 짧고 간결하게 전달하도록 핵심 내용 위주로 짧게 작성하고, 깊은 해설이 필요한 주제일 때만 1000자 내외로 상세하게 작성해줘.

[이미지 삽입 가이드라인]
1. 본문 흐름 중간중간에 관련된 이미지 삽입을 위해, 글의 내용과 흐름에 맞춰 어울리는 위치에 다음과 같은 형식의 플레이스홀더를 삽입해줘:
[IMAGE_PROMPT: A detailed, clear English description of the illustration for this section]
2. 글의 주제와 내용 분량에 따라 이미지의 개수를 **최소 1개에서 최대 4개 사이로 매번 유동적이고 랜덤하게** 조율해서 넣어줘. 글이 짧다면 본문에 1개만 들어가도 충분하고, 정보가 많고 긴 글이라면 흐름에 맞춰 2~4개까지 자유롭게 들어가도록 해줘. 이미지 개수가 모든 글마다 같으면 기계가 작성한 것처럼 보이므로 꼭 랜덤하고 다양하게 지정해줘.
3. **주의**: 플레이스홀더를 마크다운 이미지 링크 형식으로 만들지 말고, 반드시 대괄호 형태의 \`[IMAGE_PROMPT: ...]\` 형식 그대로 작성해줘.
4. 프롬프트 내용(English description)은 본문 해당 단락의 주제와 어울리는 구체적인 개념적 설명이어야 하고, 사람, 금융, 이사 등 구체적 대상을 지정하되 텍스트가 들어가선 안 돼.
)

마지막 줄에 FILENAME: ${todayStr}-son-eom-neun-nal 형식으로 파일명도 출력해줘.`;
      } else {
        // 로또 글일 때 여러 뉴스의 텍스트를 모아서 풍부한 정보를 제공하도록 개선
        let lottoContext = '';
        if (selectedKeyword.includes('로또')) {
          lottoContext = `\n\n[로또 최신 보도 참고 정보]\n` + 
            items.slice(0, 8).map((it, idx) => `기사 ${idx + 1}: [제목] ${cleanText(it.title)} / [요약] ${cleanText(it.description)}`).join('\n') +
            `\n(위 여러 기사 요약들에 적힌 1등 당첨번호, 보너스 번호, 당첨 게임 수, 자동/수동 수량, 그리고 전국 1등 당첨 판매점(명당) 상호명과 지역명(예: 서울 강남구, 경기 안양시 등)을 최대한 꼼꼼하게 추출하여 가독성 좋은 표(Table) 형태로 글 본문에 반드시 포함해줘. 기사마다 숫자가 조금씩 어긋나 있다면 가장 다수 기사에서 중복 검증된 숫자를 사용해줘.)`;
        }

        prompt = `아래 뉴스를 분석해서 블로그 정보 글을 작성해줘.
    
뉴스 정보:
제목: ${title}
요약: ${description}
출처 링크: ${link}${lottoContext}

아래 형식으로 출력해줘. 반드시 이 형식만 출력하고 다른 텍스트는 없이:
---
title: (친근하고 흥미진진하여 사람들의 클릭을 부르는 매력적인 제목. 검색어 노출이 잘 되도록 중요한 키워드를 자연스럽게 포함하면서도 딱딱한 뉴스투를 벗어나 'OO하는 법', 'OO 총정리', '놓치면 손해보는 OO' 등 호기심이나 혜택을 강조한 친근한 말투로 지어줘. 절대로 작은따옴표 ' 나 큰따옴표 " 를 포함하지 말 것)
date: ${todayFullStr}
summary: (한 줄 요약, 절대로 작은따옴표 ' 나 큰따옴표 " 를 포함하지 말 것)
category: (반드시 [행사, 혜택, 핫이슈, 재테크, 생활정보, 연예인이슈] 중 이 글의 주제에 가장 어울리는 카테고리명을 하나 골라 기재해줘. 다른 텍스트는 허용 안 됨)
tags: [네이버 및 구글 검색 노출에 최적화된 연관 검색어 및 핵심 해시태그 5~8개 입력]
naver_title: "${escapedTitle}"
naver_link: "${escapedLink}"
---

[글쓰기 스타일 및 구성 가이드라인 - 주제별 이원화 적용]
이 글의 카테고리나 주제 성격에 따라 완전히 다른 두 가지 스타일 중 하나를 선택해 작성해줘:

1. **[정보/혜택/재테크/행사/생활정보 관련 주제] (예: 지원금, 세금, 청약, 로또, 생활정보 등)**:
   - **어조**: 너무 사적이거나 과하게 감정적인 수다는 피하고, 친절하고 신뢰감을 주는 명확하고 정중한 설명조를 사용해줘.
   - **가독성 극대화**: 본문 내용은 독자가 핵심을 한눈에 찾을 수 있도록 **굵은 글씨(Bold), 글머리 기호(Bullet points), 혹은 깔끔한 표(Table)**를 적극적으로 사용해 요약 정리해줘.
   - **공감과 팁**: 도입부에서 독자가 느낄 법한 현실적인 관심사나 불편함에 가볍게 공감(예: "치솟는 기름값 때문에 요즘 걱정 많으시죠?")해 주고, 본문에서는 사람이 직접 가르쳐 주는 듯한 유용한 실전 팁을 곁들여줘.

2. **[핫이슈/연예인이슈 관련 주제] (예: 연예계 소식, 연예인 이슈, 흥미로운 화제거리 등)**:
   - **어조**: 친한 친구나 다정한 이웃 블로거가 흥미진진한 비하인드 스토리를 들려주듯 친근하고 재미있는 구어체 어조(~해보셨나요?, ~더라고요!)를 적극 활용해줘.
   - **구성**: 독자의 재미와 감성적 공감을 자극하는 리액션을 가미하여 흥미로운 스토리텔링 구조로 구성해줘. 딱딱하게 항목화하기보단 줄글 형태로 몰입감 있게 전개해줘.

[본문 분량 및 구성]
글의 분량은 최소 1500자에서 2000자 내외로 풍성하고 상세하게 작성해줘. 단순히 뉴스를 나열해 대충 짧게 끝내지 말고, 독자들에게 실질적으로 도움과 재미를 주는 상세한 배경 설명, 구체적인 사례, 대중들의 흥미로운 반응, 실전 꿀팁 등을 풍부하게 담아서 작성해줘.
단, 꼭 필요한 단순한 정보전달이나 공지글(예: 로또 당첨번호 조회, 단순 날짜 안내 등)의 경우에는 핵심만 빠르게 찾을 수 있도록 억지로 늘리지 말고 핵심 위주로 깔끔하고 간결하게 작성해줘.
CRITICAL: 지원금, 혜택, 행사 관련 정보성 글인 경우, 독자들이 직접 신청할 수 있는 상세한 방법(신청 자격, 지급 금액, 신청 준비물, 신청 장소/방법 등)과 공식 신청/안내 홈페이지(혹은 관련 지자체/기관의 대표 사이트) 링크를 본문 중간 또는 하단에 명확한 인터넷 주소와 함께 '공식 신청 및 안내: [홈페이지명](URL)' 형태로 반드시 기재해줘.
글의 맨 마지막 줄에는 반드시 원본 뉴스 링크 주소인 ${link}를 그대로 사용해 출처 표시(예: **출처:** [뉴스 원본 기사 보러가기](${link}))를 한 줄 기재하고, 이를 절대로 누락하지 말아줘.


[이미지 삽입 가이드라인]
1. 본문 흐름 중간중간에 관련된 이미지 삽입을 위해, 글의 내용과 흐름에 맞춰 어울리는 위치에 다음과 같은 형식의 플레이스홀더를 삽입해줘:
[IMAGE_PROMPT: A detailed, clear English description of the illustration for this section]
2. 글의 주제와 내용 분량에 따라 이미지의 개수를 **최소 1개에서 최대 4개 사이로 매번 유동적이고 랜덤하게** 조율해서 넣어줘. 글이 짧다면 본문에 1개만 들어가도 충분하고, 정보가 많고 긴 글이라면 흐름에 맞춰 2~4개까지 자유롭게 들어가도록 해줘. 이미지 개수가 모든 글마다 같으면 기계가 작성한 것처럼 보이므로 꼭 랜덤하고 다양하게 지정해줘.
3. **주의**: 플레이스홀더를 마크다운 이미지 링크 형식으로 만들지 말고, 반드시 대괄호 형태의 \`[IMAGE_PROMPT: ...]\` 형식 그대로 작성해줘.
4. CRITICAL FOR IMAGE SAFETY: To prevent safety policy blocks from the image generator, you must NOT include any specific celebrity names (like Lee Kang-in), player names, politician names, or specific trademarked team/brand names (like PSG, Apple) inside the English description of the IMAGE_PROMPT. Instead, use generic and descriptive terms (e.g., 'a professional soccer player in a blue jersey on a field', 'a gold cup trophy on a pedestal', 'a futuristic computer desk').
)

만약 키워드가 '로또 당첨번호'인 경우, 사람들의 큰 관심을 끌 수 있는 로또 당첨번호 안내 포스팅(예: '1120회 로또 1등 당첨번호 명당 어디? 실수령액까지 완벽 요약')으로 친근하고 호기심 있게 작성해줘. 1등 번호, 보너스 번호뿐만 아니라, 특히 **전국의 1등 당첨 판매점(상호명과 구체적인 지역/주소 위치) 목록**을 제공된 뉴스 정보에서 최대한 모두 찾아서 깔끔한 표(Table)나 목록 형태로 하나도 빠짐없이 꼼꼼하게 정리해서 안내해줘야 해.

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
        console.error(`Gemini API 호출 실패 (${selectedKeyword}): ${response.status}`);
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

      fileFs.writeFileSync(outputPath, markdownContent, 'utf-8');
      console.log(`[${selectedKeyword}] 글 생성 및 이미지 자동화 완료: ${outputFilename}`);
    }

  } catch (error) {
    console.error('에러 발생:', error.message);
  }
}

main();
