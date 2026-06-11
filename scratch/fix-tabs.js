import fs from 'fs';
import path from 'path';

const filePath = 'c:/Users/cloud/Desktop/my-local-info-ck/src/components/HomeClient.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const target = `          {/* 카테고리 탭 UI */}
          <div className="flex flex-wrap gap-2 pt-2 border-b border-[#F2F4F6] pb-6">
            {[
              { key: "", label: "전체", href: "/blog" },
              { key: "혜택", label: "지원금·혜택", href: "/blog?category=혜택" },
              { key: "행사", label: "축제·행사", href: "/blog?category=행사" },
              { key: "생활정보", label: "생활정보", href: "/blog?category=생활정보" },
              { key: "핫이슈", label: "핫이슈", href: "/blog?category=핫이슈" },
              { key: "재테크", label: "재테크", href: "/blog?category=재테크" },
              { key: "연예인이슈", label: "연예인이슈", href: "/blog?category=연예인이슈" },
            ].map((cat) => (
              <a
                key={cat.key}
                href={cat.href}
                className="px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB] transition-all"
              >
                {cat.label}
              </a>
            ))}
          </div>category=행사" },
              { key: "생활정보", label: "생활정보", href: "/blog?category=생활정보" },
              { key: "핫이슈", label: "핫이슈", href: "/blog?category=핫이슈" },
              { key: "재테크", label: "재테크", href: "/blog?category=재테크" },
              { key: "연예인이슈", label: "연예인이슈", href: "/blog?category=연예인이슈" },
            ].map((cat) => (
              <Link
                key={cat.key}
                href={cat.href}
                className="px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB] transition-all"
              >
                {cat.label}
              </Link>
            ))}
          </div>`;

const replacement = `          {/* 카테고리 탭 UI */}
          <div className="flex flex-wrap gap-2 pt-2 border-b border-[#F2F4F6] pb-6">
            {[
              { key: "", label: "전체", href: "/blog" },
              { key: "혜택", label: "지원금·혜택", href: "/blog?category=혜택" },
              { key: "행사", label: "축제·행사", href: "/blog?category=행사" },
              { key: "생활정보", label: "생활정보", href: "/blog?category=생활정보" },
              { key: "핫이슈", label: "핫이슈", href: "/blog?category=핫이슈" },
              { key: "재테크", label: "재테크", href: "/blog?category=재테크" },
              { key: "연예인이슈", label: "연예인이슈", href: "/blog?category=연예인이슈" },
            ].map((cat) => (
              <Link
                key={cat.key}
                href={cat.href}
                className="px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB] transition-all"
              >
                {cat.label}
              </Link>
            ))}
          </div>`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully fixed the categories tabs issue!');
} else {
  console.log('Target content not found. Check if already replaced or string mismatch.');
}
