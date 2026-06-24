import fs from "fs";
import path from "path";
import matter from "gray-matter";

// 마크다운 서식을 제거하고 평문(Plain Text)으로 바꿔주는 함수
function removeMarkdown(md) {
  if (!md) return "";
  return md
    // HTML 주석 제거
    .replace(/<!--[\s\S]*?-->/g, "")
    // 이미지 마크다운 제거: ![alt](url) -> alt
    .replace(/!\[(.*?)\]\(.*?\)/g, "$1")
    // 링크 마크다운 제거: [text](url) -> text
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    // 헤더(#) 표시 제거
    .replace(/^#+\s+/gm, "")
    // 볼드(**, __) 및 이탤릭(*, _) 서식 제거
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    // 인라인 코드(`) 제거
    .replace(/`([^`]+)`/g, "$1")
    // 코드 블록(```) 영역 전체 제거
    .replace(/```[\s\S]*?```/g, "")
    // 인용구(>) 표시 제거
    .replace(/^\s*>\s+/gm, "")
    // 목록 기호(-, *, +, 숫자.) 제거
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    // 여러 줄 바꿈이나 연속된 공백을 단일 공백으로 치환
    .replace(/\s+/g, " ")
    .trim();
}

function buildSearchIndex() {
  const searchIndex = [];

  // 1. public/data/local-info.json 파싱
  const localInfoPath = path.join(process.cwd(), "public", "data", "local-info.json");
  if (fs.existsSync(localInfoPath)) {
    try {
      const localInfoContent = fs.readFileSync(localInfoPath, "utf8");
      const localInfoData = JSON.parse(localInfoContent);
      
      if (Array.isArray(localInfoData)) {
        localInfoData.forEach((item) => {
          searchIndex.push({
            type: "local-info",
            id: item.id,
            name: item.name || "",
            category: item.category || "",
            summary: item.summary || "",
            location: item.location || "",
            target: item.target || "",
            link: item.link || ""
          });
        });
      }
    } catch (error) {
      console.error("Error reading local-info.json:", error);
    }
  }

  // 2. src/content/posts/*.md 파싱
  const postsDir = path.join(process.cwd(), "src", "content", "posts");
  if (fs.existsSync(postsDir)) {
    try {
      const files = fs.readdirSync(postsDir);
      const mdFiles = files.filter((file) => file.endsWith(".md"));

      mdFiles.forEach((fileName) => {
        const filePath = path.join(postsDir, fileName);
        const fileContent = fs.readFileSync(filePath, "utf8");
        
        // gray-matter를 이용해 frontmatter와 본문 분리
        const { data, content } = matter(fileContent);

        // 마크다운 서식을 제거한 뒤 500자만 추출
        const plainTextContent = removeMarkdown(content);
        const slicedContent = plainTextContent.slice(0, 500);

        searchIndex.push({
          type: "post",
          slug: fileName.replace(/\.md$/, ""),
          title: data.title || "",
          summary: data.summary || "",
          content: slicedContent
        });
      });
    } catch (error) {
      console.error("Error reading posts directory:", error);
    }
  }

  // 3. 결과물 저장 디렉토리 확보 및 저장
  const outputDir = path.join(process.cwd(), "public", "data");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, "search-index.json");
  fs.writeFileSync(outputPath, JSON.stringify(searchIndex, null, 2), "utf8");

  console.log(`Search index built: ${searchIndex.length} entries`);
}

buildSearchIndex();
