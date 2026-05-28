import Link from 'next/link';
import { getAllPosts } from '@/lib/posts';

export default function BlogListPage() {
  const posts = getAllPosts();

  const getCategoryConfig = (category: string) => {
    switch (category) {
      case "행사":
        return { label: "축제·행사", text: "text-rose-600" };
      case "혜택":
        return { label: "지원금·혜택", text: "text-emerald-600" };
      case "핫이슈":
        return { label: "핫이슈", text: "text-orange-600" };
      case "재테크":
        return { label: "재테크", text: "text-[#3182F6]" };
      case "생활정보":
        return { label: "생활정보", text: "text-purple-600" };
      case "연예인이슈":
        return { label: "연예인이슈", text: "text-pink-600" };
      default:
        return { label: category, text: "text-slate-600" };
    }
  };

  const getFallbackImage = (cat: string) => {
    switch (cat) {
      case "행사":
        return "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80";
      case "혜택":
        return "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=800&q=80";
      case "핫이슈":
        return "https://images.unsplash.com/photo-1495020689067-958852a6565d?auto=format&fit=crop&w=800&q=80";
      case "재테크":
        return "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80";
      case "생활정보":
        return "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80";
      case "연예인이슈":
        return "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80";
      default:
        return "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=800&q=80";
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#333D4B] antialiased">
      {/* GNB (상단 네비게이션) - 토스 스타일 극도 미니멀 */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#F2F4F6] px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg sm:text-xl font-bold tracking-tight text-[#191F28] hover:text-[#3182F6] transition-colors">
              우리동네 소식통
            </span>
          </Link>
          <div className="flex items-center gap-6 text-sm font-semibold text-[#4E5968]">
            <Link href="/" className="hover:text-[#191F28] transition-colors">홈</Link>
            <Link href="/blog" className="text-[#3182F6]">블로그</Link>
            <Link href="/about" className="hover:text-[#191F28] transition-colors">소개</Link>
          </div>
        </div>
      </nav>

      {/* 헤더 섹션 - 여백이 넉넉하고 정돈된 타이틀 */}
      <header className="bg-white pt-20 pb-16 px-6">
        <div className="max-w-3xl mx-auto text-left space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#191F28] leading-tight">
            우리동네 블로그 소식
          </h1>
          <p className="text-base sm:text-lg text-[#4E5968] leading-relaxed max-w-xl">
            알찬 정부 혜택과 유용한 생활 정보, 우리 이웃들이 나누는 동네 이야기를 정리해 드립니다.
          </p>
        </div>
      </header>

      {/* 메인 콘텐츠 영역 */}
      <main className="max-w-3xl mx-auto px-6 pb-24">
        <div className="mb-8 text-xs sm:text-sm text-[#8B95A1] font-semibold">
          총 <span className="text-[#3182F6]">{posts.length}</span>개의 이야기가 있습니다.
        </div>

        {posts.length > 0 ? (
          <div className="border-t border-[#F2F4F6]">
            {posts.map((post) => {
              // 본문에서 첫 번째 마크다운 이미지 주소 추출
              const imgMatch = post.content.match(/!\[.*?\]\((.*?)\)/);
              const firstImg = imgMatch ? imgMatch[1] : null;
              const thumbnail = firstImg || getFallbackImage(post.category);
              const config = getCategoryConfig(post.category);

              return (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group flex items-start justify-between gap-6 py-8 border-b border-[#F2F4F6] transition-all"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${config.text}`}>
                        {config.label}
                      </span>
                    </div>
                    <h2 className="text-base sm:text-xl font-bold text-[#191F28] group-hover:text-[#3182F6] transition-colors leading-snug line-clamp-2">
                      {post.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#4E5968] leading-relaxed line-clamp-2">
                      {post.summary || '요약 내용이 없습니다.'}
                    </p>
                    <div className="text-[11px] sm:text-xs text-[#8B95A1] pt-1 font-medium">
                      {post.date.replace(/-/g, ".")}
                    </div>
                  </div>
                  
                  {/* 우측 썸네일 이미지 */}
                  <div className="w-20 h-20 sm:w-28 sm:h-28 overflow-hidden rounded-2xl bg-slate-50 border border-[#F2F4F6] relative shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={thumbnail} 
                      alt={post.title} 
                      className="absolute inset-0 h-full w-full object-cover group-hover:scale-102 transition-transform duration-500"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          /* 글 없음 표시 */
          <div className="text-center py-24 bg-[#F9FAFB] rounded-2xl border border-[#F2F4F6]">
            <span className="text-4xl inline-block mb-4">📭</span>
            <h3 className="text-base sm:text-lg font-bold text-[#191F28] mb-2">아직 등록된 이야기가 없습니다</h3>
            <p className="text-xs sm:text-sm text-[#8B95A1]">새로운 유용한 소식들이 곧 업데이트될 예정이니 기대해 주세요!</p>
          </div>
        )}
      </main>

      {/* 하단 푸터 */}
      <footer className="bg-[#F9FAFB] border-t border-[#F2F4F6] py-16 px-6">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left text-xs sm:text-sm text-[#8B95A1] font-medium">
          <div className="space-y-1">
            <p>공식 데이터 및 주요 핫이슈 소식을 기반으로 작동하는 블로그 채널입니다.</p>
            <p>© {new Date().getFullYear()} 우리동네 소식통. All rights reserved.</p>
          </div>
          <div className="text-xs font-semibold text-[#4E5968]">
            real-infos.com
          </div>
        </div>
      </footer>
    </div>
  );
}
