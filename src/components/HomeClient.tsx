"use client";

import { useState } from "react";
import Link from "next/link";
import localData from "../../public/data/local-info.json";
import AdBanner from "@/components/AdBanner";
import type { PostData } from "@/lib/posts";
import DarkModeToggle from "@/components/DarkModeToggle";

interface HomeClientProps {
  posts: PostData[];
}

export default function HomeClient({ posts }: HomeClientProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // 날짜 형식 예쁘게 변환 (YYYY-MM-DD -> YYYY.MM.DD)
  const formatDate = (dateStr: string) => {
    return dateStr.replace(/-/g, ".");
  };

  // 블로그 글 썸네일 이미지 추출
  const mappedPosts = posts.map((post) => {
    // 본문에서 첫 번째 마크다운 이미지 주소 추출
    const imgMatch = post.content.match(/!\[.*?\]\((.*?)\)/);
    const firstImg = imgMatch ? imgMatch[1] : null;

    // 카테고리별 기본 이미지 매핑
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

    return {
      slug: post.slug,
      title: post.title,
      summary: post.summary,
      category: post.category,
      date: post.date,
      thumbnail: firstImg || getFallbackImage(post.category),
    };
  });

  // 검색 결과 필터링
  const getFilteredPosts = (items: typeof mappedPosts) => {
    if (!searchQuery) return items;
    return items.filter(
      (post) =>
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.summary.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getCategoryConfig = (category: string) => {
    switch (category) {
      case "행사":
        return { label: "축제·행사", text: "text-rose-600", border: "border-rose-100", bg: "bg-rose-50" };
      case "혜택":
        return { label: "지원금·혜택", text: "text-emerald-600", border: "border-emerald-100", bg: "bg-emerald-50" };
      case "핫이슈":
        return { label: "핫이슈", text: "text-orange-600", border: "border-orange-100", bg: "bg-orange-50" };
      case "재테크":
        return { label: "재테크", text: "text-[#3182F6]", border: "border-blue-100", bg: "bg-blue-50" };
      case "생활정보":
        return { label: "생활정보", text: "text-purple-600", border: "border-purple-100", bg: "bg-purple-50" };
      case "연예인이슈":
        return { label: "연예인이슈", text: "text-pink-600", border: "border-pink-100", bg: "bg-pink-50" };
      default:
        return { label: category, text: "text-slate-600", border: "border-slate-100", bg: "bg-slate-50" };
    }
  };

  // 1. 오늘의 추천 핫이슈 (가장 최신 핫이슈 1개)
  const hotIssuePosts = mappedPosts.filter((p) => p.category === "핫이슈");
  const heroPost = hotIssuePosts.length > 0 ? hotIssuePosts[0] : mappedPosts[0];

  // 2. 지원금 & 혜택 목록 (최신 3개)
  const benefitSectionPosts = getFilteredPosts(mappedPosts.filter((p) => p.category === "혜택" && p.slug !== heroPost?.slug)).slice(0, 3);

  // 3. 축제 & 행사 목록 (최신 3개)
  const eventSectionPosts = getFilteredPosts(mappedPosts.filter((p) => p.category === "행사" && p.slug !== heroPost?.slug)).slice(0, 3);

  // 4. 알뜰 생활정보 목록 (최신 3개)
  const infoSectionPosts = getFilteredPosts(mappedPosts.filter((p) => p.category === "생활정보" && p.slug !== heroPost?.slug)).slice(0, 3);

  // 5. 돈이 되는 재테크 목록 (최신 3개)
  const financeSectionPosts = getFilteredPosts(mappedPosts.filter((p) => p.category === "재테크" && p.slug !== heroPost?.slug)).slice(0, 3);

  // 6. 연예인 이슈 목록 (최신 3개)
  const celebSectionPosts = getFilteredPosts(mappedPosts.filter((p) => p.category === "연예인이슈" && p.slug !== heroPost?.slug)).slice(0, 3);

  const searchResults = getFilteredPosts(mappedPosts);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0B0F19] text-[#333D4B] dark:text-[#E5E8EB] antialiased transition-colors duration-300">
      {/* GNB (상단 네비게이션) - 토스 스타일 극도 미니멀 & 유리모피즘 */}
      <nav className="sticky top-0 z-50 bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-md border-b border-[#F2F4F6] dark:border-slate-800/80 px-6 py-5 transition-colors">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg sm:text-xl font-bold tracking-tight text-[#191F28] dark:text-[#F3F4F6] hover:text-[#3182F6] dark:hover:text-[#3182F6] transition-colors">
              리얼인포
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm font-semibold text-[#4E5968] dark:text-[#8B95A1]">
              <Link href="/" className="text-[#3182F6]">홈</Link>
              <Link href="/blog/" className="hover:text-[#191F28] dark:hover:text-[#F3F4F6] transition-colors">블로그</Link>
              <Link href="/about" className="hover:text-[#191F28] dark:hover:text-[#F3F4F6] transition-colors">소개</Link>
              <Link href="/privacy" className="hover:text-[#191F28] dark:hover:text-[#F3F4F6] hidden md:inline transition-colors">개인정보처리방침</Link>
              <Link href="/terms" className="hover:text-[#191F28] dark:hover:text-[#F3F4F6] hidden md:inline transition-colors">이용약관</Link>
            </div>
            <DarkModeToggle />
          </div>
        </div>
      </nav>

      {/* 헤더 섹션 - 여백이 넉넉하고 정돈된 타이틀 */}
      <header className="bg-transparent pt-16 pb-8 px-6">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#191F28] dark:text-[#F3F4F6] leading-tight">
                오늘의 리얼인포
              </h1>
              <p className="text-base sm:text-lg text-[#4E5968] dark:text-[#8B95A1] leading-relaxed max-w-xl">
                정부 지원금 혜택부터 생활 꿀팁, 화제의 핫이슈까지 섹션별로 골라보세요.
              </p>
            </div>

            {/* 검색 바 */}
            <div className="relative w-full md:max-w-xs shrink-0">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <svg className="w-4 h-4 text-[#8B95A1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="궁금한 정보 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-[#F9FAFB] dark:bg-slate-800/50 border border-[#F2F4F6] dark:border-slate-800/80 rounded-xl focus:outline-none focus:border-[#3182F6] focus:ring-1 focus:ring-[#3182F6] text-[#191F28] dark:text-[#F3F4F6] placeholder-[#8B95A1] transition-all"
              />
            </div>
          </div>

          {/* 카테고리 탭 UI */}
          <div className="flex flex-wrap gap-2 pt-2 border-b border-[#F2F4F6] dark:border-slate-800/80 pb-6">
            {[
              { key: "", label: "전체", href: "/blog/" },
              { key: "혜택", label: "지원금·혜택", href: "/blog/?category=혜택" },
              { key: "행사", label: "축제·행사", href: "/blog/?category=행사" },
              { key: "생활정보", label: "생활정보", href: "/blog/?category=생활정보" },
              { key: "핫이슈", label: "핫이슈", href: "/blog/?category=핫이슈" },
              { key: "재테크", label: "재테크", href: "/blog/?category=재테크" },
              { key: "연예인이슈", label: "연예인이슈", href: "/blog/?category=연예인이슈" },
            ].map((cat) => (
              <a
                key={cat.key}
                href={cat.href}
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = cat.href;
                }}
                className="px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-[#F2F4F6] dark:bg-slate-800/80 text-[#4E5968] dark:text-slate-300 hover:bg-[#E5E8EB] dark:hover:bg-slate-700 transition-all cursor-pointer"
              >
                {cat.label}
              </a>
            ))}
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 영역 */}
      <main className="max-w-5xl mx-auto px-6 pb-24">
        {searchQuery ? (
          /* 검색 모드 활성화 시 검색 결과만 리스트업 */
          <div className="space-y-8">
            <div className="text-sm text-[#4E5968] dark:text-[#8B95A1] font-semibold">
              &apos;{searchQuery}&apos; 검색 결과 총 <span className="text-[#3182F6]">{searchResults.length}</span>건
            </div>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
                {searchResults.map((post) => {
                  const config = getCategoryConfig(post.category);
                  return (
                    <Link
                      key={post.slug}
                      href={`/blog/${post.slug}`}
                      className="group flex flex-col justify-between bg-white dark:bg-slate-900 border border-[#F2F4F6] dark:border-slate-800/80 rounded-2xl overflow-hidden hover:-translate-y-1.5 hover:shadow-lg dark:hover:shadow-2xl dark:hover:shadow-slate-950/50 transition-all duration-300"
                    >
                      <div className="space-y-4 p-4">
                        <div className="aspect-[16/10] w-full overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-800 border border-[#F2F4F6] dark:border-slate-800/80 relative">
                          <img
                            src={post.thumbnail}
                            alt={post.title}
                            className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <span className={`inline-block text-xs font-semibold ${config.text}`}>
                            {config.label}
                          </span>
                          <h3 className="text-base sm:text-lg font-bold text-[#191F28] dark:text-[#F3F4F6] group-hover:text-[#3182F6] dark:group-hover:text-[#3182F6] transition-colors leading-snug line-clamp-2">
                            {post.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-[#4E5968] dark:text-[#8B95A1] leading-relaxed line-clamp-2">
                            {post.summary}
                          </p>
                          <div className="text-[11px] sm:text-xs text-[#8B95A1] pt-1 font-medium">
                            {formatDate(post.date)}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-24 bg-[#F9FAFB] dark:bg-slate-900 rounded-2xl border border-[#F2F4F6] dark:border-slate-800/80">
                <span className="text-4xl inline-block mb-4">🔍</span>
                <h3 className="text-base sm:text-lg font-bold text-[#191F28] dark:text-[#F3F4F6] mb-2">검색 결과가 없습니다</h3>
                <p className="text-xs sm:text-sm text-[#8B95A1]">다른 키워드로 검색해 보세요.</p>
              </div>
            )}
          </div>
        ) : (
          /* 포털형 첫 페이지 레이아웃 (정상 모드) */
          <div className="space-y-20">
            {/* 테토-에겐, 로또, 룰렛 배너 영역 */}
            <div className="max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 테토-에겐 성격 유형 테스트 배너 */}
              <section className="group bg-gradient-to-br from-[#FFEAE4] to-[#F0EDFF] dark:from-[#2E1F1A] dark:to-[#1C1A3A] rounded-2xl p-5 border border-[#ebe4d9] dark:border-slate-800/80 flex flex-col justify-between gap-4 h-full hover:-translate-y-1.5 hover:shadow-[0_12px_30px_rgba(216,90,48,0.08)] dark:hover:shadow-[0_12px_30px_rgba(0,0,0,0.5)] transition-all duration-300">
                <div className="space-y-2">
                  <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-slate-800 text-[#d85a30] border border-[#f5c4b3] dark:border-[#d85a30]/30 transition-colors">
                    호르몬 기반 성격 테스트
                  </span>
                  <h2 className="text-base sm:text-lg font-extrabold text-[#2b2722] dark:text-[#F3F4F6] leading-tight">
                    나는 테토(Teto)일까, 에겐(Egen)일까?
                  </h2>
                  <p className="text-[11px] text-[#7a7268] dark:text-[#8B95A1]">
                    12가지 질문으로 나의 진짜 호르몬 성향을 알아보세요!
                  </p>
                </div>
                <div className="flex justify-end pt-1">
                  <Link
                    href="/teto-egen-test"
                    className="px-3.5 py-2 bg-[#1d1d1b] dark:bg-[#3182F6] text-white text-[11px] font-bold rounded-xl group-hover:scale-[1.03] dark:group-hover:bg-[#1b64da] transition-all shadow-sm whitespace-nowrap"
                  >
                    테스트 시작하기 &rarr;
                  </Link>
                </div>
              </section>

              {/* AI 로또번호 자동 생성기 배너 */}
              <section className="group bg-gradient-to-br from-[#EBF3FF] to-[#E8F0FB] dark:from-[#1E293B]/40 dark:to-[#0F172A]/40 rounded-2xl p-5 border border-[#d9e2eb] dark:border-slate-800/80 flex flex-col justify-between gap-4 h-full hover:-translate-y-1.5 hover:shadow-[0_12px_30px_rgba(49,130,246,0.08)] dark:hover:shadow-[0_12px_30px_rgba(0,0,0,0.5)] transition-all duration-300">
                <div className="space-y-2">
                  <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-slate-800 text-[#3182F6] border border-[#d2e2fa] dark:border-[#3182F6]/30 transition-colors">
                    당첨 통계 기반 분석
                  </span>
                  <h2 className="text-base sm:text-lg font-extrabold text-[#191F28] dark:text-[#F3F4F6] leading-tight">
                    AI 로또번호 자동 생성기
                  </h2>
                  <p className="text-[11px] text-[#4E5968] dark:text-[#8B95A1]">
                    역대 1등 당첨번호 통계 가중치를 활용해 번호를 예측합니다.
                  </p>
                </div>
                <div className="flex justify-end pt-1">
                  <Link
                    href="/lotto"
                    className="px-3.5 py-2 bg-[#3182F6] text-white text-[11px] font-bold rounded-xl group-hover:scale-[1.03] hover:bg-[#1b64da] transition-all shadow-sm whitespace-nowrap"
                  >
                    행운번호 받기 &rarr;
                  </Link>
                </div>
              </section>

              {/* 술값 계산 복불복 룰렛 배너 */}
              <section className="group bg-gradient-to-br from-[#FFF0F0] to-[#FFE4E4] dark:from-[#2D1B1E] dark:to-[#1A1112] rounded-2xl p-5 border border-[#ffd5d6] dark:border-slate-800/80 flex flex-col justify-between gap-4 h-full hover:-translate-y-1.5 hover:shadow-[0_12px_30px_rgba(240,68,82,0.08)] dark:hover:shadow-[0_12px_30px_rgba(0,0,0,0.5)] transition-all duration-300">
                <div className="space-y-2">
                  <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-slate-800 text-[#F04452] border border-[#ffd5d6] dark:border-[#F04452]/30 transition-colors">
                    모임·술자리 게임
                  </span>
                  <h2 className="text-base sm:text-lg font-extrabold text-[#191F28] dark:text-[#F3F4F6] leading-tight">
                    술값 계산 복불복 룰렛
                  </h2>
                  <p className="text-[11px] text-[#4E5968] dark:text-[#8B95A1]">
                    오늘 술값이나 밥값을 계산할 사람을 룰렛으로 결정합니다!
                  </p>
                </div>
                <div className="flex justify-end pt-1">
                  <Link
                    href="/roulette"
                    className="px-3.5 py-2 bg-[#1d1d1b] dark:bg-slate-800 text-white text-[11px] font-bold rounded-xl group-hover:scale-[1.03] hover:bg-black dark:hover:bg-slate-700 transition-all shadow-sm whitespace-nowrap"
                  >
                    룰렛 돌리기 &rarr;
                  </Link>
                </div>
              </section>
            </div>

            {/* 1. 최상단 히어로 추천 영역 */}
            {heroPost && (
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-[#8B95A1] uppercase tracking-wider">TODAY&apos;S HOT ISSUE</h2>
                  <Link href="/blog?category=핫이슈" className="text-xs sm:text-sm font-semibold text-[#3182F6] hover:underline">더보기 &rarr;</Link>
                </div>
                <Link
                  href={`/blog/${heroPost.slug}`}
                  className="group block overflow-hidden rounded-3xl border border-[#F2F4F6] dark:border-slate-800 bg-white dark:bg-slate-900 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)] transition-all duration-300"
                >
                  <div className="flex flex-col lg:flex-row items-stretch">
                    <div className="flex-1 p-8 sm:p-12 flex flex-col justify-between">
                      <div className="space-y-4">
                        <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded ${getCategoryConfig(heroPost.category).bg} ${getCategoryConfig(heroPost.category).text}`}>
                          {getCategoryConfig(heroPost.category).label}
                        </span>
                        <h2 className="text-xl sm:text-3xl font-extrabold text-[#191F28] dark:text-[#F3F4F6] group-hover:text-[#3182F6] dark:group-hover:text-[#3182F6] transition-colors leading-tight line-clamp-2">
                          {heroPost.title}
                        </h2>
                        <p className="text-sm sm:text-base text-[#4E5968] dark:text-[#8B95A1] leading-relaxed line-clamp-3">
                          {heroPost.summary}
                        </p>
                      </div>
                      <div className="mt-8 text-xs sm:text-sm text-[#8B95A1] font-medium">
                        {formatDate(heroPost.date)}
                      </div>
                    </div>
                    <div className="lg:w-1/2 min-h-[220px] sm:min-h-[320px] relative overflow-hidden bg-slate-50 dark:bg-slate-800">
                      <img 
                        src={heroPost.thumbnail} 
                        alt={heroPost.title} 
                        className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>
                </Link>
              </section>
            )}

            {/* 2. 돈이 되는 지원금 & 혜택 존 */}
            {benefitSectionPosts.length > 0 && (
              <div className="space-y-10">
                <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl sm:text-2xl font-bold text-[#191F28] dark:text-[#F3F4F6] flex items-center gap-2">
                      <span className="text-2xl">💰</span> 놓치기 쉬운 지원금 · 혜택
                    </h2>
                    <Link href="/blog?category=혜택" className="text-xs sm:text-sm font-semibold text-[#3182F6] hover:underline">더보기 &rarr;</Link>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {benefitSectionPosts.map((post) => (
                      <Link
                        key={post.slug}
                        href={`/blog/${post.slug}`}
                        className="group block space-y-4 hover:-translate-y-1 transition-transform duration-300"
                      >
                        <div className="aspect-[16/10] w-full overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-800 border border-[#F2F4F6] dark:border-slate-800/80 relative">
                          <img src={post.thumbnail} alt={post.title} className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-sm sm:text-base font-bold text-[#191F28] dark:text-[#F3F4F6] group-hover:text-[#3182F6] dark:group-hover:text-[#3182F6] transition-colors leading-snug line-clamp-2">
                            {post.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-[#8B95A1] line-clamp-1">{post.summary}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
                <AdBanner />
              </div>
            )}

            {/* 3. 주말 나들이 축제 & 행사 존 */}
            {eventSectionPosts.length > 0 && (
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl sm:text-2xl font-bold text-[#191F28] dark:text-[#F3F4F6] flex items-center gap-2">
                    <span className="text-2xl">🎈</span> 주말 여행 & 가볼 만한 축제
                  </h2>
                  <Link href="/blog?category=행사" className="text-xs sm:text-sm font-semibold text-[#3182F6] hover:underline">더보기 &rarr;</Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {eventSectionPosts.map((post) => (
                    <Link
                      key={post.slug}
                      href={`/blog/${post.slug}`}
                      className="group block space-y-4 hover:-translate-y-1 transition-transform duration-300"
                    >
                      <div className="aspect-[16/10] w-full overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-800 border border-[#F2F4F6] dark:border-slate-800/80 relative">
                        <img src={post.thumbnail} alt={post.title} className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm sm:text-base font-bold text-[#191F28] dark:text-[#F3F4F6] group-hover:text-[#3182F6] dark:group-hover:text-[#3182F6] transition-colors leading-snug line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#8B95A1] line-clamp-1">{post.summary}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* 4. 알뜰 생활정보 존 */}
            {infoSectionPosts.length > 0 && (
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl sm:text-2xl font-bold text-[#191F28] dark:text-[#F3F4F6] flex items-center gap-2">
                    <span className="text-2xl">💡</span> 유용한 알뜰 생활정보
                  </h2>
                  <Link href="/blog?category=생활정보" className="text-xs sm:text-sm font-semibold text-[#3182F6] hover:underline">더보기 &rarr;</Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {infoSectionPosts.map((post) => (
                    <Link
                      key={post.slug}
                      href={`/blog/${post.slug}`}
                      className="group block space-y-4 hover:-translate-y-1 transition-transform duration-300"
                    >
                      <div className="aspect-[16/10] w-full overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-800 border border-[#F2F4F6] dark:border-slate-800/80 relative">
                        <img src={post.thumbnail} alt={post.title} className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm sm:text-base font-bold text-[#191F28] dark:text-[#F3F4F6] group-hover:text-[#3182F6] dark:group-hover:text-[#3182F6] transition-colors leading-snug line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#8B95A1] line-clamp-1">{post.summary}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* 5. 돈이 되는 재테크 존 */}
            {financeSectionPosts.length > 0 && (
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl sm:text-2xl font-bold text-[#191F28] dark:text-[#F3F4F6] flex items-center gap-2">
                    <span className="text-2xl">📈</span> 돈이 되는 재테크 정보
                  </h2>
                  <Link href="/blog?category=재테크" className="text-xs sm:text-sm font-semibold text-[#3182F6] hover:underline">더보기 &rarr;</Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {financeSectionPosts.map((post) => (
                    <Link
                      key={post.slug}
                      href={`/blog/${post.slug}`}
                      className="group block space-y-4 hover:-translate-y-1 transition-transform duration-300"
                    >
                      <div className="aspect-[16/10] w-full overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-800 border border-[#F2F4F6] dark:border-slate-800/80 relative">
                        <img src={post.thumbnail} alt={post.title} className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm sm:text-base font-bold text-[#191F28] dark:text-[#F3F4F6] group-hover:text-[#3182F6] dark:group-hover:text-[#3182F6] transition-colors leading-snug line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#8B95A1] line-clamp-1">{post.summary}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* 5. 연예인 핫이슈 & 뉴스 존 */}
            {celebSectionPosts.length > 0 && (
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl sm:text-2xl font-bold text-[#191F28] dark:text-[#F3F4F6] flex items-center gap-2">
                    <span className="text-2xl">⭐</span> 연예인 이슈 & 소식
                  </h2>
                  <Link href="/blog?category=연예인이슈" className="text-xs sm:text-sm font-semibold text-[#3182F6] hover:underline">더보기 &rarr;</Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {celebSectionPosts.map((post) => (
                    <Link
                      key={post.slug}
                      href={`/blog/${post.slug}`}
                      className="group block space-y-4 hover:-translate-y-1 transition-transform duration-300"
                    >
                      <div className="aspect-[16/10] w-full overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-800 border border-[#F2F4F6] dark:border-slate-800/80 relative">
                        <img src={post.thumbnail} alt={post.title} className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm sm:text-base font-bold text-[#191F28] dark:text-[#F3F4F6] group-hover:text-[#3182F6] dark:group-hover:text-[#3182F6] transition-colors leading-snug line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#8B95A1] line-clamp-1">{post.summary}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* 하단 푸터 */}
      <footer className="bg-[#F9FAFB] dark:bg-[#080C14] border-t border-[#F2F4F6] dark:border-slate-800/80 py-16 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left text-xs sm:text-sm text-[#8B95A1] font-medium">
          <div className="space-y-2">
            <p>공식 데이터 및 주요 핫이슈 소식을 기반으로 작동하는 블로그 채널입니다.</p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-1 text-xs text-[#8B95A1]">
              <Link href="/privacy" className="hover:underline font-semibold">개인정보처리방침 (Privacy Policy)</Link>
              <span className="text-[#E5E8EB] dark:text-slate-800">|</span>
              <Link href="/terms" className="hover:underline font-semibold">이용약관 (Terms of Service)</Link>
            </div>
            <p>© {new Date().getFullYear()} 리얼인포. All rights reserved.</p>
          </div>
          <div className="text-xs font-semibold text-[#4E5968] dark:text-slate-400">
            real-infos.com
          </div>
        </div>
      </footer>
    </div>
  );
}
