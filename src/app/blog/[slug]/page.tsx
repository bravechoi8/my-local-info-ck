import Link from 'next/link';
import { getPostBySlug, getAllPosts } from '@/lib/posts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AdBanner from '@/components/AdBanner';
import CoupangBanner from '@/components/CoupangBanner';

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
      title: "글을 찾을 수 없습니다 | 리얼인포",
    };
  }

  return {
    title: `${post.title} | 리얼인포`,
    description: post.summary,
    keywords: post.tags,
    openGraph: {
      title: `${post.title} | 리얼인포`,
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
              <Link href="/" className="text-xl font-black tracking-tight text-[#191F28] hover:text-[#3182F6] transition-all">
                리얼인포
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
      "name": "리얼인포"
    },
    "publisher": {
      "@type": "Organization",
      "name": "리얼인포"
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
      {/* GNB (상단 네비게이션) - 토스 스타일 극도 미니멀 */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#F2F4F6] px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg sm:text-xl font-bold tracking-tight text-[#191F28] hover:text-[#3182F6] transition-colors">
              리얼인포
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm font-semibold text-[#4E5968]">
            <Link href="/" className="hover:text-[#191F28] transition-colors">홈</Link>
            <Link href="/blog" className="text-[#3182F6]">블로그</Link>
            <Link href="/about" className="hover:text-[#191F28] transition-colors">소개</Link>
            <Link href="/privacy" className="hover:text-[#191F28] transition-colors">개인정보처리방침 (Privacy)</Link>
            <Link href="/terms" className="hover:text-[#191F28] transition-colors">이용약관 (Terms)</Link>
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
          <div className="prose prose-slate max-w-none text-sm sm:text-base leading-relaxed text-slate-800 break-words">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code(props) {
                  const { children, className, ...rest } = props;
                  const match = /language-lotto/.test(className || '');
                  
                  if (match) {
                    const text = String(children).trim();
                    const lines = text.split('\n');
                    let round = '';
                    let nums: string[] = [];
                    let bonus = '';

                    lines.forEach(line => {
                      const cleanLine = line.trim();
                      if (cleanLine.startsWith('회차:')) {
                        round = cleanLine.replace('회차:', '').trim();
                      } else if (cleanLine.startsWith('번호:')) {
                        nums = cleanLine.replace('번호:', '').split(',').map(n => n.trim()).filter(Boolean);
                      } else if (cleanLine.startsWith('보너스:')) {
                        bonus = cleanLine.replace('보너스:', '').trim();
                      }
                    });

                    // 만약 특정 규격이 아닐 경우 예외 처리
                    if (nums.length === 0) {
                      const parts = text.split('+');
                      nums = parts[0] ? parts[0].split(',').map(n => n.trim()).filter(Boolean) : [];
                      bonus = parts[1] ? parts[1].trim() : '';
                    }

                    const getBallColor = (numStr: string) => {
                      const num = parseInt(numStr, 10);
                      if (isNaN(num)) return 'bg-slate-400 text-white';
                      if (num >= 1 && num <= 10) return 'bg-[#f2a93b] text-white shadow-[0_4px_10px_rgba(242,169,59,0.3)]';
                      if (num >= 11 && num <= 20) return 'bg-[#3b82f6] text-white shadow-[0_4px_10px_rgba(59,130,246,0.3)]';
                      if (num >= 21 && num <= 30) return 'bg-[#ef4444] text-white shadow-[0_4px_10px_rgba(239,68,68,0.3)]';
                      if (num >= 31 && num <= 40) return 'bg-[#6b7280] text-white shadow-[0_4px_10px_rgba(107,114,128,0.3)]';
                      if (num >= 41 && num <= 45) return 'bg-[#10b981] text-white shadow-[0_4px_10px_rgba(16,185,129,0.3)]';
                      return 'bg-slate-400 text-white';
                    };

                    return (
                      <div className="not-prose my-8 p-6 sm:p-8 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center justify-center gap-6 shadow-sm">
                        {round && (
                          <div className="text-xs sm:text-sm font-bold text-slate-500 tracking-wider bg-slate-100 px-3 py-1 rounded-full">
                            제 {round} 당첨번호
                          </div>
                        )}
                        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
                            {nums.map((num, idx) => (
                              <span
                                key={idx}
                                className={`inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full text-base sm:text-lg font-black border border-white/10 ${getBallColor(num)}`}
                              >
                                {num}
                              </span>
                            ))}
                          </div>
                          
                          {bonus && (
                            <>
                              <span className="text-slate-400 font-bold text-lg sm:text-xl px-1">＋</span>
                              <div className="flex flex-col items-center gap-1">
                                <span
                                  className={`inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full text-base sm:text-lg font-black border border-white/10 ${getBallColor(bonus)}`}
                                >
                                  {bonus}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                        {bonus && (
                          <div className="text-[11px] sm:text-xs text-slate-400 font-medium">
                            보너스 번호: {bonus}
                          </div>
                        )}
                      </div>
                    );
                  }
                  
                  return (
                    <code className={className} {...rest}>
                      {children}
                    </code>
                  );
                }
              }}
            >
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
          <AdBanner />
          <CoupangBanner />
        </article>
      </main>

      {/* 하단 푸터 */}
      <footer className="bg-[#F9FAFB] border-t border-[#F2F4F6] py-16 px-6 mt-24">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left text-xs sm:text-sm text-[#8B95A1] font-medium">
          <div className="space-y-2">
            <p>공식 데이터 및 주요 핫이슈 소식을 기반으로 작동하는 블로그 채널입니다.</p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-1 text-xs text-[#8B95A1]">
              <Link href="/privacy" className="hover:underline font-semibold">개인정보처리방침 (Privacy Policy)</Link>
              <span className="text-[#E5E8EB]">|</span>
              <Link href="/terms" className="hover:underline font-semibold">이용약관 (Terms of Service)</Link>
            </div>
            <p>© {new Date().getFullYear()} 리얼인포. All rights reserved.</p>
          </div>
          <div className="text-xs font-semibold text-[#4E5968]">
            real-infos.com
          </div>
        </div>
      </footer>
    </div>
  );
}
