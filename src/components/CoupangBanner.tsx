"use client";

export default function CoupangBanner() {
  const partnerId = process.env.NEXT_PUBLIC_COUPANG_PARTNER_ID;
  const isActive = partnerId && partnerId !== "" && partnerId !== "나중에_입력";

  if (!isActive) return null;

  return (
    <div className="my-6 flex flex-col items-center w-full overflow-hidden rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      {/* 쿠팡 파트너스 배너 */}
      <iframe
        src="https://ads-partners.coupang.com/widgets.html?id=987547&template=carousel&trackingCode=AF4596301&subId=&width=100%&height=150&tsource="
        width="100%"
        height="150"
        frameBorder="0"
        scrolling="no"
        referrerPolicy="unsafe-url"
        title="Coupang Partners Banner"
        className="w-full"
      />
      <span className="text-[10px] text-slate-400 mt-2">
        이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
      </span>
    </div>
  );
}
