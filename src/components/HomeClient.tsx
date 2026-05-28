"use client";

import { useState } from "react";
import Link from "next/link";
import localData from "../../public/data/local-info.json";
import AdBanner from "@/components/AdBanner";
import type { PostData } from "@/lib/posts";

interface HomeClientProps {
  posts: PostData[];
}

export default function HomeClient({ posts }: HomeClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<
    "전체" | "행사" | "혜택" | "핫이슈" | "재테크" | "생활정보" | "연예인이슈"
  >("전체");
  const [searchQuery, setSearchQuery] = useState("");

  // 날짜 형식 예쁘게 변환 (YYYY-MM-DD -> YYYY.MM.DD)
  const formatDate = (dateStr: string) => {
    return dateStr.replace(/-/g, ".");
  };

  // 블로그 글에 local-info.json의 상세 정보(장소, 대상 등) 매핑 및 썸네일 이미지 추출
  const mappedPosts = posts.map((post) => {
    const matchedItem = localData.find((item: any) => {
      const itemName = item.name || item.title || '';
      return itemName && (post.title.includes(itemName) || post.content.includes(itemName));
    });

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
      category: post.category as "행사" | "혜택" | "핫이슈" | "재테크" | "생활정보" | "연예인이슈",
      date: post.date,
      location: matchedItem?.location || "온라인 및 전국 관할기관",
      target: matchedItem?.target || "전국 주민 누구나",
      startDate: matchedItem?.startDate || post.date,
      endDate: matchedItem?.endDate || "상시",
      thumbnail: firstImg || getFallbackImage(post.category),
    };
  });

  // 필터링 및 검색 처리
  const filteredPosts = mappedPosts.filter((post) => {
    const matchesCategory = selectedCategory === "전체" || post.category === selectedCategory;
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.target.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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

  const renderHeroCard = (post: typeof mappedPosts[0]) => {
    const config = getCategoryConfig(post.category);
    return (
      <Link
        href={`/blog/${post.slug}`}
        className="group block overflow-hidden rounded-2xl border border-[#F2F4F6] hover:shadow-[0_12px_40px_rgba(0,0,0,0.04)] transition-all duration-300 bg-white"
      >
        <div className="flex flex-col lg:flex-row items-stretch">
          {/* Left Text content */}
          <div className="flex-1 p-8 sm:p-12 flex flex-col justify-between">
            <div className="space-y-4">
              <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded ${config.bg} ${config.text}`}>
                {config.label}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#191F28] group-hover:text-[#3182F6] transition-colors leading-tight line-clamp-2">
                {post.title}
              </h2>
              <p className="text-sm text-[#4E5968] leading-relaxed line-clamp-3">
                {post.summary}
              </p>
            </div>
            <div className="mt-8 text-xs sm:text-sm text-[#8B95A1] font-medium">
              {formatDate(post.date)}
            </div>
          </div>
          {/* Right Large Image */}
          <div className="lg:w-1/2 min-h-[220px] sm:min-h-[300px] relative overflow-hidden bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={post.thumbnail} 
              alt={post.title} 
              className="absolute inset-0 h-full w-full object-cover group-hover:scale-102 transition-transform duration-500"
            />
          </div>
        </div>
      </Link>
    );
  };

  const renderCard = (post: typeof mappedPosts[0]) => {
    const config = getCategoryConfig(post.category);
    const schema = post.category === "행사"
      ? {
          "@context": "https://schema.org",
          "@type": "Event",
          "name": post.title,
          "startDate": post.startDate,
          "endDate": post.endDate === "상시" ? undefined : post.endDate,
          "location": {
            "@type": "Place",
            "name": post.location,
            "address": post.location
          },
          "description": post.summary
        }
      : {
          "@context": "https://schema.org",
          "@type": "GovernmentService",
          "name": post.title,
          "description": post.summary,
          "provider": {
            "@type": "GovernmentOrganization",
            "name": "정부 및 지자체"
          }
        };

    return (
      <Link
        key={post.slug}
        href={`/blog/${post.slug}`}
        className="group flex flex-col justify-between bg-white rounded-2xl overflow-hidden hover:-translate-y-1 transition-all duration-300"
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
        <div className="space-y-4">
          {/* 카드 썸네일 이미지 */}
          <div className="aspect-[16/10] w-full overflow-hidden rounded-2xl bg-slate-50 border border-[#F2F4F6] relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.thumbnail}
              alt={post.title}
              className="absolute inset-0 h-full w-full object-cover group-hover:scale-103 transition-transform duration-500"
            />
          </div>

          <div className="space-y-2">
            <span className={`inline-block text-xs font-semibold ${config.text}`}>
              {config.label}
            </span>
            <h3 className="text-base sm:text-lg font-bold text-[#191F28] group-hover:text-[#3182F6] transition-colors leading-snug line-clamp-2">
              {post.title}
            </h3>
            <p className="text-xs sm:text-sm text-[#4E5968] leading-relaxed line-clamp-2">
              {post.summary}
            </p>
            <div className="text-[11px] sm:text-xs text-[#8B95A1] pt-1 font-medium">
              {formatDate(post.date)}
            </div>
          </div>
        </div>
      </Link>
    );
  };

  // Featured Post와 Grid 리스트 구분
  const showHero = selectedCategory === "전체" && searchQuery === "" && filteredPosts.length > 0;
  const gridPosts = showHero ? filteredPosts.slice(1) : filteredPosts;

  return (
    <div className="min-h-screen bg-white text-[#333D4B] antialiased">
      {/* GNB (상단 네비게이션) - 토스 스타일 극도 미니멀 */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#F2F4F6] px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg sm:text-xl font-bold tracking-tight text-[#191F28] hover:text-[#3182F6] transition-colors">
              리얼인포
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm font-semibold text-[#4E5968]">
            <Link href="/" className="text-[#3182F6]">홈</Link>
            <Link href="/blog" className="hover:text-[#191F28] transition-colors">블로그</Link>
            <Link href="/about" className="hover:text-[#191F28] transition-colors">소개</Link>
            <Link href="/privacy" className="hover:text-[#191F28] transition-colors">개인정보처리방침 (Privacy)</Link>
            <Link href="/terms" className="hover:text-[#191F28] transition-colors">이용약관 (Terms)</Link>
          </div>
        </div>
      </nav>

      {/* 헤더 섹션 - 여백이 넉넉하고 정돈된 타이틀 */}
      <header className="bg-white pt-20 pb-16 px-6">
        <div className="max-w-5xl mx-auto text-left space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#191F28] leading-tight">
            생활 정보 & 혜택
          </h1>
          <p className="text-base sm:text-lg text-[#4E5968] leading-relaxed max-w-xl">
            전국의 유용한 생활 정보, 정부 혜택, 행사 및 지원금 소식을 한눈에 보기 쉽게 모아 드립니다.
          </p>
        </div>
      </header>

      {/* 메인 콘텐츠 영역 */}
      <main className="max-w-5xl mx-auto px-6 pb-24">
        {/* 카테고리 필터 & 검색 바 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 pb-6 border-b border-[#F2F4F6]">
          {/* 카테고리 텍스트형 탭 메뉴 */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {(
              ["전체", "행사", "혜택", "핫이슈", "재테크", "생활정보", "연예인이슈"] as const
            ).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-all ${
                  selectedCategory === cat
                    ? "bg-[#3182F6]/10 text-[#3182F6]"
                    : "text-[#4E5968] hover:text-[#191F28]"
                }`}
              >
                {cat === "전체" ? "전체" : getCategoryConfig(cat).label}
              </button>
            ))}
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
              placeholder="정보 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-[#F9FAFB] border border-[#F2F4F6] rounded-xl focus:outline-none focus:border-[#3182F6] focus:ring-1 focus:ring-[#3182F6] text-[#191F28] placeholder-[#8B95A1] transition-all"
            />
          </div>
        </div>

        {/* 히어로 추천글 (전체보기일 때만 최신 1순위 노출) */}
        {showHero && renderHeroCard(filteredPosts[0])}

        {/* 카드 그리드 리스트 */}
        {filteredPosts.length > 0 ? (
          <div className="space-y-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
              {gridPosts.map((post) => renderCard(post))}
            </div>

            {/* 광고 배너 */}
            <AdBanner />
          </div>
        ) : (
          /* 검색 결과 없음 */
          <div className="text-center py-24 bg-[#F9FAFB] rounded-2xl border border-[#F2F4F6]">
            <span className="text-4xl inline-block mb-4">🔍</span>
            <h3 className="text-base sm:text-lg font-bold text-[#191F28] mb-2">검색 결과가 없습니다</h3>
            <p className="text-xs sm:text-sm text-[#8B95A1]">다른 키워드로 검색해보시거나 필터를 변경해보세요.</p>
          </div>
        )}
      </main>

      {/* 하단 푸터 */}
      <footer className="bg-[#F9FAFB] border-t border-[#F2F4F6] py-16 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left text-xs sm:text-sm text-[#8B95A1] font-medium">
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
