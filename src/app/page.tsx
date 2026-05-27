"use client";

import { useState } from "react";
import Link from "next/link";
import localData from "../../public/data/local-info.json";

interface InfoItem {
  id: string | number;
  title?: string;
  name?: string;
  category: "행사" | "혜택";
  startDate: string;
  endDate: string;
  location: string;
  target: string;
  description?: string;
  summary?: string;
  link: string;
}

export default function Home() {
  const data = localData as InfoItem[];
  const [selectedCategory, setSelectedCategory] = useState<"전체" | "행사" | "혜택">("전체");
  const [searchQuery, setSearchQuery] = useState("");

  // 날짜 형식 예쁘게 변환 (YYYY-MM-DD -> YYYY.MM.DD)
  const formatDate = (dateStr: string) => {
    return dateStr.replace(/-/g, ".");
  };

  // 필터링 및 검색 처리
  const filteredData = data.filter((item) => {
    const title = item.title || item.name || "";
    const description = item.description || item.summary || "";
    const location = item.location || "";
    const target = item.target || "";

    const matchesCategory = selectedCategory === "전체" || item.category === selectedCategory;
    const matchesSearch =
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      target.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
              성남시
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
            오늘의 성남 소식
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
            더 스마트한 우리 동네 생활 정보
          </h1>
          <p className="text-sm sm:text-base text-slate-500 max-w-lg mx-auto leading-relaxed">
            성남시의 최신 축제·행사 일정과 놓치기 쉬운 지원 혜택을 깔끔하게 정리해 드려요. 필요한 정보를 바로 검색해 보세요.
          </p>
        </div>
      </header>

      {/* 메인 콘텐츠 영역 */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 검색 및 필터 컨트롤 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-6 border-b border-slate-100">
          {/* 카테고리 필터 버튼들 */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
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
          총 <span className="font-bold text-slate-700">{filteredData.length}</span>개의 정보가 검색되었습니다.
        </div>

        {/* 카드 그리드 */}
        {filteredData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredData.map((item) => (
              <article
                key={item.id}
                className="group flex flex-col justify-between bg-white rounded-2xl border border-slate-100 hover:border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_12px_40px_rgba(16,185,129,0.06)] hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                <div>
                  {/* 카드 헤더 일러스트 영역 (카테고리별 세련된 그라데이션) */}
                  <div
                    className={`h-24 w-full relative flex items-end p-4 bg-gradient-to-br ${
                      item.category === "행사"
                        ? "from-rose-50 to-amber-50/50 border-b border-rose-100/50"
                        : "from-emerald-50 to-cyan-50/50 border-b border-emerald-100/50"
                    }`}
                  >
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        item.category === "행사"
                          ? "text-rose-700 bg-rose-100/80"
                          : "text-emerald-700 bg-emerald-100/80"
                      }`}
                    >
                      {item.category === "행사" ? "축제 · 행사" : "지원금 · 혜택"}
                    </span>
                  </div>

                  <div className="p-6">
                    {/* 카드 타이틀 */}
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 group-hover:text-emerald-600 transition-colors line-clamp-1">
                      <Link href="/blog">
                        {item.title || item.name}
                      </Link>
                    </h3>

                    {/* 카드 설명 */}
                    <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-6 line-clamp-2 h-10">
                      {item.description || item.summary}
                    </p>

                    {/* 카드 상세 메타정보 */}
                    <div className="space-y-2.5 pt-4 border-t border-slate-50">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"></span>
                        <span className="font-semibold text-slate-400 shrink-0">장소 · 접수</span>
                        <span className="truncate">{item.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"></span>
                        <span className="font-semibold text-slate-400 shrink-0">신청 대상</span>
                        <span className="truncate">{item.target}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"></span>
                        <span className="font-semibold text-slate-400 shrink-0">진행 기간</span>
                        <span>
                          {item.category === "행사"
                            ? `${formatDate(item.startDate)} ~ ${formatDate(item.endDate)}`
                            : `상시 (${formatDate(item.startDate)} ~)`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 링크 이동 영역 */}
                <div className="px-6 pb-6 pt-2">
                  <Link
                    href="/blog"
                    className="flex items-center justify-between w-full py-2.5 px-4 text-xs sm:text-sm font-semibold rounded-xl text-slate-700 bg-slate-50 hover:bg-emerald-500 hover:text-white transition-all duration-200 border border-slate-100 group-hover:border-transparent"
                  >
                    <span>자세한 내용 알아보기</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </article>
            ))}
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
