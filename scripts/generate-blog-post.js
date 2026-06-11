import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateSummaryImage, generateAndSaveImage } from './image-generator.js';
import { fetchWithRetry } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent';
const DATA_FILE_PATH = path.join(__dirname, '..', 'public', 'data', 'local-info.json');
const POSTS_DIR_PATH = path.join(__dirname, '..', 'src', 'content', 'posts');

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
title: (검색어 노출이 잘 되도록 중요한 키워드를 자연스럽게 포함하면서도 딱딱한 안내문 형식의 어투를 벗어나 'OO하는 법', 'OO 총정리', '놓치면 손해보는 OO' 등 혜택을 강조한 제목으로 지어줘. 절대로 작은따옴표 ' 나 큰따옴표 " 를 포함하지 말 것)
date: ${todayFullStr}
summary: (한 줄 요약, 절대로 작은따옴표 ' 나 큰따옴표 " 를 포함하지 말 것)
category: (글의 주제와 성격에 가장 잘 어울리는 카테고리를 다음 목록 중 하나만 골라서 적어줘: '행사', '혜택', '핫이슈', '재테크', '생활정보', '연예인이슈')
tags: [네이버 및 구글 검색 노출에 최적화된 연관 검색어 및 핵심 해시태그 5~8개 입력]
---

[글쓰기 스타일 및 구성 가이드라인 - 정보 전달 중심]
1. 이 정보글은 복지 혜택 및 공공 정보 전달이 주 목적이므로, 너무 과하게 사적이거나 감정적인 수다는 피하고, 친절하면서도 신뢰감을 주는 명확하고 정중한 어조를 사용해줘.
2. 로봇이나 AI가 작성한 것처럼 느껴지는 딱딱하고 전형적인 말투(예: "~에 대해 알아보겠습니다", "이상으로 포스팅을 마치겠습니다" 등)는 절대로 쓰지 마세요.
3. 도입부에서 이 복지 정보가 왜 필요한지 가볍게 공감(예: "점점 물가는 오르고 생활비는 팍팍한데, 혹시 내가 받을 수 있는 혜택을 놓치고 계시진 않나요?")을 해주며 관심을 끌어줘.
4. 본문은 독자들이 핵심 정보를 쉽게 찾아보고 이해할 수 있도록 **굵은 글씨(Bold), 글머리 기호(Bullet points), 혹은 깔끔한 표(Table)**를 적극적으로 활용해 일목요연하게 정리해줘.
5. 중간에 "이 부분은 헷갈리기 쉬우니 주의하셔야 해요!", "이 서류는 꼭 챙기시는 게 좋습니다"처럼 실제 사람이 조언해주는 듯한 유용한 팁을 곁들여줘.
6. 마무리도 뻔한 결말 대신, 혜택 신청 대상자들이 놓치지 않고 다 받아 가시기를 응원하는 따뜻하고 신뢰감 있는 끝인사로 자연스럽게 마무리해줘.

[본문 분량 및 구성]
글의 분량은 내용에 맞게 탄력적으로 조율하되, 깊은 해설이 필요한 지원금이나 복지 혜택 가이드성 글의 경우에는 최소 1500자에서 2000자 내외의 풍부한 설명과 구체적인 신청 방법(대상자 자격, 필요한 서류 목록, 신청 절차), 그리고 마지막에 '자주 묻는 질문(FAQ) 코너'를 포함하여 상세하게 작성해줘.
단, 꼭 필요한 단순한 정보전달이나 공지글(예: 단순 날짜 안내 등)의 경우에는 핵심만 빠르게 찾을 수 있도록 억지로 늘리지 말고 핵심 위주로 깔끔하고 간결하게 작성해줘.
글의 맨 마지막 줄에는 반드시 입력 데이터에 포함된 공식 안내 링크(link)를 그대로 사용해 출처 및 신청 안내 표시(예: **상세 안내 및 신청:** [공식 홈페이지 바로가기](link 주소))를 한 줄 기재하고, 이를 절대로 누락하지 말아줘.
사람들이 흥미를 느낄 수 있도록 지루한 부분을 빼고 매력적인 이슈 중심의 글이 되도록 해줘.


[이미지 삽입 가이드라인]
1. 본문 흐름 중간중간에 관련된 이미지 삽입을 위해, 글의 내용과 흐름에 맞춰 어울리는 위치에 다음과 같은 형식의 플레이스홀더를 삽입해줘:
[IMAGE_PROMPT: A detailed, clear English description of the illustration for this section]
2. 글의 주제와 내용 분량에 따라 이미지의 개수를 **최소 1개에서 최대 4개 사이로 매번 유동적이고 랜덤하게** 조율해서 넣어줘. 글이 짧다면 본문에 1개만 들어가도 충분하고, 정보가 많고 긴 글이라면 흐름에 맞춰 2~4개까지 자유롭게 들어가도록 해줘. 이미지 개수가 모든 글마다 같으면 기계가 작성한 것처럼 보이므로 꼭 랜덤하고 다양하게 지정해줘.
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
    }

  } catch (error) {
    console.error('에러 발생:', error.message);
    process.exit(1);
  }
}

main();
