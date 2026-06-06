import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const postsDirectory = path.join(process.cwd(), 'src/content/posts');

function formatDate(dateVal) {
  if (dateVal instanceof Date) {
    const year = dateVal.getFullYear();
    const month = String(dateVal.getMonth() + 1).padStart(2, '0');
    const day = String(dateVal.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  if (typeof dateVal === 'string') {
    const parsed = Date.parse(dateVal);
    if (!isNaN(parsed)) {
      const d = new Date(parsed);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return dateVal;
  }

  return '';
}

function test() {
  if (!fs.existsSync(postsDirectory)) {
    console.log("경로 없음:", postsDirectory);
    return;
  }

  const fileNames = fs.readdirSync(postsDirectory);
  
  const allPostsData = fileNames
    .filter((fileName) => fileName.endsWith('.md'))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const stat = fs.statSync(fullPath);
      const { data } = matter(fileContents);

      return {
        slug,
        title: data.title || '',
        rawDate: data.date,
        date: formatDate(data.date),
        mtime: stat.mtime.getTime(),
      };
    });

  const sortedPosts = allPostsData.sort((a, b) => {
    if (a.date < b.date) return 1;
    if (a.date > b.date) return -1;
    return b.mtime - a.mtime;
  });

  console.log("\n[정렬 후 결과 (최신 수정본이 맨 위)]");
  sortedPosts.forEach((p, idx) => {
    console.log(`${idx + 1}. [${p.date}] - ${p.title} (${p.slug}) - mtime: ${p.mtime}`);
  });
}

test();
