import Link from 'next/link';
import { getPostBySlug, getAllPosts } from '@/lib/posts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import type { Metadata } from 'next';
import fs from 'fs';
import path from 'path';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: "글을 찾을 수 없습니다 | 용인시 생활 정보",
    };
  }

  return {
    title: `${post.title} | 용인시 생활 정보`,
    description: post.summary,
    openGraph: {
      title: `${post.title} | 용인시 생활 정보`,
      description: post.summary,
      url: `https://real-infos.com/blog/${slug}`,
      type: "article",
      publishedTime: post.date,
    },
  };
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  if (posts.length === 0) {
    // 마크다운 파일이 전혀 없는 경우에도 빌드가 가능하도록 임시 빈 경로를 제공합니다.
    return [{ slug: 'empty' }];
  }
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  let sourceLink = null;
  if (post) {
    const dataFilePath = path.join(process.cwd(), 'public/data/local-info.json');
    if (fs.existsSync(dataFilePath)) {
      try {
        const localData = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
        const matchedItem = localData.find((item: any) => {
          const itemName = item.name || item.title || '';
          return itemName && (post.title.includes(itemName) || post.content.includes(itemName));
        });
        if (matchedItem && matchedItem.link && matchedItem.link !== '#') {
          sourceLink = matchedItem.link;
        }
      } catch (e) {
        console.error(e);
      }
    }
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#fafbfc] text-[#1e293b] font-sans antialiased">
        {/* GNB */}
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/" className="text-xl font-black tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                우리동네 소식통
              </Link>
            </div>
            <div className="flex items-center gap-6 text-sm font-medium text-slate-500">
              <Link href="/" className="hover:text-slate-900 transition-colors">홈</Link>
              <Link href="/blog" className="hover:text-slate-900 transition-colors">블로그</Link>
            </div>
          </div>
        </nav>

        <main className="max-w-xl mx-auto px-6 py-24 text-center space-y-6">
          <span className="text-6xl">🔍</span>
          <h1 className="text-2xl font-bold text-slate-900">해당 글을 찾을 수 없습니다</h1>
          <p className="text-sm text-slate-500">
            주소가 잘못되었거나 삭제된 글일 수 있습니다. 목록으로 돌아가서 다른 글을 확인해 보세요.
          </p>
          <div className="pt-4">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl text-white bg-emerald-500 hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/10"
            >
              블로그 목록으로 이동
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const blogPostingSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "datePublished": post.date,
    "description": post.summary,
    "author": {
      "@type": "Organization",
      "name": "용인시 생활 정보"
    },
    "publisher": {
      "@type": "Organization",
      "name": "용인시 생활 정보"
    }
  };

  const detailedBreadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "홈",
        "item": "https://real-infos.com"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "블로그",
        "item": "https://real-infos.com/blog"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": post.title,
        "item": `https://real-infos.com/blog/${slug}`
      }
    ]
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] text-[#1e293b] font-sans antialiased">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(detailedBreadcrumbSchema) }}
      />
      {/* GNB (상단 바) */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xl font-black tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              우리동네 소식통
            </Link>
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 rounded-md">
              성남시
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-slate-500">
            <Link href="/" className="hover:text-slate-900 transition-colors">홈</Link>
            <Link href="/blog" className="text-slate-900 font-semibold border-b-2 border-emerald-500 pb-1">블로그</Link>
            <Link href="/about" className="hover:text-slate-900 transition-colors">소개</Link>
          </div>
        </div>
      </nav>

      {/* 메인 콘텐츠 영역 */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 뒤로 가기 링크 */}
        <div className="mb-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
            <span>목록으로 돌아가기</span>
          </Link>
        </div>

        {/* 글 헤더 */}
        <header className="border-b border-slate-100 pb-8 mb-8 space-y-4">
          <div className="flex items-center gap-3">
            {post.category && (
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-md text-emerald-700 bg-emerald-50">
                {post.category}
              </span>
            )}
            <span className="text-xs text-slate-400">최종 업데이트: {post.date}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 leading-tight">
            {post.title}
          </h1>
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-md"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* 글 본문 (Markdown & Typography) */}
        <article className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.01)]">
          {/* @tailwindcss/typography의 prose 클래스를 활용해 마크다운 스타일을 예쁘게 정렬합니다. */}
          <div className="prose prose-slate max-w-none text-sm sm:text-base leading-relaxed text-slate-800">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.content}
            </ReactMarkdown>
          </div>

          {/* 출처 명시 및 AI 생성 정보 안내 */}
          <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
            {sourceLink && (
              <div className="text-xs sm:text-sm">
                <span className="font-semibold text-slate-600">원문 출처: </span>
                <a
                  href={sourceLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:text-emerald-700 underline font-medium break-all"
                >
                  {sourceLink}
                </a>
              </div>
            )}
            <p className="text-[11px] sm:text-xs text-slate-400 bg-slate-50 p-4 rounded-xl leading-relaxed border border-slate-100">
              이 글은 공공데이터포털(data.go.kr)의 정보를 바탕으로 AI가 작성하였습니다. 정확한 내용은 원문 링크를 통해 확인해주세요.
            </p>
          </div>
        </article>
      </main>

      {/* 하단 푸터 영역 */}
      <footer className="mt-24 bg-white border-t border-slate-100 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="space-y-1.5 text-xs text-slate-400">
            <p>공공데이터포털(data.go.kr)에 공개된 공식 데이터를 기반으로 작동하는 정보 채널입니다.</p>
          </div>
          <div className="text-xs font-semibold text-slate-500">
            © {new Date().getFullYear()} 우리동네 소식통. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
