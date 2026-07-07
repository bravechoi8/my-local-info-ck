"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import DarkModeToggle from "@/components/DarkModeToggle";

export default function CounterPage() {
  const [count, setCount] = useState<number>(0);
  const [mode, setMode] = useState<"inc" | "dec">("inc"); // 모바일 터치용 증감 모드
  const [hapticEnabled, setHapticEnabled] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [clickVolume, setClickVolume] = useState<number>(0.1);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // 사운드 피드백을 위한 Web Audio API 헬퍼 함수
  const playClickSound = (isIncrement: boolean) => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      // 증가할 때는 조금 더 높은 솔 톤(680Hz), 감소할 때는 낮은 도 톤(380Hz)
      const freq = isIncrement ? 680 : 380;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(clickVolume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      console.warn("Web Audio API blocked or not supported", e);
    }
  };

  // 모바일 햅틱 진동 피드백
  const triggerHaptic = () => {
    if (hapticEnabled && typeof window !== "undefined" && navigator.vibrate) {
      navigator.vibrate(15);
    }
  };

  // 1 증가 연산
  const handleIncrement = () => {
    setCount((prev) => prev + 1);
    playClickSound(true);
    triggerHaptic();
  };

  // 1 감소 연산
  const handleDecrement = () => {
    setCount((prev) => prev - 1);
    playClickSound(false);
    triggerHaptic();
  };

  // 리셋 연산
  const handleReset = () => {
    setCount(0);
    if (soundEnabled && typeof window !== "undefined") {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "triangle";
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } catch {}
    }
    triggerHaptic();
  };

  // 공유 기능 (현재 카운트 클립보드 복사)
  const handleShare = () => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(`현재 리얼인포 카운터 기록: ${count}회`);
      alert("카운트 숫자가 클립보드에 복사되었습니다!");
    }
  };

  // 넓은 초록색 바탕 클릭/터치 이벤트 핸들러
  // PC의 왼쪽 클릭(증가)/오른쪽 클릭(감소)을 모두 지원
  const handleBoardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    // 마우스 오른쪽 클릭 (Button: 2) -> 1 감소
    if (e.button === 2) {
      handleDecrement();
    } else {
      // 마우스 왼쪽 클릭 (Button: 0) 혹은 터치 -> 설정된 모드에 따라 작동
      if (mode === "inc") {
        handleIncrement();
      } else {
        handleDecrement();
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-slate-100 font-sans transition-colors duration-300">
      {/* 헤더 */}
      <header className="border-b border-slate-900 bg-[#0A0A0A]/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-sm font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent hover:opacity-80 transition"
            >
              리얼인포 🎮
            </Link>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
              클래식 카운터
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              &larr; 게임목록
            </Link>
            <DarkModeToggle />
          </div>
        </div>
      </header>

      {/* 스마트폰 뷰포트 레이아웃 모방 */}
      <main className="max-w-md mx-auto px-4 py-6 flex flex-col justify-between min-h-[calc(100vh-3.5rem)] animate-fadeIn">
        
        {/* 상단 액션 바 (카운터 타이틀 및 햄버거 메뉴) */}
        <section className="flex items-center justify-between pb-4">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-lg">☰</span>
              <h1 className="text-base font-black tracking-tight text-white">카운터</h1>
            </div>
          </div>
          <div className="text-xl opacity-60 hover:opacity-100 cursor-pointer">
            🎛️
          </div>
        </section>

        {/* 골드 프리미엄 배너 위젯 */}
        <section className="border border-[#d4af37]/30 bg-gradient-to-r from-[#1c170d] to-[#0f0e0a] rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#d4af37]/10 flex items-center justify-center border border-[#d4af37]/30 text-[#e5c158] text-lg">
              👑
            </div>
            <div>
              <h2 className="text-xs font-bold text-[#e5c158]">프리미엄 버전</h2>
              <p className="text-[9.5px] text-slate-400 leading-tight">위젯 • 자동화 • 광고 없음 평생 무료</p>
            </div>
          </div>
          <button
            onClick={() => alert("리얼인포 3D 장기 및 도구 모음은 모두 100% 무료 프리미엄 버전으로 서비스됩니다!")}
            className="px-4 py-1.5 bg-[#e5c158] hover:bg-[#ebd079] active:scale-95 text-black font-extrabold text-[10px] rounded-xl transition shadow-md"
          >
            자세히
          </button>
        </section>

        {/* 메인 초록색 카운터 카드 */}
        <section className="relative my-6 flex-1 flex flex-col justify-between select-none">
          
          {/* 초록색 메인 터치 보드 */}
          <div
            onMouseDown={handleBoardClick}
            onContextMenu={(e) => e.preventDefault()}
            className="w-full aspect-[9/11] bg-[#10b981] text-white rounded-[2.5rem] p-6 shadow-2xl relative flex flex-col justify-between overflow-hidden cursor-pointer hover:brightness-105 active:scale-[0.99] transition duration-200"
            style={{ touchAction: "none" }}
          >
            {/* 좌상단 공유 아이콘 */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleShare();
              }}
              className="absolute left-6 top-6 w-10 h-10 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-xl active:scale-90 transition z-20"
              title="카운터 값 복사"
            >
              🔗
            </div>

            {/* 우상단 옵션 조절 슬라이더 아이콘 */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                setShowSettings(!showSettings);
              }}
              className="absolute right-6 top-6 w-10 h-10 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-xl active:scale-90 transition z-20"
              title="설정 열기"
            >
              ⚙️
            </div>

            {/* 메인 숫자 표시 (중앙 정렬) */}
            <div className="flex-1 flex flex-col items-center justify-center gap-1">
              <span className="text-[120px] font-black leading-none drop-shadow-md tracking-tighter">
                {count}
              </span>
              <span className="text-2xl font-black opacity-80 select-none">
                {mode === "inc" ? "+1" : "-1"}
              </span>
            </div>

            {/* 하단 제어부 (감소 버튼, 증가 버튼, 리셋 버튼) */}
            <div className="flex items-center justify-between pt-4 relative z-10">
              
              {/* -1 버튼: 감소 모드로 토글하고 1을 직접 뺌 */}
              <button
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setMode("dec");
                  handleDecrement();
                }}
                className={`px-5 py-2.5 rounded-2xl text-base font-extrabold transition-all border ${
                  mode === "dec"
                    ? "bg-white text-[#10b981] border-white shadow-lg"
                    : "bg-black/15 text-white/90 border-transparent hover:bg-black/25"
                }`}
              >
                -1
              </button>

              {/* +1 버튼: 증가 모드로 토글하고 1을 직접 더함 */}
              <button
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setMode("inc");
                  handleIncrement();
                }}
                className={`px-5 py-2.5 rounded-2xl text-base font-extrabold transition-all border ${
                  mode === "inc"
                    ? "bg-white text-[#10b981] border-white shadow-lg"
                    : "bg-black/15 text-white/90 border-transparent hover:bg-black/25"
                }`}
              >
                +1
              </button>

              {/* 리셋 버튼: 0으로 초기화 */}
              <button
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleReset();
                }}
                className="w-11 h-11 rounded-2xl bg-black/15 hover:bg-black/25 flex items-center justify-center text-xl text-white font-extrabold transition"
                title="초기화"
              >
                🔄
              </button>
            </div>
          </div>

          {/* 설정 팝오버 슬라이드 */}
          {showSettings && (
            <div className="absolute inset-0 bg-[#0A0A0A]/95 rounded-[2.5rem] p-6 flex flex-col justify-between border border-slate-800 animate-fadeIn z-30">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-white">🎛️ 카운터 피드백 설정</h3>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    닫기 ✕
                  </button>
                </div>

                {/* 햅틱 진동 */}
                <div className="flex items-center justify-between text-xs py-1">
                  <span>진동 피드백 (모바일 전용)</span>
                  <button
                    onClick={() => setHapticEnabled(!hapticEnabled)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${
                      hapticEnabled ? "bg-[#10b981] text-white" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {hapticEnabled ? "켜짐" : "꺼짐"}
                  </button>
                </div>

                {/* 효과음 */}
                <div className="flex items-center justify-between text-xs py-1">
                  <span>클릭 사운드 효과음</span>
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${
                      soundEnabled ? "bg-[#10b981] text-white" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {soundEnabled ? "켜짐" : "꺼짐"}
                  </button>
                </div>

                {/* 볼륨 설정 */}
                {soundEnabled && (
                  <div className="space-y-1 py-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>효과음 볼륨</span>
                      <span>{Math.round(clickVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.01"
                      max="0.5"
                      step="0.01"
                      value={clickVolume}
                      onChange={(e) => setClickVolume(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#10b981]"
                    />
                  </div>
                )}
              </div>

              <div className="text-[10px] text-slate-500 leading-relaxed text-center pb-2">
                💡 <b>PC 꿀팁:</b> 초록색 판 위에서 <b>마우스 왼쪽 클릭</b>은 증가, <br />
                <b>마우스 오른쪽 클릭</b>은 즉시 감소하여 편리합니다!
              </div>
            </div>
          )}
        </section>

        {/* 하단 틱톡 스타일 모방 광고 배너 위젯 */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center font-bold text-lg text-white border border-slate-800">
              🎵
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">틱톡 TikTok</h3>
              <p className="text-[10px] text-slate-500">🔥 쇼트폼의 최강자 • 설치됨</p>
            </div>
          </div>
          <button
            onClick={() => alert("스폰서십 애드 배너 광고 예시입니다.")}
            className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white font-extrabold text-[10px] rounded-xl transition active:scale-95"
          >
            열기
          </button>
        </section>
      </main>

      {/* 푸터 */}
      <footer className="border-t border-slate-900 py-6 bg-[#050505] text-center text-[10px] text-slate-600">
        <p>© {new Date().getFullYear()} 리얼인포 클래식 카운터. 간편하고 템포 빠르게 숫자를 세어보세요.</p>
      </footer>
    </div>
  );
}
