import { generateSummaryImage, generateAndSaveImage } from '../scripts/image-generator.js';

async function main() {
  const title = "내 주변 사전투표소 3초 만에 가장 쉽게 찾는 방법 총정리";
  const summary = "다가오는 지방선거 사전투표를 대비해, 내 위치에서 가장 가까운 사전투표소 장소를 스마트폰으로 3초 만에 쉽고 빠르게 찾는 조회 요령을 안내해 드립니다.";
  const filenameKey = "2026-06-01-find-advance-voting-location";

  console.log("Generating summary card...");
  const svgPath = await generateSummaryImage(title, summary, filenameKey);
  console.log(`Summary SVG generated at: ${svgPath}`);

  console.log("Generating body image 1...");
  const body1 = await generateAndSaveImage(
    "A person holding a smartphone showing a map with nearby voting location pins and route directions, clean, modern flat design vector illustration for a blog post, minimalist, beautiful color palette, no text",
    "body-2026-06-01-find-advance-voting-location-1.jpg",
    "4:3"
  );
  console.log(`Body image 1 generated at: ${body1}`);

  console.log("Generating body image 2...");
  const body2 = await generateAndSaveImage(
    "A clean, modern public center building with a large sign saying 'Voting Station' in front, with people walking in happily, clean, modern flat design vector illustration for a blog post, minimalist, beautiful color palette, no text",
    "body-2026-06-01-find-advance-voting-location-2.jpg",
    "4:3"
  );
  console.log(`Body image 2 generated at: ${body2}`);
}

main();
