import fs from 'fs';

// 1. HomeClient.tsx 파일 수정
const homeFile = 'c:/Users/cloud/Desktop/my-local-info-ck/src/components/HomeClient.tsx';
let homeContent = fs.readFileSync(homeFile, 'utf8');

// GNB 링크 치환
homeContent = homeContent.replace(
  'href="/blog" className="hover:text-[#191F28] transition-colors"',
  'href="/blog/" className="hover:text-[#191F28] transition-colors"'
);

// 카테고리 탭 목록 치환
homeContent = homeContent.replace('href: "/blog"', 'href: "/blog/"');
homeContent = homeContent.replace('href: "/blog?category=혜택"', 'href: "/blog/?category=혜택"');
homeContent = homeContent.replace('href: "/blog?category=행사"', 'href: "/blog/?category=행사"');
homeContent = homeContent.replace('href: "/blog?category=생활정보"', 'href: "/blog/?category=생활정보"');
homeContent = homeContent.replace('href: "/blog?category=핫이슈"', 'href: "/blog/?category=핫이슈"');
homeContent = homeContent.replace('href: "/blog?category=재테크"', 'href: "/blog/?category=재테크"');
homeContent = homeContent.replace('href: "/blog?category=연예인이슈"', 'href: "/blog/?category=연예인이슈"');

fs.writeFileSync(homeFile, homeContent, 'utf8');
console.log('HomeClient.tsx paths updated successfully!');


// 2. BlogListClient.tsx 파일 수정
const blogFile = 'c:/Users/cloud/Desktop/my-local-info-ck/src/components/BlogListClient.tsx';
let blogContent = fs.readFileSync(blogFile, 'utf8');

// GNB 링크 치환
blogContent = blogContent.replace(
  'href="/blog" className="text-[#3182F6]"',
  'href="/blog/" className="text-[#3182F6]"'
);

// 카테고리 탭 링크 치환
blogContent = blogContent.replace(
  'href={cat.key ? `/blog?category=${encodeURIComponent(cat.key)}` : "/blog"}',
  'href={cat.key ? `/blog/?category=${encodeURIComponent(cat.key)}` : "/blog/"}'
);

fs.writeFileSync(blogFile, blogContent, 'utf8');
console.log('BlogListClient.tsx paths updated successfully!');
