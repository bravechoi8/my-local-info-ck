"use client";

export default function CoupangBanner() {
  const partnerId = process.env.NEXT_PUBLIC_COUPANG_PARTNER_ID || process.env.COUPANG_AF_ID || "AF4596301";

  return (
    <div className="my-8 w-full overflow-hidden rounded-2xl border border-red-100 dark:border-red-900/30 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 p-0.5 shadow-lg shadow-red-500/10">
      <div className="bg-white dark:bg-slate-900 rounded-[14px] p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-center md:text-left">
          <div className="w-12 h-12 rounded-xl bg-red-500 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-red-500/30 shrink-0">
            C
          </div>
          <div>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-red-500 bg-red-50 dark:bg-red-950/50 px-2.5 py-0.5 rounded-full border border-red-200 dark:border-red-800">
                쿠팡 파트너스 추천
              </span>
              <span className="text-xs text-slate-400">특가 혜택 파트너스</span>
            </div>
            <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1">
              오늘의 쿠팡 타임딜 & 인기 특가 상품 모음
            </h4>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              원하는 상품을 쿠팡 최저가 할인 가격으로 지금 바로 확인해보세요.
            </p>
          </div>
        </div>

        <a
          href={`https://www.coupang.com?subid=${partnerId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold text-sm shadow-md shadow-red-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
        >
          <span>쿠팡 특가 보러가기</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </a>
      </div>

      {/* 쿠팡 파트너스 공식 캐러셀 위젯 */}
      <div className="bg-slate-50 dark:bg-slate-900/80 px-4 py-3 border-t border-slate-100 dark:border-slate-800">
        <iframe
          src="https://ads-partners.coupang.com/widgets.html?id=987547&template=carousel&trackingCode=AF4596301&subId=&width=100%&height=140&tsource="
          width="100%"
          height="140"
          frameBorder="0"
          scrolling="no"
          referrerPolicy="unsafe-url"
          title="Coupang Partners Banner"
          className="w-full rounded-lg"
        />
        <div className="text-center mt-2">
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
          </span>
        </div>
      </div>
    </div>
  );
}
