"use client";

export default function CoupangBanner() {
  const partnerId = process.env.NEXT_PUBLIC_COUPANG_PARTNER_ID || process.env.COUPANG_AF_ID || "AF4596301";

  return (
    <div className="my-8 w-full overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
      {/* 쿠팡 파트너스 공식 위젯 (수정/변형 없이 그대로 제공) */}
      <iframe
        src={`https://ads-partners.coupang.com/widgets.html?id=987547&template=carousel&trackingCode=${partnerId}&subId=&width=100%&height=150&tsource=`}
        width="100%"
        height="150"
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
  );
}
