import Link from 'next/link';

export const metadata = {
  title: "개인정보처리방침 | Privacy Policy | 리얼인포",
  description: "리얼인포의 개인정보처리방침(Privacy Policy) 안내 페이지입니다.",
};

export default function PrivacyPolicyPage() {
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
            <Link href="/privacy" className="text-[#3182F6]">개인정보처리방침 (Privacy Policy)</Link>
            <Link href="/terms" className="hover:text-[#191F28] transition-colors">이용약관</Link>
          </div>
        </div>
      </nav>

      {/* 메인 콘텐츠 영역 */}
      <main className="max-w-3xl mx-auto px-6 py-20 space-y-16">
        <header className="space-y-4">
          <span className="inline-block text-xs font-bold text-[#3182F6] tracking-wider uppercase">
            Privacy Policy
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#191F28] leading-tight">
            개인정보처리방침 (Privacy Policy)
          </h1>
          <p className="text-base sm:text-lg text-[#4E5968] leading-relaxed max-w-xl">
            본 사이트(이하 '리얼인포')는 정보통신망 이용촉진 및 정보보호 등에 관한 법률 등 관련 법령에 의거하여 이용자의 개인정보를 보호하고 관련 고충을 신속하게 처리하기 위해 다음과 같은 처리방침을 두고 있습니다.
          </p>
        </header>

        {/* 상세 약관 내용 */}
        <section className="space-y-12 border-t border-[#F2F4F6] pt-12 text-sm sm:text-base text-[#4E5968] leading-relaxed">
          {/* 1. 개인정보 수집 항목 및 목적 */}
          <div className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#191F28] flex items-center gap-2">
              <span className="w-1 h-5 bg-[#3182F6] rounded-full"></span>
              1. 개인정보의 수집 항목 및 수집 목적
            </h2>
            <p className="pl-3">
              리얼인포는 별도의 회원가입 없이 누구나 자유롭게 콘텐츠를 조회할 수 있습니다. 본 사이트는 이용자가 서비스를 이용하는 과정에서 아래와 같은 정보들이 자동으로 생성되어 수집될 수 있습니다.
            </p>
            <ul className="list-disc pl-8 space-y-1.5">
              <li>수집 항목: IP 주소, 쿠키(Cookie), 접속 로그, 방문 일시, 서비스 이용 기록</li>
              <li>수집 목적: 불량 이용자의 부정 이용 방지, 비인간적인 봇 차단, 사이트 속도 최적화 및 접속 통계 분석</li>
            </ul>
          </div>

          {/* 2. 쿠키(Cookie) 및 구글 애드센스 광고 */}
          <div className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#191F28] flex items-center gap-2">
              <span className="w-1 h-5 bg-[#3182F6] rounded-full"></span>
              2. 쿠키(Cookie)의 운용 및 구글 애드센스 사용 안내
            </h2>
            <p className="pl-3">
              본 사이트는 이용자에게 맞춤화된 서비스 및 광고를 제공하기 위해 쿠키(Cookie)를 사용합니다. 쿠키란 웹사이트를 운영하는 데 이용되는 서버가 이용자의 브라우저에 보내는 아주 작은 텍스트 파일로 이용자의 컴퓨터 하드디스크에 저장됩니다.
            </p>
            <p className="pl-3">
              또한, 본 사이트는 제3자 광고 파트너인 <strong>구글 애드센스(Google AdSense)</strong>를 활용해 맞춤형 광고를 제공합니다. 구글은 쿠키를 사용하여 본 사이트 및 인터넷상의 다른 사이트 방문 기록을 바탕으로 이용자에게 가장 알맞은 광고를 게재할 수 있습니다.
            </p>
            <p className="pl-3 font-semibold text-[#191F28]">
              ※ 쿠키 수집 거부 방법:
            </p>
            <p className="pl-3">
              이용자는 쿠키 설치에 대한 선택권을 가지고 있습니다. 따라서 웹브라우저 설정(Chrome의 경우 설정 ➔ 개인정보 및 보안 ➔ 쿠키 및 기타 사이트 데이터)에서 쿠키 저장을 거부하거나 경고창이 뜨도록 설정하실 수 있습니다. 다만, 쿠키 설치를 거부할 경우 일부 서비스 이용에 어려움이 있을 수 있습니다.
            </p>
          </div>

          {/* 3. 제3자 제공 및 개인정보 위탁 */}
          <div className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#191F28] flex items-center gap-2">
              <span className="w-1 h-5 bg-[#3182F6] rounded-full"></span>
              3. 개인정보의 제3자 제공 및 처리 위탁
            </h2>
            <p className="pl-3">
              리얼인포는 이용자의 동의 없이 개인정보를 제3자에게 제공하거나 위탁하여 처리하지 않습니다. 법령의 규정에 의거하여 국가기관이나 수사기관의 요청이 있는 특별한 경우에 한해 관련 규정에 따라 제공될 수 있습니다.
            </p>
          </div>

          {/* 4. 개인정보의 보유 및 파기 */}
          <div className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#191F28] flex items-center gap-2">
              <span className="w-1 h-5 bg-[#3182F6] rounded-full"></span>
              4. 개인정보의 보유 기간 및 파기 절차
            </h2>
            <p className="pl-3">
              자동으로 수집된 시스템 로그 및 접속 기록은 서비스 품질 관리 및 부정 차단 목적으로 보관되며, 수집 및 이용 목적이 달성된 후에는 지체 없이 안전하게 파기됩니다.
            </p>
          </div>

          {/* 5. 개인정보 보호 책임자 연락처 */}
          <div className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#191F28] flex items-center gap-2">
              <span className="w-1 h-5 bg-[#3182F6] rounded-full"></span>
              5. 개인정보 보호 담당자 및 문의처
            </h2>
            <p className="pl-3">
              본 사이트의 개인정보 처리와 관련하여 문의 사항이 있으신 경우, 아래의 연락처로 연락해 주시면 신속하게 안내해 드리겠습니다.
            </p>
            <ul className="list-disc pl-8 space-y-1.5 font-medium text-[#191F28]">
              <li>이메일 문의: bravechoi8@gmail.com</li>
            </ul>
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
