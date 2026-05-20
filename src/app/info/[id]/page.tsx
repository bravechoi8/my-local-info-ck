import Link from "next/link";
import localData from "../../../../public/data/local-info.json";

interface InfoItem {
  id: string;
  title: string;
  category: "행사" | "혜택";
  startDate: string;
  endDate: string;
  location: string;
  target: string;
  description: string;
  link: string;
}

interface Props {
  params: Promise<{ id: string }>;
}

// Next.js 정적 배포(Static Export)를 위해 가능한 모든 상세 페이지 주소를 미리 알려주는 함수예요.
export async function generateStaticParams() {
  const data = localData as InfoItem[];
  return data.map((item) => ({
    id: item.id,
  }));
}

export default async function InfoDetailPage({ params }: Props) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  
  const data = localData as InfoItem[];
  const item = data.find((x) => x.id === id);

  // 만약 아이디에 맞는 데이터가 없다면 예외 처리
  if (!item) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafbfc] text-slate-850 font-sans p-6">
        <span className="text-4xl mb-4">⚠️</span>
        <h1 className="text-xl font-bold mb-2">해당 정보를 찾을 수 없습니다.</h1>
        <p className="text-sm text-slate-400 mb-6">이미 삭제되었거나 잘못된 접근입니다.</p>
        <Link
          href="/"
          className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-sm"
        >
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  // 날짜 형식 예쁘게 변환 (YYYY-MM-DD -> YYYY.MM.DD)
  const formatDate = (dateStr: string) => {
    return dateStr.replace(/-/g, ".");
  };

  const isEvent = item.category === "행사";

  return (
    <div className="min-h-screen bg-[#fafbfc] text-[#1e293b] font-sans antialiased pb-20">
      {/* GNB (상단 네비게이션) */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              우리동네 소식통
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 rounded-md">
              성남시
            </span>
          </Link>
          <div className="flex items-center gap-6 text-sm font-medium text-slate-500">
            <Link href="/" className="hover:text-slate-900 transition-colors">홈</Link>
            <Link href="#" className="hover:text-slate-900 transition-colors">블로그</Link>
          </div>
        </div>
      </nav>

      {/* 뒤로 가기 링크 버튼 */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-950 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          목록으로 돌아가기
        </Link>
      </div>

      {/* 메인 상세 내용 카드 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <article className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] overflow-hidden">
          {/* 상단 띠 컬러 (행사/혜택 성격에 맞추어 다름) */}
          <div
            className={`h-4 w-full bg-gradient-to-r ${
              isEvent ? "from-rose-400 to-amber-300" : "from-emerald-400 to-cyan-300"
            }`}
          />

          <div className="p-6 sm:p-10">
            {/* 카테고리 뱃지 */}
            <div className="mb-6">
              <span
                className={`inline-block px-3 py-1 text-xs font-bold rounded-lg ${
                  isEvent ? "text-rose-700 bg-rose-50 border border-rose-100" : "text-emerald-700 bg-emerald-50 border border-emerald-100"
                }`}
              >
                {isEvent ? "🎉 축제 · 행사" : "💰 지원금 · 혜택"}
              </span>
            </div>

            {/* 타이틀 */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight leading-tight mb-8">
              {item.title}
            </h1>

            {/* 주요 정보 요약 리스트 */}
            <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6 mb-8 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-1.5 border-b border-slate-100/50 last:border-0">
                <span className="text-xs sm:text-sm font-bold text-slate-400 w-24 shrink-0">📍 장소 및 접수처</span>
                <span className="text-xs sm:text-sm text-slate-700 font-medium">{item.location}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-1.5 border-b border-slate-100/50 last:border-0">
                <span className="text-xs sm:text-sm font-bold text-slate-400 w-24 shrink-0">👥 지원 대상</span>
                <span className="text-xs sm:text-sm text-slate-700 font-medium">{item.target}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-1.5 border-b border-slate-100/50 last:border-0">
                <span className="text-xs sm:text-sm font-bold text-slate-400 w-24 shrink-0">📅 진행 기간</span>
                <span className="text-xs sm:text-sm text-slate-700 font-medium">
                  {isEvent
                    ? `${formatDate(item.startDate)} ~ ${formatDate(item.endDate)}`
                    : `상시 적용 (${formatDate(item.startDate)} ~)`}
                </span>
              </div>
            </div>

            {/* 설명 전문 본문 영역 */}
            <div className="space-y-4 mb-10">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 border-l-4 border-emerald-500 pl-3">
                상세 안내 및 소개
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-white py-2">
                {item.description}
                {"\n\n"}
                본 생활 정보는 시민들의 편의를 위해 제공되는 요약본이며, 구체적인 자격 요건이나 제출 서류, 세부 프로그램 운영 시간 등 상세 내용은 반드시 공식 주관 기관의 안내 사항을 참고하셔야 합니다.
              </p>
            </div>

            {/* 액션 버튼 그룹 */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-100">
              {/* 원본 사이트 보기 */}
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/10"
              >
                자세히 보기
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>

              {/* 목록으로 가기 */}
              <Link
                href="/"
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl text-xs sm:text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                목록으로 돌아가기
              </Link>
            </div>
          </div>
        </article>
      </main>

      {/* 하단 푸터 */}
      <footer className="mt-20 text-center text-xs text-slate-400 space-y-1">
        <p>공공데이터포털 기반 성남시 동네 정보 채널</p>
        <p>© 우리동네 소식통</p>
      </footer>
    </div>
  );
}
