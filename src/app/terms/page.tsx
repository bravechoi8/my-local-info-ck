import Link from 'next/link';

export const metadata = {
  title: "이용약관 | Terms of Service | 리얼인포",
  description: "리얼인포의 서비스 이용약관 안내 페이지입니다.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white text-[#333D4B] antialiased">
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
            <Link href="/blog" className="hover:text-[#191F28] transition-colors">블로그</Link>
            <Link href="/about" className="hover:text-[#191F28] transition-colors">소개</Link>
            <Link href="/privacy" className="hover:text-[#191F28] transition-colors">개인정보처리방침</Link>
            <Link href="/terms" className="text-[#3182F6]">이용약관 (Terms of Service)</Link>
          </div>
        </div>
      </nav>

      {/* 메인 콘텐츠 영역 */}
      <main className="max-w-3xl mx-auto px-6 py-20 space-y-16">
        <header className="space-y-4">
          <span className="inline-block text-xs font-bold text-[#3182F6] tracking-wider uppercase">
            Terms of Service
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#191F28] leading-tight">
            서비스 이용약관
          </h1>
          <p className="text-base sm:text-lg text-[#4E5968] leading-relaxed max-w-xl">
            리얼인포에서 제공하는 다양한 생활 정보 및 블로그 정보 서비스의 이용 조건과 절차를 규정합니다.
          </p>
        </header>

        {/* 상세 약관 내용 */}
        <section className="space-y-12 border-t border-[#F2F4F6] pt-12 text-sm sm:text-base text-[#4E5968] leading-relaxed">
          {/* 1. 목적 및 약관의 효력 */}
          <div className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#191F28] flex items-center gap-2">
              <span className="w-1 h-5 bg-[#3182F6] rounded-full"></span>
              1. 목적 및 약관의 효력
            </h2>
            <p className="pl-3">
              본 약관은 '리얼인포'가 운영하는 웹사이트(이하 '사이트')가 제공하는 모든 정보 및 제반 서비스의 이용에 관한 권리와 의무를 규정함을 목적으로 합니다. 본 약관의 내용은 웹사이트 화면에 게시하거나 기타의 방법으로 이용자에게 고지함으로써 효력이 발생합니다.
            </p>
          </div>

          {/* 2. 제공 서비스 및 책임 제한 */}
          <div className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#191F28] flex items-center gap-2">
              <span className="w-1 h-5 bg-[#3182F6] rounded-full"></span>
              2. 정보 제공 서비스 및 책임에 관한 한계
            </h2>
            <p className="pl-3">
              리얼인포는 정부 및 지자체, 공공데이터 포털, 그리고 일반 공개 뉴스의 신뢰성 높은 데이터를 기반으로 생활 정보를 안내합니다. 그러나 본 사이트의 정보 수집 및 편집에는 인공지능(AI) 자동화 가공 기술이 포함되어 있어, 수집된 내용 중 시차 또는 시스템 오류로 인해 부정확하거나 누락된 정보가 존재할 수 있습니다.
            </p>
            <p className="pl-3 font-semibold text-[#191F28]">
              따라서 이용자는 중요한 신청 기한, 자격 요건, 상세 제공 사항 등을 본 사이트의 내용에만 의존해서는 안 되며, 반드시 원본 출처 링크 혹은 관계 부처(시청, 구청 등)에 직접 최종 확인해야 합니다. 본 사이트의 정보만을 신뢰하여 행한 결정으로 인한 어떠한 손해에 대해서도 사이트 운영자는 책임을 지지 않습니다.
            </p>
          </div>

          {/* 3. 이용자의 의무 */}
          <div className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#191F28] flex items-center gap-2">
              <span className="w-1 h-5 bg-[#3182F6] rounded-full"></span>
              3. 이용자의 의무 및 저작권
            </h2>
            <p className="pl-3">
              본 사이트가 게재하는 오리지널 가공 글 및 이미지 자산의 지식재산권은 리얼인포에 귀속됩니다. 이용자는 사이트의 저작물에 대해 사전 서면 승인 없이 무단 복제, 배포, 전송 등의 상업적 행위를 해서는 안 됩니다.
            </p>
          </div>

          {/* 4. 서비스의 중단 */}
          <div className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#191F28] flex items-center gap-2">
              <span className="w-1 h-5 bg-[#3182F6] rounded-full"></span>
              4. 서비스의 일시 중단 및 약관 변경
            </h2>
            <p className="pl-3">
              사이트는 정기 점검, 서버 교체, 해킹 시도 등 통제할 수 없는 긴급 점검 필요시 서비스를 일시 중단할 수 있습니다. 또한 운영상의 중요한 이유가 있을 경우 본 이용약관을 변경할 수 있으며, 이 경우 공지사항 또는 팝업 등을 통해 고지합니다.
            </p>
          </div>

          {/* 5. 준거법 및 관할법원 */}
          <div className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#191F28] flex items-center gap-2">
              <span className="w-1 h-5 bg-[#3182F6] rounded-full"></span>
              5. 준거법 및 분쟁 해결
            </h2>
            <p className="pl-3">
              본 약관과 관련하여 발생하는 법적 분쟁 및 소송은 대한민국의 법률에 의거하여 해석되며, 소송 관할은 사이트 운영자의 소재지를 관할하는 법원을 전담 법원으로 지정합니다.
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
          <div className="space-y-2">
            <p>공식 데이터 및 주요 핫이슈 소식을 기반으로 작동하는 블로그 채널입니다.</p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-1 text-xs text-[#8B95A1]">
              <Link href="/privacy" className="hover:underline font-semibold">개인정보처리방침 (Privacy Policy)</Link>
              <span className="text-[#E5E8EB]">|</span>
              <Link href="/terms" className="hover:underline font-semibold">이용약관 (Terms of Service)</Link>
              <span className="text-[#E5E8EB]">|</span>
              <span className="font-semibold">문의: <a href="mailto:bravechoi8@gmail.com" className="hover:underline">bravechoi8@gmail.com</a></span>
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
