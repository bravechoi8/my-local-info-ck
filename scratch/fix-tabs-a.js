import fs from 'fs';

const filePath = 'c:/Users/cloud/Desktop/my-local-info-ck/src/components/HomeClient.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 줄바꿈이 CRLF(\r\n)이든 LF(\n)이든 매칭되도록 정규식 활용
const regex = /<Link\s+key=\{cat\.key\}\s+href=\{cat\.href\}\s+className="px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-\[\#F2F4F6\] text-\[\#4E5968\] hover:bg-\[\#E5E8EB\] transition-all"\s*>\s*\{cat\.label\}\s*<\/Link>/g;

if (regex.test(content)) {
  const replacement = `<a
                key={cat.key}
                href={cat.href}
                className="px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB] transition-all"
              >
                {cat.label}
              </a>`;
  content = content.replace(regex, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully replaced Link with a tag in HomeClient.tsx!');
} else {
  console.log('HomeClient regex target not found. Checking exact string matching...');
  // 정적 문자열로 2차 시도
  const targetStr = `              <Link
                key={cat.key}
                href={cat.href}
                className="px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB] transition-all"
              >
                {cat.label}
              </Link>`;
  const replacementStr = `              <a
                key={cat.key}
                href={cat.href}
                className="px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB] transition-all"
              >
                {cat.label}
              </a>`;
  
  // \r\n과 \n 차이 보정을 위해 전체 줄바꿈을 \n으로 변환 후 치환하고 다시 저장
  const normalizedContent = content.replace(/\r\n/g, '\n');
  if (normalizedContent.includes(targetStr)) {
    const newContent = normalizedContent.replace(targetStr, replacementStr);
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('Successfully replaced Link with a tag via normalization!');
  } else {
    console.log('Failed to find matching target in HomeClient.tsx.');
  }
}
