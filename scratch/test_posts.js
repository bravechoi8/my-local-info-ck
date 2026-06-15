import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const postsDirectory = path.join(process.cwd(), 'src/content/posts');

function formatDate(dateVal) {
  let d;

  if (dateVal instanceof Date) {
    d = dateVal;
  } else if (typeof dateVal === 'string') {
    const parsed = Date.parse(dateVal);
    if (isNaN(parsed)) {
      return dateVal;
    }
    d = new Date(parsed);
  } else {
    return '';
  }

  try {
    const formatter = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const parts = formatter.formatToParts(d);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    
    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
