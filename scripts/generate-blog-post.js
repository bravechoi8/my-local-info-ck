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

    const latestItem = dataList[dataList.length - 1];
    const itemName = latestItem.name || latestItem.title || '';

    if (!itemName) {
      throw new Error('최신 항목에 name 또는 title이 없습니다.');
    }

    if (!fs.existsSync(POSTS_DIR_PATH)) {
      fs.mkdirSync(POSTS_DIR_PATH, { recursive: true });
    }

    // 기존 posts 파일들과 비교
    const existingFiles = fs.readdirSync(POSTS_DIR_PATH).filter(file => file.endsWith('.md'));
    for (const file of existingFiles) {
      const content = fs.readFileSync(path.join(POSTS_DIR_PATH, file), 'utf-8');
      if (content.includes(itemName)) {
        console.log('이미 작성된 글입니다');
        return;
      }
    }

    // [2단계] Gemini AI로 블로그 글 생성
    const todayStr = new Date().toISOString().split('T')[0];

    const prompt = `아래 공공서비스 정보를 바탕으로 블로그 글을 작성해줘.

정보: ${JSON.stringify(latestItem)}

아래 형식으로 출력해줘. 반드시 이 형식만 출력하고 다른 텍스트는 없이:
---
title: (친근하고 흥미로운 제목, 절대로 작은따옴표 ' 나 큰따옴표 " 를 포함하지 말 것)
date: ${todayStr}
summary: (한 줄 요약, 절대로 작은따옴표 ' 나 큰따옴표 " 를 포함하지 말 것)
category: 정보
tags: [네이버 및 구글 검색 노출에 최적화된 연관 검색어 및 핵심 해시태그 5~8개 입력]
---

(본문: 800자 이상, 친근한 블로그 톤, 추천 이유 3가지 포함, 신청 방법 안내.
본문 흐름 중간중간에 관련된 이미지 마크다운을 2개(글이 짧을 때) 또는 3개(글이 길 때) 자동으로 어울리는 위치에 삽입해줘. 
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
)

마지막 줄에 FILENAME: ${todayStr}-keyword 형식으로 파일명도 출력해줘. 키워드는 영문으로.`;

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
      throw new Error(`Gemini API 호출 실패: ${response.status}`);
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
    // 안전한 영문/숫자 파일명 처리
    const safeFilename = filenameKey.replace(/[^a-zA-Z0-9\-_]/g, '').replace(/^-+|-+$/g, '');
    const outputFilename = `${safeFilename}.md`;
    const outputPath = path.join(POSTS_DIR_PATH, outputFilename);

    if (fs.existsSync(outputPath)) {
      console.log('이미 작성된 글입니다');
      return;
    }

    // 마크다운 내용 (frontmatter + 본문)
    let markdownContent = contentLines.join('\n').trim();
    // 마크다운 코드 블록(```markdown, ``` 등) 제거
    markdownContent = markdownContent.replace(/^```markdown\s*/gi, '').replace(/^```\s*/g, '').replace(/```\s*$/g, '').trim();

    fs.writeFileSync(outputPath, markdownContent, 'utf-8');
    console.log(`글 생성 완료: ${outputFilename}`);

  } catch (error) {
    console.error('에러 발생:', error.message);
  }
}

main();
