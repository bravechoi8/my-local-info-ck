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
  const [activeTab, setActiveTab] = useState("전체");

  const categories = [
    { key: "전체", label: "전체" },
    { key: "혜택", label: "지원금·혜택" },
    { key: "행사", label: "축제·행사" },
    { key: "생활정보", label: "생활정보" },
    { key: "핫이슈", label: "핫이슈" },
    { key: "재테크", label: "재테크" },
    { key: "연예인이슈", label: "연예인이슈" },
    { key: "도구게임", label: "미니게임·도구 🎮" }
  ];

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

  const currentCategoryPosts = searchResults.filter(
    (p) => p.category === activeTab
  );

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

      {/* 사시 고양이 햅삐 입양 홍보 띠 배너 */}
      <div className="bg-gradient-to-r from-amber-50 to-rose-50 dark:from-[#2a1e1b] dark:to-[#361e24] border-b border-rose-100/80 dark:border-rose-950/30 px-6 py-3.5 transition-all">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <span className="text-2xl shrink-0">🐱</span>
            <div className="space-y-0.5">
              <p className="text-sm font-extrabold text-slate-900 dark:text-[#F3F4F6] flex items-center justify-center sm:justify-start gap-1.5">
                <span>사시 고양이 &apos;햅삐&apos;의 평생 가족을 찾습니다!</span>
                <span className="px-1.5 py-0.5 text-[10px] font-black text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/50 rounded-md animate-pulse">임시보호 중</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-[#8B95A1]">
                조금 특별하게 태어났지만 누구보다 사랑스럽고 활발한 햅삐의 묘생 역전을 함께 응원해 주세요.
              </p>
            </div>
          </div>
          <Link
            href="/blog/2026-06-27-happy-adopt"
            className="shrink-0 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-rose-500/10 hover:scale-[1.02] active:scale-95"
          >
            입양·홍보글 보러가기 &rarr;
          </Link>
        </div>
      </div>

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
            {categories.map((cat) => {
              const isActive = activeTab === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveTab(cat.key)}
                  className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#3182F6] text-white shadow-sm"
                      : "bg-[#F2F4F6] dark:bg-slate-800/80 text-[#4E5968] dark:text-slate-300 hover:bg-[#E5E8EB] dark:hover:bg-slate-700"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 영역 */}
      <main className="max-w-5xl mx-auto px-6 pb-24">
        {activeTab === "도구게임" ? (
          /* 도구게임 탭 전용 레이아웃 */
          <div className="space-y-12 animate-fadeIn">
            <div className="text-center py-6">
              <h2 className="text-2xl font-extrabold text-[#191F28] dark:text-[#F3F4F6] mb-2">🎮 미니게임 &amp; 유용한 도구</h2>
              <p className="text-sm text-[#4E5968] dark:text-[#8B95A1]">리얼인포가 제공하는 유용하고 재미있는 도구 모음입니다.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* 테토-에겐 성격 유형 테스트 배너 */}
              <section className="group bg-gradient-to-br from-[#FFEAE4] to-[#F0EDFF] dark:from-[#2E1F1A] dark:to-[#1C1A3A] rounded-2xl p-4 sm:p-4.5 border border-[#ebe4d9] dark:border-slate-800/80 border-b-[6px] border-b-[#d85a30]/50 dark:border-b-[#d85a30]/30 flex flex-col justify-between gap-3 h-full hover:-translate-y-1 hover:border-b-[7px] hover:shadow-[0_8px_20px_rgba(216,90,48,0.15)] dark:hover:shadow-[0_8px_20px_rgba(0,0,0,0.6)] active:translate-y-0.5 active:border-b-[2px] transition-all duration-200">
                <div className="space-y-1.5">
                  <span className="inline-block px-2 py-0.5 text-[9px] font-bold rounded bg-white dark:bg-slate-800 text-[#d85a30] border border-[#f5c4b3] dark:border-[#d85a30]/30 transition-colors">
                    호르몬 기반 성격 테스트
                  </span>
                  <h2 className="text-sm sm:text-base font-extrabold text-[#2b2722] dark:text-[#F3F4F6] leading-tight">
                    나는 테토(Teto)일까, 에겐(Egen)일까?
                  </h2>
                  <p className="text-[10.5px] text-[#7a7268] dark:text-[#8B95A1] leading-relaxed">
                    12가지 질문으로 나의 진짜 호르몬 성향을 알아보세요!
                  </p>
                </div>
                <div className="flex justify-end pt-1">
                  <Link
                    href="/teto-egen-test"
                    className="px-3 py-1.5 bg-[#1d1d1b] dark:bg-[#d85a30] text-white text-[10px] font-bold rounded-lg group-hover:scale-[1.02] dark:group-hover:bg-[#c24b25] transition-all shadow-sm whitespace-nowrap"
                  >
                    테스트 시작하기 &rarr;
                  </Link>
                </div>
              </section>

              {/* AI 로또번호 자동 생성기 배너 */}
              <section className="group bg-gradient-to-br from-[#EBF3FF] to-[#E8F0FB] dark:from-[#1E293B]/40 dark:to-[#0F172A]/40 rounded-2xl p-4 sm:p-4.5 border border-[#d9e2eb] dark:border-slate-800/80 border-b-[6px] border-b-[#3182F6]/50 dark:border-b-[#3182F6]/30 flex flex-col justify-between gap-3 h-full hover:-translate-y-1 hover:border-b-[7px] hover:shadow-[0_8px_20px_rgba(49,130,246,0.15)] dark:hover:shadow-[0_8px_20px_rgba(0,0,0,0.6)] active:translate-y-0.5 active:border-b-[2px] transition-all duration-200">
                <div className="space-y-1.5">
                  <span className="inline-block px-2 py-0.5 text-[9px] font-bold rounded bg-white dark:bg-slate-800 text-[#3182F6] border border-[#d2e2fa] dark:border-[#3182F6]/30 transition-colors">
                    당첨 통계 기반 분석
                  </span>
                  <h2 className="text-sm sm:text-base font-extrabold text-[#191F28] dark:text-[#F3F4F6] leading-tight">
                    AI 로또번호 자동 생성기
                  </h2>
                  <p className="text-[10.5px] text-[#4E5968] dark:text-[#8B95A1] leading-relaxed">
                    역대 1등 당첨번호 통계 가중치를 활용해 번호를 예측합니다.
                  </p>
                </div>
                <div className="flex justify-end pt-1">
                  <Link
                    href="/lotto"
                    className="px-3 py-1.5 bg-[#3182F6] text-white text-[10px] font-bold rounded-lg group-hover:scale-[1.02] hover:bg-[#1b64da] transition-all shadow-sm whitespace-nowrap"
                  >
                    행운번호 받기 &rarr;
                  </Link>
                </div>
              </section>

              {/* 술값 계산 복불복 룰렛 배너 */}
              <section className="group bg-gradient-to-br from-[#FFF0F0] to-[#FFE4E4] dark:from-[#2D1B1E] dark:to-[#1A1112] rounded-2xl p-4 sm:p-4.5 border border-[#ffd5d6] dark:border-slate-800/80 border-b-[6px] border-b-[#F04452]/50 dark:border-b-[#F04452]/30 flex flex-col justify-between gap-3 h-full hover:-translate-y-1 hover:border-b-[7px] hover:shadow-[0_8px_20px_rgba(240,68,82,0.15)] dark:hover:shadow-[0_8px_20px_rgba(0,0,0,0.6)] active:translate-y-0.5 active:border-b-[2px] transition-all duration-200">
                <div className="space-y-1.5">
                  <span className="inline-block px-2 py-0.5 text-[9px] font-bold rounded bg-white dark:bg-slate-800 text-[#F04452] border border-[#ffd5d6] dark:border-[#F04452]/30 transition-colors">
                    모임·술자리 게임
                  </span>
                  <h2 className="text-sm sm:text-base font-extrabold text-[#191F28] dark:text-[#F3F4F6] leading-tight">
                    술값 계산 복불복 룰렛
                  </h2>
                  <p className="text-[10.5px] text-[#4E5968] dark:text-[#8B95A1] leading-relaxed">
                    오늘 술값이나 밥값을 계산할 사람을 룰렛으로 결정합니다!
                  </p>
                </div>
                <div className="flex justify-end pt-1">
                  <Link
                    href="/roulette"
                    className="px-3 py-1.5 bg-[#1d1d1b] dark:bg-slate-800 text-white text-[10px] font-bold rounded-lg group-hover:scale-[1.02] hover:bg-black dark:hover:bg-slate-700 transition-all shadow-sm whitespace-nowrap"
                  >
                    룰렛 돌리기 &rarr;
                  </Link>
                </div>
              </section>

              {/* 유용한 멀티 타이머 배너 */}
              <section className="group bg-gradient-to-br from-[#F0F5FF] to-[#F5F0FF] dark:from-[#1E293B]/40 dark:to-[#1E1B4B]/40 rounded-2xl p-4 sm:p-4.5 border border-[#e8eefc] dark:border-slate-800/80 border-b-[6px] border-b-[#3182F6]/50 dark:border-b-[#7C3AED]/30 flex flex-col justify-between gap-3 h-full hover:-translate-y-1 hover:border-b-[7px] hover:shadow-[0_8px_20px_rgba(49,130,246,0.15)] dark:hover:shadow-[0_8px_20px_rgba(0,0,0,0.6)] active:translate-y-0.5 active:border-b-[2px] transition-all duration-200">
                <div className="space-y-1.5">
                  <span className="inline-block px-2 py-0.5 text-[9px] font-bold rounded bg-white dark:bg-slate-800 text-[#3182F6] border border-[#d2e2fa] dark:border-[#3182F6]/30 transition-colors">
                    시간표 &amp; 뽀모도로
                  </span>
                  <h2 className="text-sm sm:text-base font-extrabold text-[#191F28] dark:text-[#F3F4F6] leading-tight">
                    유용한 멀티 타이머
                  </h2>
                  <p className="text-[10.5px] text-[#4E5968] dark:text-[#8B95A1] leading-relaxed">
                    일반 타이머, 뽀모도로, 일정 알림을 제공하는 스마트 유틸리티!
                  </p>
                </div>
                <div className="flex justify-end pt-1">
                  <Link
                    href="/timer"
                    className="px-3 py-1.5 bg-[#3182F6] text-white text-[10px] font-bold rounded-lg group-hover:scale-[1.02] hover:bg-[#1b64da] transition-all shadow-sm whitespace-nowrap"
                  >
                    타이머 켜기 &rarr;
                  </Link>
                </div>
              </section>

              {/* 쿠키 플래너 & 챗봇 배너 */}
              <section className="group bg-gradient-to-br from-[#FFF3E2] to-[#FFE8CC] dark:from-[#3A2A1A] dark:to-[#2B1B0F] rounded-2xl p-4 sm:p-4.5 border border-[#EFE3D0] dark:border-slate-800/80 border-b-[6px] border-b-[#F4A55F]/50 dark:border-b-[#F4A55F]/30 flex flex-col justify-between gap-3 h-full hover:-translate-y-1 hover:border-b-[7px] hover:shadow-[0_8px_20px_rgba(244,165,95,0.15)] dark:hover:shadow-[0_8px_20px_rgba(0,0,0,0.6)] active:translate-y-0.5 active:border-b-[2px] transition-all duration-200">
                <div className="space-y-1.5">
                  <span className="inline-block px-2 py-0.5 text-[9px] font-bold rounded bg-white dark:bg-slate-800 text-[#E8893A] border border-[#FFE8CC] dark:border-[#E8893A]/30 transition-colors">
                    강아지 AI 챗봇 &amp; 플래너 🐾
                  </span>
                  <h2 className="text-sm sm:text-base font-extrabold text-[#3a322b] dark:text-[#F3F4F6] leading-tight">
                    쿠키 플래너 &amp; 챗봇
                  </h2>
                  <p className="text-[10.5px] text-[#7a7268] dark:text-[#8B95A1] leading-relaxed">
                    귀여운 믹스견 쿠키와 수다도 떨고, 날씨 정보 확인 및 공부 기록(타이머)을 함께 해보세요!
                  </p>
                </div>
                <div className="flex justify-end pt-1">
                  <Link
                    href="/cookie-planner.html"
                    className="px-3 py-1.5 bg-[#F4A55F] dark:bg-[#E8893A] text-white text-[10px] font-bold rounded-lg group-hover:scale-[1.02] hover:bg-[#E8893A] dark:hover:bg-[#D57628] transition-all shadow-sm whitespace-nowrap"
                  >
                    쿠키 만나기 &rarr;
                  </Link>
                </div>
              </section>

              {/* 클래식 테트리스 미니게임 배너 */}
              <section className="group bg-gradient-to-br from-[#E6FFFA] to-[#E6F4EA] dark:from-[#1E3B33] dark:to-[#172D2B] rounded-2xl p-4 sm:p-4.5 border border-[#d2efe2] dark:border-slate-800/80 border-b-[6px] border-b-[#059669]/50 dark:border-b-[#059669]/30 flex flex-col justify-between gap-3 h-full hover:-translate-y-1 hover:border-b-[7px] hover:shadow-[0_8px_20px_rgba(5,150,105,0.15)] dark:hover:shadow-[0_8px_20px_rgba(0,0,0,0.6)] active:translate-y-0.5 active:border-b-[2px] transition-all duration-200">
                <div className="space-y-1.5">
                  <span className="inline-block px-2 py-0.5 text-[9px] font-bold rounded bg-white dark:bg-slate-800 text-[#059669] border border-[#d2efe2] dark:border-[#059669]/30 transition-colors">
                    클래식 아케이드 🎮
                  </span>
                  <h2 className="text-sm sm:text-base font-extrabold text-[#191F28] dark:text-[#F3F4F6] leading-tight">
                    클래식 테트리스 게임
                  </h2>
                  <p className="text-[10.5px] text-[#4E5968] dark:text-[#8B95A1] leading-relaxed">
                    속도 레벨업, 다음 블록 예측, 모바일 일체형 터치 조작까지 지원합니다!
                  </p>
                </div>
                <div className="flex justify-end pt-1">
                  <Link
                    href="/tetris"
                    className="px-3 py-1.5 bg-[#059669] text-white text-[10px] font-bold rounded-lg group-hover:scale-[1.02] hover:bg-[#047857] transition-all shadow-sm whitespace-nowrap"
                  >
                    게임하기 &rarr;
                  </Link>
                </div>
              </section>

              {/* 클래식 한국 장기 미니게임 배너 */}
              <section className="group bg-gradient-to-br from-[#FFFBF0] to-[#FCEECC] dark:from-[#2C2218] dark:to-[#1F1710] rounded-2xl p-4 sm:p-4.5 border border-[#eedcbe] dark:border-slate-800/80 border-b-[6px] border-b-[#b87d4b]/50 dark:border-b-[#b87d4b]/30 flex flex-col justify-between gap-3 h-full hover:-translate-y-1 hover:border-b-[7px] hover:shadow-[0_8px_20px_rgba(184,125,75,0.15)] dark:hover:shadow-[0_8px_20px_rgba(0,0,0,0.6)] active:translate-y-0.5 active:border-b-[2px] transition-all duration-200">
                <div className="space-y-1.5">
                  <span className="inline-block px-2 py-0.5 text-[9px] font-bold rounded bg-white dark:bg-slate-800 text-[#b87d4b] border border-[#eedcbe] dark:border-[#b87d4b]/30 transition-colors">
                    전통 보드게임 ♟️
                  </span>
                  <h2 className="text-sm sm:text-base font-extrabold text-[#191F28] dark:text-[#F3F4F6] leading-tight">
                    클래식 한국 장기 게임
                  </h2>
                  <p className="text-[10.5px] text-[#4E5968] dark:text-[#8B95A1] leading-relaxed">
                    2인용 로컬 대국 및 간단한 컴퓨터 AI 모드 제공! 언제든 전통 한판을 즐겨보세요.
                  </p>
                </div>
                <div className="flex justify-end pt-1">
                  <Link
                    href="/janggi"
                    className="px-3 py-1.5 bg-[#b87d4b] text-white text-[10px] font-bold rounded-lg group-hover:scale-[1.02] hover:bg-[#976034] transition-all shadow-sm whitespace-nowrap"
                  >
                    대국 시작 &rarr;
                  </Link>
                </div>
              </section>

              {/* AI STT 받아쓰기 스튜디오 배너 */}
              <section className="group bg-gradient-to-br from-[#FFF5F5] to-[#FFF0F5] dark:from-[#321C20] dark:to-[#2B1B26] rounded-2xl p-4 sm:p-4.5 border border-[#ffdbe3] dark:border-slate-800/80 border-b-[6px] border-b-[#E53E3E]/50 dark:border-b-[#E53E3E]/30 flex flex-col justify-between gap-3 h-full hover:-translate-y-1 hover:border-b-[7px] hover:shadow-[0_8px_20px_rgba(229,62,62,0.15)] dark:hover:shadow-[0_8px_20px_rgba(0,0,0,0.6)] active:translate-y-0.5 active:border-b-[2px] transition-all duration-200">
                <div className="space-y-1.5">
                  <span className="inline-block px-2 py-0.5 text-[9px] font-bold rounded bg-white dark:bg-slate-800 text-[#E53E3E] border border-[#ffdbe3] dark:border-[#E53E3E]/30 transition-colors">
                    AI 음성 받아쓰기 🎙️
                  </span>
                  <h2 className="text-sm sm:text-base font-extrabold text-[#191F28] dark:text-[#F3F4F6] leading-tight">
                    AI STT 받아쓰기 스튜디오
                  </h2>
                  <p className="text-[10.5px] text-[#4E5968] dark:text-[#8B95A1] leading-relaxed">
                    음성 파일을 업로드하거나 실시간 마이크 녹음으로 즉시 텍스트 변환 및 요약을 지원합니다!
                  </p>
                </div>
                <div className="flex justify-end pt-1">
                  <Link
                    href="/stt"
                    className="px-3 py-1.5 bg-[#E53E3E] text-white text-[10px] font-bold rounded-lg group-hover:scale-[1.02] hover:bg-[#C53030] transition-all shadow-sm whitespace-nowrap"
                  >
                    스튜디오 켜기 &rarr;
                  </Link>
                </div>
              </section>
            </div>
          </div>
        ) : activeTab === "전체" ? (
          /* 전체 탭 레이아웃 */
          searchQuery ? (
            /* 검색 모드 활성화 시 검색 결과만 리스트업 */
            <div className="space-y-8 animate-fadeIn">
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
            <div className="space-y-20 animate-fadeIn">
              {/* 대표 배너 2개 + 전체 도구 숏컷 카드 (3열 그리드 구성) */}
              <div className="max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* AI 로또번호 자동 생성기 배너 */}
                <section className="group bg-gradient-to-br from-[#EBF3FF] to-[#E8F0FB] dark:from-[#1E293B]/40 dark:to-[#0F172A]/40 rounded-2xl p-4 sm:p-4.5 border border-[#d9e2eb] dark:border-slate-800/80 border-b-[6px] border-b-[#3182F6]/50 dark:border-b-[#3182F6]/30 flex flex-col justify-between gap-3 h-full hover:-translate-y-1 hover:border-b-[7px] hover:shadow-[0_8px_20px_rgba(49,130,246,0.15)] dark:hover:shadow-[0_8px_20px_rgba(0,0,0,0.6)] active:translate-y-0.5 active:border-b-[2px] transition-all duration-200">
                  <div className="space-y-1.5">
                    <span className="inline-block px-2 py-0.5 text-[9px] font-bold rounded bg-white dark:bg-slate-800 text-[#3182F6] border border-[#d2e2fa] dark:border-[#3182F6]/30 transition-colors">
                      당첨 통계 기반 분석
                    </span>
                    <h2 className="text-sm sm:text-base font-extrabold text-[#191F28] dark:text-[#F3F4F6] leading-tight">
                      AI 로또번호 자동 생성기
                    </h2>
                    <p className="text-[10.5px] text-[#4E5968] dark:text-[#8B95A1] leading-relaxed">
                      역대 1등 당첨번호 통계 가중치를 활용해 번호를 예측합니다.
                    </p>
                  </div>
                  <div className="flex justify-end pt-1">
                    <Link
                      href="/lotto"
                      className="px-3 py-1.5 bg-[#3182F6] text-white text-[10px] font-bold rounded-lg group-hover:scale-[1.02] hover:bg-[#1b64da] transition-all shadow-sm whitespace-nowrap"
                    >
                      행운번호 받기 &rarr;
                    </Link>
                  </div>
                </section>

                {/* 술값 계산 복불복 룰렛 배너 */}
                <section className="group bg-gradient-to-br from-[#FFF0F0] to-[#FFE4E4] dark:from-[#2D1B1E] dark:to-[#1A1112] rounded-2xl p-4 sm:p-4.5 border border-[#ffd5d6] dark:border-slate-800/80 border-b-[6px] border-b-[#F04452]/50 dark:border-b-[#F04452]/30 flex flex-col justify-between gap-3 h-full hover:-translate-y-1 hover:border-b-[7px] hover:shadow-[0_8px_20px_rgba(240,68,82,0.15)] dark:hover:shadow-[0_8px_20px_rgba(0,0,0,0.6)] active:translate-y-0.5 active:border-b-[2px] transition-all duration-200">
                  <div className="space-y-1.5">
                    <span className="inline-block px-2 py-0.5 text-[9px] font-bold rounded bg-white dark:bg-slate-800 text-[#F04452] border border-[#ffd5d6] dark:border-[#F04452]/30 transition-colors">
                      모임·술자리 게임
                    </span>
                    <h2 className="text-sm sm:text-base font-extrabold text-[#191F28] dark:text-[#F3F4F6] leading-tight">
                      술값 계산 복불복 룰렛
                    </h2>
                    <p className="text-[10.5px] text-[#4E5968] dark:text-[#8B95A1] leading-relaxed">
                      오늘 술값이나 밥값을 계산할 사람을 룰렛으로 결정합니다!
                    </p>
                  </div>
                  <div className="flex justify-end pt-1">
                    <Link
                      href="/roulette"
                      className="px-3 py-1.5 bg-[#1d1d1b] dark:bg-slate-800 text-white text-[10px] font-bold rounded-lg group-hover:scale-[1.02] hover:bg-black dark:hover:bg-slate-700 transition-all shadow-sm whitespace-nowrap"
                    >
                      룰렛 돌리기 &rarr;
                    </Link>
                  </div>
                </section>

                {/* 미니게임·도구 더보기 숏컷 카드 */}
                <section
                  onClick={() => setActiveTab("도구게임")}
                  className="group bg-gradient-to-br from-[#F5F0FF] to-[#E8F0FB] dark:from-[#2A1E3D] dark:to-[#17203F] rounded-2xl p-4 sm:p-4.5 border border-[#e8dff5] dark:border-slate-800/80 border-b-[6px] border-b-[#7C3AED]/50 dark:border-b-[#7C3AED]/30 flex flex-col justify-between gap-3 h-full hover:-translate-y-1 hover:border-b-[7px] hover:shadow-[0_8px_20px_rgba(124,58,237,0.15)] dark:hover:shadow-[0_8px_20px_rgba(0,0,0,0.6)] active:translate-y-0.5 active:border-b-[2px] transition-all duration-200 cursor-pointer text-left"
                >
                  <div className="space-y-1.5">
                    <span className="inline-block px-2 py-0.5 text-[9px] font-bold rounded bg-white dark:bg-slate-800 text-[#7C3AED] border border-[#e8dff5] dark:border-[#7C3AED]/30 transition-colors">
                      유용한 도구 모음
                    </span>
                    <h2 className="text-sm sm:text-base font-extrabold text-[#191F28] dark:text-[#F3F4F6] leading-tight">
                      재미있는 게임 &amp; 스마트 도구 더보기
                    </h2>
                    <p className="text-[10.5px] text-[#4E5968] dark:text-[#8B95A1] leading-relaxed">
                      호르몬 성격 테스트, 멀티 타이머 등 리얼인포의 모든 도구를 한눈에 확인하세요.
                    </p>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      className="px-3 py-1.5 bg-[#7C3AED] text-white text-[10px] font-bold rounded-lg group-hover:scale-[1.02] hover:bg-[#6D28D9] transition-all shadow-sm whitespace-nowrap"
                    >
                      전체 보기 &rarr;
                    </button>
                  </div>
                </section>
              </div>

              {/* 1. 최상단 히어로 추천 영역 */}
              {heroPost && (
                <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold text-[#8B95A1] uppercase tracking-wider">TODAY&apos;S HOT ISSUE</h2>
                    <button onClick={() => setActiveTab("핫이슈")} className="text-xs sm:text-sm font-semibold text-[#3182F6] hover:underline">더보기 &rarr;</button>
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
                      <button onClick={() => setActiveTab("혜택")} className="text-xs sm:text-sm font-semibold text-[#3182F6] hover:underline">더보기 &rarr;</button>
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
                    <button onClick={() => setActiveTab("행사")} className="text-xs sm:text-sm font-semibold text-[#3182F6] hover:underline">더보기 &rarr;</button>
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
                    <button onClick={() => setActiveTab("생활정보")} className="text-xs sm:text-sm font-semibold text-[#3182F6] hover:underline">더보기 &rarr;</button>
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
                    <button onClick={() => setActiveTab("재테크")} className="text-xs sm:text-sm font-semibold text-[#3182F6] hover:underline">더보기 &rarr;</button>
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

              {/* 6. 연예인 핫이슈 & 뉴스 존 */}
              {celebSectionPosts.length > 0 && (
                <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl sm:text-2xl font-bold text-[#191F28] dark:text-[#F3F4F6] flex items-center gap-2">
                      <span className="text-2xl">⭐</span> 연예인 이슈 & 소식
                    </h2>
                    <button onClick={() => setActiveTab("연예인이슈")} className="text-xs sm:text-sm font-semibold text-[#3182F6] hover:underline">더보기 &rarr;</button>
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
          )
        ) : (
          /* 개별 일반 카테고리 탭 레이아웃 */
          <div className="space-y-8 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#F2F4F6] dark:border-slate-800/80 pb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-[#191F28] dark:text-[#F3F4F6] flex items-center gap-2">
                <span>
                  {activeTab === "혜택" && "💰"}
                  {activeTab === "행사" && "🎈"}
                  {activeTab === "생활정보" && "💡"}
                  {activeTab === "핫이슈" && "🔥"}
                  {activeTab === "재테크" && "📈"}
                  {activeTab === "연예인이슈" && "⭐"}
                </span>
                {getCategoryConfig(activeTab).label} 정보
              </h2>
              <span className="text-xs sm:text-sm text-[#8B95A1] font-semibold">
                총 <span className="text-[#3182F6]">{currentCategoryPosts.length}</span>개의 글
              </span>
            </div>

            {currentCategoryPosts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
                {currentCategoryPosts.map((post) => {
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
                <span className="text-4xl inline-block mb-4">✍️</span>
                <h3 className="text-base sm:text-lg font-bold text-[#191F28] dark:text-[#F3F4F6] mb-2">아직 작성된 글이 없습니다</h3>
                <p className="text-xs sm:text-sm text-[#8B95A1]">새로운 유용한 소식을 준비하고 있습니다.</p>
              </div>
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
              <span className="text-[#E5E8EB] dark:text-slate-800">|</span>
              <span className="font-semibold">문의: <a href="mailto:bravechoi8@gmail.com" className="hover:underline">bravechoi8@gmail.com</a></span>
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
