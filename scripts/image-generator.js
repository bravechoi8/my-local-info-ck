import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const IMAGEN_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict';

/**
 * 블로그 포스트의 제목과 요약을 바탕으로 요약 인포그래픽 카드 이미지를 생성하고 로컬에 저장합니다.
 * @param {string} title 블로그 글 제목
 * @param {string} summary 블로그 글 요약
 * @param {string} filenameKey 파일명 키워드 (이미지 저장 파일명에 사용)
 * @returns {Promise<string|null>} 저장된 이미지의 상대 경로 (예: '/images/summary-keyword.jpg'), 실패 시 null
 */
export async function generateSummaryImage(title, summary, filenameKey) {
  try {
    if (!GEMINI_API_KEY) {
      console.warn('[이미지 생성] GEMINI_API_KEY 환경변수가 없어 이미지 생성을 생략합니다.');
      return null;
    }

    // 1단계: Gemini를 사용하여 이미지 생성용 정밀 영어 프롬프트 빌드
    const promptBuilderText = `Based on the Korean blog post title and summary below, generate a highly detailed, professional English prompt for Google's Imagen text-to-image model.
The goal is to create a clean, modern, minimalist comparison infographic card, flat design vector illustration, or conceptual 3D render suitable for a blog post summary.
The image should contain NO TEXT, use a beautiful pastel or curated warm color palette, and visually represent the topic. Do not output anything other than the prompt.

Title: ${title}
Summary: ${summary}`;

    const geminiUrl = `${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`;
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: promptBuilderText
          }]
        }]
      })
    });

    if (!geminiRes.ok) {
      console.error(`[이미지 생성] Gemini 프롬프트 생성 실패: ${geminiRes.status}`);
      return null;
    }

    const geminiData = await geminiRes.json();
    let imagePrompt = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    imagePrompt = imagePrompt.trim();

    if (!imagePrompt) {
      console.error('[이미지 생성] 프롬프트 텍스트를 생성하지 못했습니다.');
      return null;
    }

    console.log(`[이미지 생성] 영어 프롬프트 빌드 완료: "${imagePrompt}"`);

    // 2단계: Imagen API 호출하여 이미지 생성
    const imagenUrl = `${IMAGEN_ENDPOINT}?key=${GEMINI_API_KEY}`;
    const payload = {
      instances: [
        {
          prompt: imagePrompt
        }
      ],
      parameters: {
        sampleCount: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '16:9'
      }
    };

    const imagenRes = await fetch(imagenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!imagenRes.ok) {
      const errMsg = await imagenRes.text();
      console.error(`[이미지 생성] Imagen API 호출 실패: ${imagenRes.status} - ${errMsg}`);
      return null;
    }

    const imagenData = await imagenRes.json();
    const predictions = imagenData.predictions || [];
    if (predictions.length === 0) {
      console.error('[이미지 생성] 생성된 이미지가 응답에 없습니다.');
      return null;
    }

    // 3단계: 이미지 디코딩 후 저장
    const base64Bytes = predictions[0].bytesBase64Encoded;
    const imgBuffer = Buffer.from(base64Bytes, 'base64');

    const publicImagesDir = path.join(__dirname, '..', 'public', 'images');
    if (!fs.existsSync(publicImagesDir)) {
      fs.mkdirSync(publicImagesDir, { recursive: true });
    }

    const cleanFilenameKey = filenameKey.replace(/[^a-zA-Z0-9\-_]/g, '');
    const filename = `card-${cleanFilenameKey}.jpg`;
    const outputPath = path.join(publicImagesDir, filename);

    fs.writeFileSync(outputPath, imgBuffer);
    console.log(`[이미지 생성] 요약 이미지 저장 완료: ${outputPath}`);

    return `/images/${filename}`;
  } catch (err) {
    console.error('[이미지 생성] 오류 발생:', err.message);
    return null;
  }
}
