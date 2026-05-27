import Link from 'next/link';
import { getAllPosts } from '@/lib/posts';

export default function BlogListPage() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen bg-[#fafbfc] text-[#1e293b] font-sans antialiased">
      {/* GNB (상단 바) */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xl font-black tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              우리동네 소식통
            </Link>
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 rounded-md">
              용인시
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-slate-500">
            <Link href="/" className="hover:text-slate-900 transition-colors">홈</Link>
            <Link href="/blog" className="text-slate-900 font-semibold border-b-2 border-emerald-500 pb-1">블로그</Link>
            <Link href="/about" className="hover:text-slate-900 transition-colors">소개</Link>
          </div>
        </div>
      </nav>

      {/* 헤더 배너 */}
      <header className="bg-white py-16 px-6 border-b border-slate-100">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-full">
            ✍️ 소식통 매거진
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
            우리동네 블로그 소식
          </h1>
          <p className="text-sm sm:text-base text-slate-500 max-w-lg mx-auto leading-relaxed">
            용인시의 알찬 정보와 유용한 생활 가이드, 동네 사람들의 살아가는 이야기를 나누는 공간입니다.
          </p>
        </div>
      </header>

      {/* 메인 콘텐츠 영역 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 text-xs sm:text-sm text-slate-400">
          총 <span className="font-bold text-slate-700">{posts.length}</span>개의 글이 있습니다.
        </div>

        {posts.length > 0 ? (
          <div className="space-y-8">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="group flex flex-col justify-between bg-white rounded-2xl border border-slate-100 hover:border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_12px_40px_rgba(16,185,129,0.04)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden p-6 sm:p-8"
              >
                <div>
                  {/* 카테고리 & 작성일 */}
                  <div className="flex items-center gap-3 mb-4">
                    {post.category && (
                      <span className="px-2.5 py-0.5 text-xs font-bold rounded-md text-emerald-700 bg-emerald-50">
                        {post.category}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">{post.date}</span>
                  </div>

                  {/* 글 제목 */}
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 group-hover:text-emerald-600 transition-colors">
                    <Link href={`/blog/${post.slug}`}>
                      {post.title}
                    </Link>
                  </h2>

                  {/* 글 요약 (미리보기 텍스트로 지정된 summary 노출) */}
                  <p className="text-sm text-slate-500 leading-relaxed mb-6">
                    {post.summary || '요약 내용이 없습니다.'}
                  </p>
                </div>

                {/* 하단 영역: 태그 & 보러가기 링크 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-50">
                  <div className="flex flex-wrap gap-1.5">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-md"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    <span>글 읽기</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          /* 글 없음 표시 (기본 상태) */
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <span className="text-4xl inline-block mb-4">📭</span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">아직 등록된 블로그 글이 없습니다</h3>
            <p className="text-xs sm:text-sm text-slate-400">새로운 소식들이 곧 업데이트될 예정이니 기대해 주세요!</p>
          </div>
        )}
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
