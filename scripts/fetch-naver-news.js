import fs from 'fs';
import path from 'url';
import fileFs from 'fs';
import filePath from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = filePath.dirname(__filename);

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const NAVER_ENDPOINT = 'https://openapi.naver.com/v1/search/news.json';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const POSTS_DIR_PATH = filePath.join(__dirname, '..', 'src', 'content', 'posts');

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

    // [1단계] 키워드 중 랜덤 선택 및 검색
    const keywords = ['재테크', '핫이슈', '생활정보', '연예인이슈'];
    const selectedKeyword = keywords[Math.floor(Math.random() * keywords.length)];
    console.log(`선택된 키워드: ${selectedKeyword}`);

    const params = new URLSearchParams({
      query: selectedKeyword,
      display: '10',
      sort: 'sim' // 정확도순
    });

    const response = await fetch(`${NAVER_ENDPOINT}?${params.toString()}`, {
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
      }
    });

    if (!response.ok) {
      throw new Error(`네이버 API 호출 실패: ${response.status}`);
    }

    const result = await response.json();
    const items = result.items || [];

    if (items.length === 0) {
      console.log('검색 결과가 없습니다.');
      return;
    }

    // [2단계] 기존 포스트와 중복 비교
    if (!fileFs.existsSync(POSTS_DIR_PATH)) {
      fileFs.mkdirSync(POSTS_DIR_PATH, { recursive: true });
    }

    const existingFiles = fileFs.readdirSync(POSTS_DIR_PATH).filter(file => file.endsWith('.md'));
    let targetItem = null;

    for (const item of items) {
      const cleanTitle = cleanText(item.title);
      let alreadyExists = false;

      for (const file of existingFiles) {
        const content = fileFs.readFileSync(filePath.join(POSTS_DIR_PATH, file), 'utf-8');
        // 제목의 일부가 겹치거나 링크가 겹치면 중복으로 판단
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
      console.log('새로운 뉴스 데이터가 없습니다.');
      return;
    }

    const title = cleanText(targetItem.title);
    const description = cleanText(targetItem.description);
    const link = targetItem.link;

    console.log(`대상 뉴스 선정: ${title}`);

    // [3단계] Gemini AI로 블로그 글 생성
    const todayStr = new Date().toISOString().split('T')[0];
    const prompt = `아래 뉴스를 분석해서 친근하고 흥미로운 블로그 정보 글을 작성해줘.
    
뉴스 정보:
제목: ${title}
요약: ${description}
출처 링크: ${link}

아래 형식으로 출력해줘. 반드시 이 형식만 출력하고 다른 텍스트는 없이:
---
title: (친근하고 흥미로운 제목, 낚시성 배제)
date: ${todayStr}
summary: (한 줄 요약)
category: ${selectedKeyword}
tags: [네이버 및 구글 검색 노출에 최적화된 연관 검색어 및 핵심 해시태그 5~8개 입력]
---

(본문: 800자 이상, 친근한 블로그 톤, 뉴스 내용 상세 설명, 관련 의견 및 생활 팁 3가지 포함, 출처 안내.
본문 흐름 중간중간에 관련된 이미지 마크다운을 2개(글이 짧을 때) 또는 3개(글이 길 때) 자동으로 어울리는 위치에 삽입해줘. 
이미지 마크다운은 반드시 다음 형식을 지키고, 키워드는 글의 주제를 나타내는 구체적인 영단어 1~2개로 채워줘:
![이미지 설명](https://loremflickr.com/800/600/영문키워드)
)

마지막 줄에 FILENAME: ${todayStr}-keyword 형식으로 파일명도 출력해줘. 키워드는 영문으로.`;

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
      throw new Error(`Gemini API 호출 실패: ${geminiResponse.status}`);
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
      console.log('이미 작성된 파일명입니다.');
      return;
    }

    let markdownContent = contentLines.join('\n').trim();
    markdownContent = markdownContent.replace(/^```markdown\s*/gi, '').replace(/^```\s*/g, '').replace(/```\s*$/g, '').trim();

    fileFs.writeFileSync(outputPath, markdownContent, 'utf-8');
    console.log(`글 생성 완료: ${outputFilename}`);

  } catch (error) {
    console.error('에러 발생:', error.message);
  }
}

main();
