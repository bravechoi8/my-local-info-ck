// 자동 블로그 글 생성 스크립트
// 매일 1회 실행: 최신 공공서비스 정보 → Gemini AI → 마크다운 파일 저장

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname 대체 (ES Module 환경)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 프로젝트 루트 경로
const ROOT = path.join(__dirname, '..');

// 파일 경로 설정
const DATA_FILE = path.join(ROOT, 'public', 'data', 'local-info.json');
const POSTS_DIR = path.join(ROOT, 'src', 'content', 'posts');

// Gemini API 엔드포인트 (변경 금지)
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

async function main() {
  // ──────────────────────────────────────────
  // [1단계] 최신 데이터 확인
  // ──────────────────────────────────────────

  // local-info.json 읽기
  if (!fs.existsSync(DATA_FILE)) {
    console.error('❌ 데이터 파일을 찾을 수 없습니다:', DATA_FILE);
    process.exit(1);
  }

  let dataList;
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    dataList = JSON.parse(raw);
  } catch (err) {
    console.error('❌ 데이터 파일 파싱 실패:', err.message);
    process.exit(1);
  }

  if (!Array.isArray(dataList) || dataList.length === 0) {
    console.error('❌ 데이터 파일이 비어 있거나 배열 형식이 아닙니다.');
    process.exit(1);
  }

  // 마지막 항목(가장 최신)
  const latestItem = dataList[dataList.length - 1];
  const itemName = latestItem.name || '';

  if (!itemName) {
    console.error('❌ 최신 항목에 name 필드가 없습니다.');
    process.exit(1);
  }

  // posts 폴더에 같은 name으로 작성된 글이 있는지 확인
  if (!fs.existsSync(POSTS_DIR)) {
    fs.mkdirSync(POSTS_DIR, { recursive: true });
  }

  const existingFiles = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'));

  for (const filename of existingFiles) {
    const filePath = path.join(POSTS_DIR, filename);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      // frontmatter에서 title 또는 본문에 name이 포함된 경우 중복으로 간주
      if (content.includes(itemName)) {
        console.log('이미 작성된 글입니다.');
        process.exit(0);
      }
    } catch {
      // 파일 읽기 실패 시 건너뜀
    }
  }

  // ──────────────────────────────────────────
  // [2단계] Gemini AI로 블로그 글 생성
  // ──────────────────────────────────────────

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ 환경변수 GEMINI_API_KEY가 설정되지 않았습니다.');
    process.exit(1);
  }

  // 오늘 날짜 (YYYY-MM-DD)
  const today = new Date().toISOString().slice(0, 10);

  // Gemini에게 보낼 프롬프트
  const prompt = `아래 공공서비스 정보를 바탕으로 블로그 글을 작성해줘.

정보: ${JSON.stringify(latestItem, null, 2)}

아래 형식으로 출력해줘. 반드시 이 형식만 출력하고 다른 텍스트는 없이:
---
title: (친근하고 흥미로운 제목)
date: ${today}
summary: (한 줄 요약)
category: 정보
tags: [태그1, 태그2, 태그3]
---

(본문: 800자 이상, 친근한 블로그 톤, 추천 이유 3가지 포함, 신청 방법 안내)

마지막 줄에 FILENAME: ${today}-keyword 형식으로 파일명도 출력해줘. 키워드는 영문으로.`;

  let geminiResponse;
  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ Gemini API 오류 (${res.status}):`, errText);
      process.exit(1);
    }

    const json = await res.json();
    geminiResponse = json?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!geminiResponse) {
      console.error('❌ Gemini 응답에서 텍스트를 찾을 수 없습니다.');
      console.error('응답 전체:', JSON.stringify(json, null, 2));
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Gemini API 호출 실패:', err.message);
    process.exit(1);
  }

  // ──────────────────────────────────────────
  // [3단계] 응답 파싱 및 파일 저장
  // ──────────────────────────────────────────

  // FILENAME 줄 분리
  const lines = geminiResponse.trimEnd().split('\n');
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
    // FILENAME 줄이 없을 경우 기본 파일명 사용
    console.warn('⚠️  FILENAME 줄을 찾지 못해 기본 파일명을 사용합니다.');
    filenameLine = `FILENAME: ${today}-post`;
    contentLines = lines;
  }

  // 파일명 추출 (FILENAME: YYYY-MM-DD-keyword 형식)
  const filenameRaw = filenameLine.replace('FILENAME:', '').trim();
  // 안전한 파일명 처리 (공백·특수문자 제거)
  const safeFilename = filenameRaw.replace(/[^a-zA-Z0-9\-_]/g, '').replace(/^-+|-+$/g, '');
  const outputFilename = `${safeFilename}.md`;
  const outputPath = path.join(POSTS_DIR, outputFilename);

  // 이미 같은 파일명이 존재하는 경우
  if (fs.existsSync(outputPath)) {
    console.log('이미 작성된 글입니다.');
    process.exit(0);
  }

  // 마크다운 본문 (frontmatter + 내용)
  const markdownContent = contentLines.join('\n').trim();

  if (!markdownContent) {
    console.error('❌ 생성된 글 내용이 비어 있습니다.');
    process.exit(1);
  }

  // 파일 저장
  try {
    fs.writeFileSync(outputPath, markdownContent + '\n', 'utf-8');
    console.log(`✅ 파일 생성 완료: ${outputPath}`);
  } catch (err) {
    console.error('❌ 파일 저장 실패:', err.message);
    process.exit(1);
  }
}

main();
