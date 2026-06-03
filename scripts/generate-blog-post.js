import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateSummaryImage, generateAndSaveImage } from './image-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent';
const DATA_FILE_PATH = path.join(__dirname, '..', 'public', 'data', 'local-info.json');
const POSTS_DIR_PATH = path.join(__dirname, '..', 'src', 'content', 'posts');

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

      let isPosted = false;
      for (const content of existingContents) {
        if (content.includes(itemName)) {
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
    const todayStr = new Date(new Date().getTime() + kstOffset).toISOString().split('T')[0];

    for (const item of itemsToPost) {
      const itemName = item.name || item.title || '';
      console.log(`블로그 글 생성 중: ${itemName}`);

      const prompt = `아래 공공서비스 정보를 바탕으로 블로그 글을 작성해줘.

정보: ${JSON.stringify(item)}

아래 형식으로 출력해줘. 반드시 이 형식만 출력하고 다른 텍스트는 없이:
---
title: (친근하고 흥미로운 제목, 절대로 작은따옴표 ' 나 큰따옴표 " 를 포함하지 말 것)
date: ${todayStr}
summary: (한 줄 요약, 절대로 작은따옴표 ' 나 큰따옴표 " 를 포함하지 말 것)
category: 정보
tags: [네이버 및 구글 검색 노출에 최적화된 연관 검색어 및 핵심 해시태그 5~8개 입력]
---

(본문: 글의 분량은 억지로 늘리지 말고 내용에 맞게 탄력적으로 조율해줘. 단순 정보 전달이나 가벼운 안내글의 경우에는 글자수에 구애받지 않고 핵심 메시지만 짧고 간결하게 전달하도록 핵심 내용 위주로 짧게 작성하고, 복잡한 지원금이나 장기 혜택 등 깊은 해설이 필요한 가이드성 글의 경우에는 1000자 내외의 설명과 신청 방법을 적당하게 작성해줘. 글의 맨 마지막 줄에는 반드시 입력 데이터에 포함된 공식 안내 링크(link)를 그대로 사용해 출처 및 신청 안내 표시(예: **상세 안내 및 신청:** [공식 홈페이지 바로가기](link 주소))를 한 줄 기재하고, 이를 절대로 누락하지 말아줘.
사람들이 흥미를 느낄 수 있도록 지루한 부분을 빼고 매력적인 이슈 중심의 글이 되도록 해줘.
본문 흐름 중간중간에 관련된 이미지 삽입을 위해, 글의 내용과 흐름에 맞춰 어울리는 위치에 최소 2개에서 최대 4개 사이(매번 2개, 3개, 4개 중 랜덤하게 다르게)로 다음과 같은 형식의 플레이스홀더를 삽입해줘:
[IMAGE_PROMPT: A detailed, clear English description of the illustration for this section]

**주의**: 플레이스홀더를 마크다운 이미지 링크 형식으로 만들지 말고, 반드시 대괄호 형태의 \`[IMAGE_PROMPT: ...]\` 형식 그대로 작성해줘. 모든 글마다 들어가는 이미지의 개수가 똑같으면 자동 생성된 사이트 느낌이 강해지므로, 글의 맥락상 필요한 개수만큼(2~4개 사이로 매번 다르고 자유롭게) 유동적으로 조율하여 플레이스홀더를 삽입해줘.
프롬프트 내용(English description)은 본문 해당 단락의 주제와 어울리는 구체적인 개념적 설명이어야 하고, 사람, 금융, 지원금 등 구체적 대상을 지정하되 텍스트가 들어가선 안 돼.
)

마지막 줄에 FILENAME: ${todayStr}-keyword 형식으로 파일명도 출력해줘. 키워드는 영문으로.`;

      try {
        const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
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

        // 메타데이터 파싱하여 요약 이미지 생성
        const titleMatch = markdownContent.match(/title:\s*(.+)/);
        const summaryMatch = markdownContent.match(/summary:\s*(.+)/);
        const titleVal = titleMatch ? titleMatch[1].replace(/['"]/g, '').trim() : itemName;
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

        fs.writeFileSync(outputPath, markdownContent, 'utf-8');
        console.log(`글 생성 및 이미지 자동화 완료: ${outputFilename}`);

      } catch (err) {
        console.error(`글 생성 중 오류 발생 (${itemName}):`, err.message);
      }
    }

  } catch (error) {
    console.error('에러 발생:', error.message);
  }
}

main();
