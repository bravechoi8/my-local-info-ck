import Link from 'next/link';

export const metadata = {
  title: "서비스 소개 | 용인시 생활 정보",
  description: "우리동네 소식통의 사이트 운영 목적, 데이터 출처, 콘텐츠 생성 방식을 소개합니다.",
};

export default function AboutPage() {
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
            <Link href="/blog" className="hover:text-[#191F28] transition-colors">블로그</Link>
            <Link href="/about" className="text-[#3182F6]">소개</Link>
          </div>
        </div>
      </nav>

      {/* 메인 콘텐츠 영역 */}
      <main className="max-w-3xl mx-auto px-6 py-20 space-y-16">
        <header className="space-y-4">
          <span className="inline-block text-xs font-bold text-[#3182F6] tracking-wider uppercase">
            Service Intro
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#191F28] leading-tight">
            우리동네 소식통은 어떤 곳인가요?
          </h1>
          <p className="text-base sm:text-lg text-[#4E5968] leading-relaxed max-w-xl">
            지역 주민 여러분이 꼭 알아야 할 축제, 혜택, 복지 지원금 정보를 더 편리하고 빠르게 알려드리는 친근한 동네 정보 가이드입니다.
          </p>
        </header>

        {/* 상세 설명 리스트 - 토스 특유의 여백 넓은 서술형 스타일 */}
        <section className="space-y-12 border-t border-[#F2F4F6] pt-12">
          {/* 1. 운영 목적 */}
          <div className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#191F28] flex items-center gap-2">
              <span className="w-1 h-5 bg-[#3182F6] rounded-full"></span>
              사이트 운영 목적
            </h2>
            <p className="text-sm sm:text-base text-[#4E5968] leading-relaxed pl-3">
              정부와 지자체에서 수많은 생활 지원금과 축제, 행사 혜택을 제공하고 있지만, 바쁜 일상 속에서 나에게 딱 맞는 정보를 찾기란 쉽지 않습니다. 
              <strong className="text-[#191F28] font-semibold"> 우리동네 소식통</strong>은 복잡하고 어려운 행정 정보를 주민 여러분의 눈높이에 맞게 쉽게 풀어서 전달하여, 지역 사회의 다양한 혜택을 단 하나도 놓치지 않도록 돕기 위해 운영됩니다.
            </p>
          </div>

          {/* 2. 데이터 출처 */}
          <div className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#191F28] flex items-center gap-2">
              <span className="w-1 h-5 bg-[#3182F6] rounded-full"></span>
              공공데이터 기반 정보 제공
            </h2>
            <p className="text-sm sm:text-base text-[#4E5968] leading-relaxed pl-3">
              본 사이트에 수집되는 모든 축제 정보 및 복지 혜택 자료는 대한민국 정부 공식 창구인 <strong className="text-[#191F28] font-semibold">공공데이터포털(data.go.kr)</strong>의 Open API를 기반으로 하고 있습니다. 
              이를 통해 신뢰할 수 있는 공식적인 정보만을 시민 여러분께 제공해 드립니다.
            </p>
          </div>

          {/* 3. 콘텐츠 생성 방식 */}
          <div className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#191F28] flex items-center gap-2">
              <span className="w-1 h-5 bg-[#3182F6] rounded-full"></span>
              인공지능(AI)을 활용한 콘텐츠 생성
            </h2>
            <p className="text-sm sm:text-base text-[#4E5968] leading-relaxed pl-3">
              원천 행정 자료의 딱딱하고 어려운 용어들을 주민 여러분이 직관적이고 친근하게 읽으실 수 있도록 <strong className="text-[#191F28] font-semibold">구글 제미나이(Gemini) AI 기술</strong>을 도입해 블로그 포스트를 자동으로 재구성하고 있습니다. 
              다만, AI의 특성상 세부 내용에 오류가 있을 수 있으므로 주요 신청 및 일정 등 정확한 최종 내용은 본문에 함께 제공되는 <strong className="text-[#191F28] font-semibold">원문 출처 링크</strong>를 통해 한 번 더 확인하시길 권장합니다.
            </p>
          </div>
        </section>

        <div className="pt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl text-white bg-[#3182F6] hover:bg-[#1b64da] transition-all shadow-sm"
          >
            홈으로 돌아가기
          </Link>
        </div>
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
