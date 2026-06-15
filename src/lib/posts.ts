import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// 블로그 글 한 개의 데이터 구조 정의 (쉽게 이해할 수 있는 타입)
export interface PostData {
  slug: string;      // 인터넷 주소로 사용할 이름
  title: string;     // 글 제목
  date: string;      // 작성일 (YYYY-MM-DD 형식)
  summary: string;   // 미리보기 요약글
  category: string;  // 카테고리
  tags: string[];    // 태그 목록
  content: string;   // 마크다운 본문
  mtime: number;     // 파일 수정 시간 (정렬 보조용)
}

// 블로그 글 마크다운 파일들이 저장된 폴더 경로
const postsDirectory = path.join(process.cwd(), 'src/content/posts');

// 날짜를 YYYY-MM-DD 문자열로 변환하는 안전한 헬퍼 함수 (한국 시간 KST 기준)
function formatDate(dateVal: any): string {
  let d: Date;

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
    // 서버나 시스템의 타임존 설정에 상관없이 항상 한국 표준시(KST, Asia/Seoul) 기준으로 날짜를 포맷팅합니다.
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
    // 예외가 발생할 경우 기본 브라우저/서버 기준의 날짜를 가져옵니다.
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 제목과 본문을 분석해 행사/혜택 카테고리를 판별하는 함수
function resolveCategory(title: string, content: string, frontmatterCategory?: string): string {
  let cat = frontmatterCategory || '';
  if (cat === '정보') {
    cat = '생활정보';
  }
  const allowed = ['행사', '혜택', '핫이슈', '재테크', '생활정보', '연예인이슈'];
  if (allowed.includes(cat)) {
    return cat;
  }
  const text = (title + ' ' + content).toLowerCase();
  if (
    text.includes('지원금') ||
    text.includes('혜택') ||
    text.includes('보조금') ||
    text.includes('수당') ||
    text.includes('지원') ||
    text.includes('학비')
  ) {
    return '혜택';
  }
  if (
    text.includes('축제') ||
    text.includes('행사') ||
    text.includes('박람회') ||
    text.includes('공연')
  ) {
    return '행사';
  }
  return '혜택'; // 기본값
}

// 모든 블로그 포스트를 가져와서 날짜순으로 정렬하는 함수
export function getAllPosts(): PostData[] {
  // 폴더가 존재하지 않으면 빈 목록을 돌려줍니다.
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  // 폴더 안의 모든 파일 이름을 읽어옵니다.
  const fileNames = fs.readdirSync(postsDirectory);
  
  const allPostsData = fileNames
    .filter((fileName) => fileName.endsWith('.md')) // 마크다운 파일만 골라냅니다.
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, ''); // 파일명에서 확장자를 빼서 슬러그로 씁니다.

      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const stat = fs.statSync(fullPath);

      // gray-matter 라이브러리로 글머리 정보(frontmatter)와 본문을 나눕니다.
      const { data, content } = matter(fileContents);

      // 정렬을 위해 상세 타임스탬프 계산 (시간 정보가 없으면 하루 시작으로 계산)
      let rawDateTime = 0;
      if (data.date) {
        if (data.date instanceof Date) {
          rawDateTime = data.date.getTime();
        } else {
          const parsed = Date.parse(String(data.date));
          if (!isNaN(parsed)) {
            rawDateTime = parsed;
          }
        }
      }

      return {
        slug,
        title: data.title || '',
        date: formatDate(data.date),
        summary: data.summary || '',
        category: resolveCategory(data.title || '', content, data.category),
        tags: Array.isArray(data.tags) ? data.tags : [],
        content,
        mtime: stat.mtime.getTime(),
        rawDateTime,
      };
    });

  // 상세 시간 기준으로 내림차순(최신순) 정렬합니다.
  // 시간이 완전히 같을 경우 슬러그 알파벳 역순으로 정렬하여 빌드 시 항상 일관된 순서를 보장합니다.
  return allPostsData
    .sort((a, b) => {
      if (b.rawDateTime !== a.rawDateTime) {
        return b.rawDateTime - a.rawDateTime;
      }
      return b.slug.localeCompare(a.slug);
    })
    .map(({ rawDateTime, ...post }) => post);
}

// 특정 슬러그를 기반으로 개별 블로그 포스트 상세 데이터를 가져오는 함수
export function getPostBySlug(slug: string): PostData | null {
  try {
    const fullPath = path.join(postsDirectory, `${slug}.md`);
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const stat = fs.statSync(fullPath);
    const { data, content } = matter(fileContents);

    return {
      slug,
      title: data.title || '',
      date: formatDate(data.date),
      summary: data.summary || '',
      category: resolveCategory(data.title || '', content, data.category),
      tags: Array.isArray(data.tags) ? data.tags : [],
      content,
      mtime: stat.mtime.getTime(),
    };
  } catch (error) {
    return null;
  }
}
