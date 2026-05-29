import fs from 'fs';
import path from 'url';
import fileFs from 'fs';
import filePath from 'path';
import { fileURLToPath } from 'url';
import { generateSummaryImage } from './image-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = filePath.dirname(__filename);

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const NAVER_ENDPOINT = 'https://openapi.naver.com/v1/search/news.json';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const POSTS_DIR_PATH = filePath.join(__dirname, '..', 'src', 'content', 'posts');

const MASTER_IMAGES = [
  { name: '주거/건물', url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80' },
  { name: '금융/돈/재테크', url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80' },
  { name: '사무실/업무/비즈니스', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80' },
  { name: '가족/인물/행복', url: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=800&q=80' },
  { name: 'IT/스마트폰/노트북', url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80' },
  { name: '방송/연예/공연', url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80' },
  { name: '공부/배움/미팅', url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80' },
  { name: '한국/도시/도시배경', url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=800&q=80' },
  { name: '쇼핑/마트/소비', url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80' },
  { name: '축제/행사/문화', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80' },
  { name: '어선/바다/해양', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80' },
  { name: '친환경/에너지/태양광', url: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=800&q=80' },
  { name: '보안/개인정보/자물쇠', url: 'https://images.unsplash.com/photo-1633265486064-086b219351ec?auto=format&fit=crop&w=800&q=80' },
  { name: '법률/공공지원/행정', url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80' }
];

function getUnusedImages(postsDirPath, masterImages) {
  try {
    if (!fileFs.existsSync(postsDirPath)) return masterImages;

    const files = fileFs.readdirSync(postsDirPath)
      .filter(file => file.endsWith('.md'))
      .sort()
      .reverse();

    const usedUrls = new Set();
    const checkCount = Math.min(files.length, 12);
    for (let i = 0; i < checkCount; i++) {
      const content = fileFs.readFileSync(filePath.join(postsDirPath, files[i]), 'utf-8');
      const matches = content.match(/https:\/\/images\.unsplash\.com\/photo-[a-zA-Z0-9\-?=&_]+/g);
      if (matches) {
        matches.forEach(url => {
          const baseId = url.split('?')[0];
          usedUrls.add(baseId);
        });
      }
    }

    const unused = masterImages.filter(img => {
      const imgBaseId = img.url.split('?')[0];
      return !usedUrls.has(imgBaseId);
    });

    if (unused.length >= 6) {
      return unused;
    }
    return masterImages;
  } catch (err) {
    console.error('이미지 필터링 중 오류:', err.message);
    return masterImages;
  }
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
    const baseKeywords = ['재테크', '핫이슈', '생활정보', '연예인이슈'];

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
          display: '10',
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
        items = result.items || [];
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

      console.log(`대상 뉴스 선정: ${title}`);

      const isLottoOrSon = selectedKeyword.includes('손없는날') || selectedKeyword === '로또 당첨번호';
      const postCategory = isLottoOrSon ? '생활정보' : selectedKeyword;

      // [3단계] Gemini AI로 블로그 글 생성
      const todayStr = new Date().toISOString().split('T')[0];
      const availableImages = getUnusedImages(POSTS_DIR_PATH, MASTER_IMAGES);
      const imagesTextBlock = availableImages.map(img => `- ${img.name}: ${img.url}`).join('\n');
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
---

(본문: 1000자 이상, 친근하고 유용한 블로그 톤.
본문 흐름 중간중간에 관련된 이미지 마크다운을 3개 자동으로 어울리는 위치에 삽입해줘. 
이미지는 임의의 링크를 생성하지 말고, 반드시 아래 제공된 고정된 주소 중 글 내용과 가장 어울리는 이미지를 골라서 사용해줘:
${imagesTextBlock}

**중요**: 본문에 들어가는 이미지들은 반드시 글의 핵심 주제와 밀접하게 관련 있는 카테고리만 골라서 어울리게 넣어줘. (예: 이사/손없는날에는 '주거/건물'이나 '가족/인물/행복' 이미지를 사용하고, 뜬금없는 '사무실/업무/비즈니스' 이미지를 기계적으로 남발하지 말 것)
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
---

(본문: 글의 종류와 깊이에 맞춰 분량을 조율해줘. 단순 정보 전달이나 가벼운 연예/이슈 뉴스 전달의 경우에는 **800자 이상**으로 핵심만 재미있고 깔끔하게 작성하고, 재테크 노하우, 복잡한 경제 정보, 가이드성 글(로또 명당, 손없는날 분석 등) 등 깊이 있는 해설과 팁이 필요한 글의 경우에는 구글 애드센스 승인 요건에 최적화되도록 **1500자 이상의 매우 전문적이고 상세한 긴 글**로 작성해줘. 뉴스 내용의 상세 설명과 실생활에 도움을 주는 구체적인 해결책이나 활용 팁 3가지 이상을 풍부하고 실속 있게 포함해줘. 출처도 함께 안내해줘.
본문 흐름 중간중간에 관련된 이미지 마크다운을 글의 내용과 흐름에 맞춰 어울리는 위치에 최소 1개에서 최대 5개 사이로 삽입해줘. 모든 글마다 들어가는 이미지의 개수가 똑같으면 자동 생성된 사이트 느낌이 강해지므로, 글의 맥락상 필요한 개수만큼(1~5개 사이로 매번 다르고 자유롭게) 유동적으로 조율하여 삽입해줘.
이미지는 임의의 링크를 생성하지 말고, 반드시 아래 제공된 고정된 주소 중 글 내용과 가장 어울리는 이미지를 골라서 사용해줘:
${imagesTextBlock}

**중요**: 본문에 들어가는 이미지들은 반드시 글의 핵심 주제와 밀접하게 관련 있는 카테고리만 골라서 어울리게 넣어줘. (예: 어선 관련 글에는 '어선/바다/해양'이나 '친환경/에너지/태양광' 이미지를 사용하고, 개인정보 보호 관련 글에는 '보안/개인정보/자물쇠'나 'IT/스마트폰' 이미지를 사용하며, 뜬금없는 '가족/인물/행복'이나 '사무실/업무/비즈니스' 이미지를 기계적으로 남발하지 말 것)
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
            `\n\n![요약 카드뉴스](${imgPath})` +
            markdownContent.substring(insertPos);
        } else {
          markdownContent = `![요약 카드뉴스](${imgPath})\n\n` + markdownContent;
        }
      }

      fileFs.writeFileSync(outputPath, markdownContent, 'utf-8');
      console.log(`[${selectedKeyword}] 글 생성 및 이미지 자동화 완료: ${outputFilename}`);
    }

  } catch (error) {
    console.error('에러 발생:', error.message);
  }
}

main();
