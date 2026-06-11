import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateSummaryImage, generateAndSaveImage } from '../scripts/image-generator.js';

// === 로컬 환경변수 파일(.env.local) 수동 로드 코드 ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '..', '.env.local');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...values] = trimmed.split('=');
      if (key) {
        const val = values.join('=').trim();
        process.env[key.trim()] = val;
      }
    }
  });
}

async function createPost() {
  const title = "네이버 웹툰 참교육 기본정보 총정리";
  const summary = "인기 네이버 웹툰 '참교육'의 줄거리, 등장인물, 연재 정보 및 핵심 관전 포인트를 알기 쉽게 요약해 드립니다.";
  const filenameKey = "true-education-info";
  
  console.log("=== [1단계] 요약 카드 이미지 생성 시도 ===");
  // generateSummaryImage 내부에서 pexelsQuery를 이용해 Pexels에서 'education', 'school' 등의 키워드로 자동 서칭합니다.
  const summaryImgPath = await generateSummaryImage(title, summary, filenameKey);
  console.log("요약 이미지 생성 결과 경로:", summaryImgPath);

  console.log("\n=== [2단계] 본문 이미지 생성 시도 ===");
  // Pexels에서 'teacher school classroom'으로 검색을 시도하여 다운로드하게끔 함
  const bodyImgPath = await generateAndSaveImage("teacher school classroom, modern classroom design", "body-true-education-1.jpg");
  console.log("본문 이미지 생성 결과 경로:", bodyImgPath);

  // 3단계: 마크다운 글 작성
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(new Date().getTime() + kstOffset);
  const todayFullStr = kstDate.toISOString().slice(0, 19) + '+09:00';

  const markdownContent = `---
title: 네이버 웹툰 참교육 기본정보 총정리
date: ${todayFullStr}
summary: 인기 네이버 웹툰 '참교육'의 줄거리, 등장인물, 연재 정보 및 핵심 관전 포인트를 알기 쉽게 요약해 드립니다.
category: 정보
tags: [네이버웹툰, 웹툰참교육, 참교육기본정보, 월요웹툰, 웹툰추천, 참교육줄거리]
---

![포스트 소개](${summaryImgPath || '/images/card-true-education-info.svg'})

네이버 월요웹툰의 대표적인 인기작, **웹툰 '참교육'**에 대한 모든 기본정보를 일목요연하게 정리해 드립니다. 시원시원한 액션과 통쾌한 스토리라인으로 수많은 독자들의 사랑을 받고 있는 이 작품의 관전 포인트와 등장인물 정보를 지금 바로 확인해 보세요!

---

### 📖 웹툰 참교육 기본정보

* **연재 플랫폼:** 네이버 웹툰 (Naver Webtoon)
* **연재 요일:** 매주 월요일 연재 (월요웹툰)
* **글/그림:** 채용택 (글) / 한가람 (그림)
* **원작/제작:** 와이랩 (YLAB)
* **이용 등급:** 15세 이용가

---

### 🎬 줄거리 및 배경 설명

무너진 교권을 바로세우기 위해 출범한 **교권보호국**. 현행법의 테두리를 벗어나 교권을 위협하는 막장 학생들과 막장 학부모, 그리고 교사들을 정의의 매로 심판하기 위해 파견된 교권보호국 현장감독관 **나화진**의 통쾌한 활약을 다루고 있습니다. 

학교 폭력, 교사 폭행 등 현실에서 발생하고 있는 민감하고 아픈 교육계의 문제들을 다루며, 독자들에게 대리만족과 깊은 생각을 동시에 안겨주는 시원한 카타르시스를 제공합니다.

---

### 🧑‍🏫 주요 등장인물 소개

1. **나화진 (교권보호국 감독관)**
   - 작품의 주인공이자 독보적인 무력을 지닌 인물입니다. 무너진 학교를 정상화하기 위해 수단과 방법을 가리지 않으며 막장 학생들을 '참교육'합니다.
2. **임한림 (교권보호국 감독관)**
   - 나화진과 동등한 무력을 지닌 파트너로, 냉철하면서도 빠른 판단력으로 현장을 휘어잡는 강력한 걸크러시 캐릭터입니다.
3. **최강석 (교권보호국 이사장)**
   - 나화진과 임한림을 신뢰하며 교권보호국의 중심을 지키는 든든한 조력자입니다.

---

### 🎨 펙셀(Pexels)에서 연동된 학교 및 교육 이미지

포스팅 내용과 교육 환경을 시각적으로 돕기 위해 연동된 무료 이미지입니다:

![학교 교실 이미지](${bodyImgPath || '/images/body-true-education-1.jpg'})

---

### 💡 핵심 관전 포인트

* **통쾌한 액션과 대사:** 빌런들을 향한 나화진의 매서운 참교육과 직설적인 팩트 폭행 대사가 돋보입니다.
* **현실 사회 문제 반영:** 단순 사이다 연출에 그치지 않고, 현실 교권 붕괴와 학원 폭력의 씁쓸한 이면을 현실감 있게 꼬집습니다.
* **와이랩 블루스트링 세계관:** 와이랩의 고등학교 학원물 세계관인 '블루스트링'의 핵심 축을 담당하고 있어 타 작품들과의 연결고리를 찾는 재미가 있습니다.

**상세 안내 및 감상:** [네이버 웹툰 참교육 보러가기](https://comic.naver.com/webtoon/list?titleId=758150)
`;

  const postsDir = path.join(__dirname, '..', 'src', 'content', 'posts');
  if (!fs.existsSync(postsDir)) {
    fs.mkdirSync(postsDir, { recursive: true });
  }

  const outputPath = path.join(postsDir, '2026-06-10-true-education-info.md');
  fs.writeFileSync(outputPath, markdownContent, 'utf-8');
  console.log(`\n🎉 블로그 포스트 생성이 완료되었습니다!`);
  console.log(`저장 위치: ${outputPath}`);
}

createPost();
