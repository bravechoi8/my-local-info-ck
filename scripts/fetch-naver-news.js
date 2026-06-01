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
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
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

async function main() {
  try {
    if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
      throw new Error('NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET 환경변수가 없습니다.');
    }
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY 환경변수가 없습니다.');
    }

    // [1단계] 키워드 목록 작성 (로또/손없는날 등 특수 날짜 감안하여 서로 다른 3개 선정)
    const nowUtc = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(nowUtc.getTime() + kstOffset);
    const dayOfWeek = kstDate.getUTCDay(); // 0: 일요일, 1: 월요일 ...
    const dayOfMonth = kstDate.getUTCDate(); // 1~31: 날짜

    const tasks = [];
    // 카테고리별 정밀 키워드 풀 (Pool)
    const categoryKeywords = {
      finance: ['재테크 꿀팁', '코스피 전망', '부동산 청약', '기준 금리', '세금 환급', '지원금 신청', '연금 저축', '연말정산 꿀팁'],
      life: ['환절기 건강관리', '가전제품 추천', '전국 축제 일정', '생활 꿀팁', '해외여행 추천', '정부 지원 혜택', '실시간 트렌드', '이슈 분석'],
      entertainment: ['화제 드라마', '인기 예능 방송', '영화 개봉작', '빌보드 차트', '넷플릭스 추천', '연예가 소식']
    };

    const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
    
    // 매번 다른 조합으로 3개의 키워드 추출
    const baseKeywords = [
      getRandomItem(categoryKeywords.finance),
      getRandomItem(categoryKeywords.life),
      getRandomItem(categoryKeywords.entertainment)
    ];

    if (dayOfMonth === 1 && !process.env.SELECTED_KEYWORD) {
      const currentYear = kstDate.getUTCFullYear();
      const currentMonth = kstDate.getUTCMonth() + 1;
      tasks.push({
        keyword: `${currentYear}년 ${currentMonth}월 손없는날`,
        isSonMonthFirst: true,
        isLottoSunday: false
      });
      const shuffled = [...baseKeywords].sort(() => 0.5 - Math.random());
      tasks.push({ keyword: shuffled[0], isSonMonthFirst: false, isLottoSunday: false });
      tasks.push({ keyword: shuffled[1], isSonMonthFirst: false, isLottoSunday: false });
    } else if (dayOfWeek === 0 && !process.env.SELECTED_KEYWORD) {
      tasks.push({
        keyword: '로또 당첨번호',
        isSonMonthFirst: false,
        isLottoSunday: true
      });
      const shuffled = [...baseKeywords].sort(() => 0.5 - Math.random());
      tasks.push({ keyword: shuffled[0], isSonMonthFirst: false, isLottoSunday: false });
      tasks.push({ keyword: shuffled[1], isSonMonthFirst: false, isLottoSunday: false });
    } else {
      const shuffled = [...baseKeywords].sort(() => 0.5 - Math.random());
      // 만약 환경변수 SELECTED_KEYWORD가 있다면 우선적으로 포함
      if (process.env.SELECTED_KEYWORD) {
        tasks.push({ keyword: process.env.SELECTED_KEYWORD, isSonMonthFirst: false, isLottoSunday: false });
        tasks.push({ keyword: shuffled[0], isSonMonthFirst: false, isLottoSunday: false });
        tasks.push({ keyword: shuffled[1], isSonMonthFirst: false, isLottoSunday: false });
      } else {
        tasks.push({ keyword: shuffled[0], isSonMonthFirst: false, isLottoSunday: false });
        tasks.push({ keyword: shuffled[1], isSonMonthFirst: false, isLottoSunday: false });
        tasks.push({ keyword: shuffled[2], isSonMonthFirst: false, isLottoSunday: false });
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
category: ${postCategory}
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
title: (친근하고 흥미로운 제목, 낚시성 배제, 절대로 작은따옴표 ' 나 큰따옴표 " 를 포함하지 말 것)
date: ${todayStr}
summary: (한 줄 요약, 절대로 작은따옴표 ' 나 큰따옴표 " 를 포함하지 말 것)
category: ${postCategory}
tags: [네이버 및 구글 검색 노출에 최적화된 연관 검색어 및 핵심 해시태그 5~8개 입력]
naver_title: "${escapedTitle}"
naver_link: "${escapedLink}"
---

(본문: 글의 분량은 억지로 늘리지 말고 내용에 맞게 탄력적으로 조율해줘. 단순 정보 전달이나 가벼운 연예/이슈 뉴스의 경우에는 글자수에 구애받지 않고 핵심 메시지만 짧고 간결하게 전달하도록 핵심 내용 위주로 짧게 작성하고, 복잡한 재테크 요령이나 법률 정보 등 깊은 해설이 필요한 주제일 때만 1000자 내외의 설명과 팁을 작성해줘. 뉴스 내용에 어울리는 실질적인 도움이나 팁도 간결히 녹여내고, 글의 맨 마지막 줄에는 반드시 원본 뉴스 링크 주소인 ${link}를 그대로 사용해 출처 표시(예: **출처:** [뉴스 원본 기사 보러가기](${link}))를 한 줄 기재하고, 이를 절대로 누락하지 말아줘.
사람들이 흥미를 느낄 수 있도록 지루한 부분을 빼고 매력적인 이슈 중심의 글이 되도록 해줘.
본문 흐름 중간중간에 관련된 이미지 삽입을 위해, 글의 내용과 흐름에 맞춰 어울리는 위치에 최소 2개에서 최대 4개 사이(매번 2개, 3개, 4개 중 랜덤하게 다르게)로 다음과 같은 형식의 플레이스홀더를 삽입해줘:
[IMAGE_PROMPT: A detailed, clear English description of the illustration for this section]

**주의**: 플레이스홀더를 마크다운 이미지 링크 형식으로 만들지 말고, 반드시 대괄호 형태의 \`[IMAGE_PROMPT: ...]\` 형식 그대로 작성해줘. 모든 글마다 들어가는 이미지의 개수가 똑같으면 자동 생성된 사이트 느낌이 강해지므로, 글의 맥락상 필요한 개수만큼(2~4개 사이로 매번 다르고 자유롭게) 유동적으로 조율하여 플레이스홀더를 삽입해줘.
프롬프트 내용(English description)은 본문 해당 단락의 주제와 어울리는 구체적인 개념적 설명이어야 하고, 사람, 금융, 해당 뉴스 등 구체적 대상을 지정하되 텍스트가 들어가선 안 돼.
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
