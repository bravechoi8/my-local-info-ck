import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const DATA_FILE_PATH = path.join(__dirname, '..', 'public', 'data', 'local-info.json');
const POSTS_DIR_PATH = path.join(__dirname, '..', 'src', 'content', 'posts');

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
    const todayStr = new Date().toISOString().split('T')[0];

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

(본문: 800자 이상, 친근한 블로그 톤, 추천 이유 3가지 포함, 신청 방법 안내.
    이미지는 임의의 링크를 생성하지 말고, 반드시 아래 제공된 고정된 주소 중 글 내용과 가장 어울리는 이미지를 골라서 사용해줘:
- 주거/건물: https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80
- 금융/돈/재테크: https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80
- 사무실/업무/비즈니스: https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80
- 가족/인물/행복: https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=800&q=80
- IT/스마트폰/노트북: https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80
- 방송/연예/공연: https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80
- 공부/배움/미팅: https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80
- 한국/도시/도시배경: https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=800&q=80
- 쇼핑/마트/소비: https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80
- 축제/행사/문화: https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80
- 어선/바다/해양: https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80
- 친환경/에너지/태양광: https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=800&q=80
- 보안/개인정보/자물쇠: https://images.unsplash.com/photo-1633265486064-086b219351ec?auto=format&fit=crop&w=800&q=80
- 법률/공공지원/행정: https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80

**중요**: 본문에 들어가는 이미지들은 반드시 글의 핵심 주제와 밀접하게 관련 있는 카테고리만 골라서 어울리게 넣어줘. (예: 어선이나 친환경 지원금 관련 글에는 '어선/바다/해양'이나 '친환경/에너지/태양광' 이미지를 사용하고, 법률/행정/지원금 관련 글에는 '법률/공공지원/행정'이나 '금융/돈/재테크' 이미지를 주로 사용하며, 뜬금없는 '가족/인물/행복'이나 '사무실/업무/비즈니스' 이미지를 기계적으로 남발하지 말 것)
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

        fs.writeFileSync(outputPath, markdownContent, 'utf-8');
        console.log(`글 생성 완료: ${outputFilename}`);

      } catch (err) {
        console.error(`글 생성 중 오류 발생 (${itemName}):`, err.message);
      }
    }

  } catch (error) {
    console.error('에러 발생:', error.message);
  }
}

main();
