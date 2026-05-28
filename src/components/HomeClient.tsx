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
  const [selectedCategory, setSelectedCategory] = useState<"전체" | "행사" | "혜택" | "핫이슈" | "재테크" | "생활정보" | "연예인이슈">("전체");
  const [searchQuery, setSearchQuery] = useState("");

  // 날짜 형식 예쁘게 변환 (YYYY-MM-DD -> YYYY.MM.DD)
  const formatDate = (dateStr: string) => {
    return dateStr.replace(/-/g, ".");
  };

  // 블로그 글에 local-info.json의 상세 정보(장소, 대상 등) 매핑하기
  const mappedPosts = posts.map((post) => {
    const matchedItem = localData.find((item: any) => {
      const itemName = item.name || item.title || '';
      return itemName && (post.title.includes(itemName) || post.content.includes(itemName));
    });

    return {
      slug: post.slug,
      title: post.title,
      summary: post.summary,
      category: post.category as "행사" | "혜택" | "핫이슈" | "재테크" | "생활정보" | "연예인이슈",
      date: post.date,
      location: matchedItem?.location || "온라인 및 관할 행정복지센터",
      target: matchedItem?.target || "용인시 주민 누구나",
      startDate: matchedItem?.startDate || post.date,
      endDate: matchedItem?.endDate || "상시",
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

  const events = filteredPosts.filter((post) => post.category === "행사");
  const benefits = filteredPosts.filter((post) => post.category === "혜택");

  const getCategoryConfig = (category: string) => {
    switch (category) {
      case "행사":
        return { label: "축제 · 행사", bg: "from-rose-50 to-amber-50/50 border-b border-rose-100/50", badge: "text-rose-700 bg-rose-100/80" };
      case "혜택":
        return { label: "지원금 · 혜택", bg: "from-emerald-50 to-cyan-50/50 border-b border-emerald-100/50", badge: "text-emerald-700 bg-emerald-100/80" };
      case "핫이슈":
        return { label: "🔥 핫이슈", bg: "from-orange-50 to-red-50/50 border-b border-orange-100/50", badge: "text-orange-700 bg-orange-100/80" };
      case "재테크":
        return { label: "📈 재테크", bg: "from-blue-50 to-indigo-50/50 border-b border-blue-100/50", badge: "text-blue-700 bg-blue-100/80" };
      case "생활정보":
        return { label: "💡 생활정보", bg: "from-purple-50 to-pink-50/50 border-b border-purple-100/50", badge: "text-purple-700 bg-purple-100/80" };
      case "연예인이슈":
        return { label: "⭐ 연예인이슈", bg: "from-fuchsia-50 to-yellow-50/50 border-b border-fuchsia-100/50", badge: "text-fuchsia-700 bg-fuchsia-100/80" };
      default:
        return { label: category, bg: "from-slate-50 to-zinc-50/50 border-b border-slate-100/50", badge: "text-slate-700 bg-slate-100/80" };
    }
  };

  const renderCard = (post: typeof mappedPosts[0]) => {
    const isEvent = post.category === "행사";
    const schema = isEvent
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
            "name": "용인시"
          }
        };

    return (
      <article
        key={post.slug}
        className="group flex flex-col justify-between bg-white rounded-2xl border border-slate-100 hover:border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_12px_40px_rgba(16,185,129,0.06)] hover:-translate-y-1 transition-all duration-300 overflow-hidden"
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
        <div>
          {/* 카드 헤더 일러스트 영역 */}
          <div
            className={`h-24 w-full relative flex items-end p-4 bg-gradient-to-br ${
              getCategoryConfig(post.category).bg
            }`}
          >
            <span
              className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                getCategoryConfig(post.category).badge
              }`}
            >
              {getCategoryConfig(post.category).label}
            </span>
          </div>

          <div className="p-6">
            {/* 카드 타이틀 */}
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 group-hover:text-emerald-600 transition-colors line-clamp-1">
              <Link href={`/blog/${post.slug}`}>
                {post.title}
              </Link>
            </h3>

            {/* 카드 설명 */}
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-6 line-clamp-2 h-10">
              {post.summary}
            </p>

            {/* 카드 상세 메타정보 */}
            {(post.category === "행사" || post.category === "혜택") && (
              <div className="space-y-2.5 pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"></span>
                  <span className="font-semibold text-slate-400 shrink-0">장소 · 접수</span>
                  <span className="truncate">{post.location}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"></span>
                  <span className="font-semibold text-slate-400 shrink-0">신청 대상</span>
                  <span className="truncate">{post.target}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"></span>
                  <span className="font-semibold text-slate-400 shrink-0">진행 기간</span>
                  <span>
                    {post.category === "행사"
                      ? `${formatDate(post.startDate)} ~ ${formatDate(post.endDate)}`
                      : `상시 (${formatDate(post.startDate)} ~)`}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 링크 이동 영역 */}
        <div className="px-6 pb-6 pt-2">
          <Link
            href={`/blog/${post.slug}`}
            className="flex items-center justify-between w-full py-2.5 px-4 text-xs sm:text-sm font-semibold rounded-xl text-slate-700 bg-slate-50 hover:bg-emerald-500 hover:text-white transition-all duration-200 border border-slate-100 group-hover:border-transparent"
          >
            <span>자세한 내용 알아보기</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </article>
    );
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] text-[#1e293b] font-sans antialiased">
      {/* GNB (상단 바) */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              우리동네 소식통
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 rounded-md">
              용인시
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-slate-500">
            <Link href="/" className="text-slate-900 font-semibold border-b-2 border-emerald-500 pb-1">홈</Link>
            <Link href="/blog" className="hover:text-slate-900 transition-colors">블로그</Link>
            <Link href="/about" className="hover:text-slate-900 transition-colors">소개</Link>
          </div>
        </div>
      </nav>

      {/* 헤더 배너 (현대적이고 미니멀한 스타일) */}
      <header className="bg-white py-16 px-6 border-b border-slate-100">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            오늘의 용인 소식
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
            더 스마트한 우리 동네 생활 정보
          </h1>
          <p className="text-sm sm:text-base text-slate-500 max-w-lg mx-auto leading-relaxed">
            용인시의 최신 축제·행사 일정과 놓치기 쉬운 지원 혜택을 깔끔하게 정리해 드려요. 필요한 정보를 바로 검색해 보세요.
          </p>
        </div>
      </header>

      {/* 메인 콘텐츠 영역 */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 검색 및 필터 컨트롤 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-6 border-b border-slate-100">
          {/* 카테고리 필터 버튼들 */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-full sm:w-fit">
            <button
              onClick={() => setSelectedCategory("전체")}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                selectedCategory === "전체"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              전체 보기
            </button>
            <button
              onClick={() => setSelectedCategory("행사")}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                selectedCategory === "행사"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              🎉 축제 · 행사
            </button>
            <button
              onClick={() => setSelectedCategory("혜택")}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                selectedCategory === "혜택"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              💰 지원금 · 혜택
            </button>
            <button
              onClick={() => setSelectedCategory("핫이슈")}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                selectedCategory === "핫이슈"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              🔥 핫이슈
            </button>
            <button
              onClick={() => setSelectedCategory("재테크")}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                selectedCategory === "재테크"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              📈 재테크
            </button>
            <button
              onClick={() => setSelectedCategory("생활정보")}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                selectedCategory === "생활정보"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              💡 생활정보
            </button>
            <button
              onClick={() => setSelectedCategory("연예인이슈")}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                selectedCategory === "연예인이슈"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              ⭐ 연예인이슈
            </button>
          </div>

          {/* 검색 바 */}
          <div className="relative w-full md:max-w-sm">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="제목, 대상, 지역 등으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-950 placeholder-slate-400 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* 결과 건수 표시 */}
        <div className="mb-6 text-xs sm:text-sm text-slate-400">
          총 <span className="font-bold text-slate-700">{filteredPosts.length}</span>개의 정보가 검색되었습니다.
        </div>

        {/* 카드 그리드 */}
        {filteredPosts.length > 0 ? (
          <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.slice(0, 3).map((post) => renderCard(post))}
            </div>
            {filteredPosts.length > 3 && <AdBanner />}
            {filteredPosts.length > 3 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredPosts.slice(3).map((post) => renderCard(post))}
              </div>
            )}
          </div>
        ) : (
          /* 검색 결과 없음 */
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <span className="text-4xl inline-block mb-4">🔍</span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">검색 결과가 없습니다</h3>
            <p className="text-xs sm:text-sm text-slate-400">다른 검색어로 찾아보시거나 카테고리 필터를 변경해 보세요.</p>
          </div>
        )}
      </main>

      {/* 하단 푸터 영역 */}
      <footer className="mt-24 bg-white border-t border-slate-100 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="space-y-1.5 text-xs text-slate-400">
            <p>공공데이터포털(data.go.kr)에 공개된 공식 데이터를 기반으로 작동하는 정보 채널입니다.</p>
            <p>데이터 최종 갱신: 2026년 5월 20일</p>
          </div>
          <div className="text-xs font-semibold text-slate-500">
            © {new Date().getFullYear()} 우리동네 소식통. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
