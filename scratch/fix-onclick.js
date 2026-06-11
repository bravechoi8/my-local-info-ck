import fs from 'fs';

// 1. HomeClient.tsx 수정
const homeFile = 'c:/Users/cloud/Desktop/my-local-info-ck/src/components/HomeClient.tsx';
let homeContent = fs.readFileSync(homeFile, 'utf8');

// 줄바꿈 정규화 (\r\n -> \n)
homeContent = homeContent.replace(/\r\n/g, '\n');

const homeTarget = `            ].map((cat) => (
              <a
                key={cat.key}
                href={cat.href}
                className="px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB] transition-all"
              >
                {cat.label}
              </a>`;

const homeReplacement = `            ].map((cat) => (
              <a
                key={cat.key}
                href={cat.href}
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = cat.href;
                }}
                className="px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB] transition-all"
              >
                {cat.label}
              </a>`;

if (homeContent.includes(homeTarget)) {
  homeContent = homeContent.replace(homeTarget, homeReplacement);
  fs.writeFileSync(homeFile, homeContent, 'utf8');
  console.log('HomeClient.tsx onClick handler added successfully!');
} else {
  console.log('HomeClient target not found. Make sure spelling is correct.');
}


// 2. BlogListClient.tsx 수정
const blogFile = 'c:/Users/cloud/Desktop/my-local-info-ck/src/components/BlogListClient.tsx';
let blogContent = fs.readFileSync(blogFile, 'utf8');

// 줄바꿈 정규화
blogContent = blogContent.replace(/\r\n/g, '\n');

const blogTarget = `            return (
              <a
                key={cat.key}
                href={cat.key ? \`/blog/?category=\${encodeURIComponent(cat.key)}\` : "/blog/"}
                className={\`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all \${
                  isActive
                    ? "bg-[#3182F6] text-white shadow-sm"
                    : "bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]"
                }\`}
              >
                {cat.label}
              </a>`;

const blogReplacement = `            return (
              <a
                key={cat.key}
                href={cat.key ? \`/blog/?category=\${encodeURIComponent(cat.key)}\` : "/blog/"}
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = cat.key ? \`/blog/?category=\${encodeURIComponent(cat.key)}\` : "/blog/";
                }}
                className={\`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all \${
                  isActive
                    ? "bg-[#3182F6] text-white shadow-sm"
                    : "bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]"
                }\`}
              >
                {cat.label}
              </a>`;

if (blogContent.includes(blogTarget)) {
  blogContent = blogContent.replace(blogTarget, blogReplacement);
  fs.writeFileSync(blogFile, blogContent, 'utf8');
  console.log('BlogListClient.tsx onClick handler added successfully!');
} else {
  console.log('BlogListClient target not found. Checking regex options...');
}
