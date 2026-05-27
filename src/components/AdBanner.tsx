"use client";

import { useEffect, useRef } from "react";

export default function AdBanner() {
  const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_ID;
  const isAdsenseActive = adsenseId && adsenseId !== "" && adsenseId !== "나중에_입력";
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (isAdsenseActive && !hasInitialized.current) {
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        hasInitialized.current = true;
      } catch (e) {
        console.error(e);
      }
    }
  }, [isAdsenseActive]);

  if (!isAdsenseActive) return null;

  return (
    <div className="my-8 flex justify-center overflow-hidden w-full bg-slate-50/50 rounded-xl border border-slate-100 p-2 min-h-[100px] items-center">
      {/* 구글 애드센스 디스플레이 광고 */}
      <ins
        className="adsbygoogle"
        style={{ display: "block", width: "100%", minWidth: "250px" }}
        data-ad-client={adsenseId}
        data-ad-slot="auto"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
