"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// 재미있는 벌칙(내기) 템플릿 목록
const PUNISHMENTS = [
  { id: "all", label: "술값 전체 독박 💸", text: "술값 전체를 시원하게 계산합니다!" },
  { id: "coffee", label: "커피 쏘기 ☕", text: "모두에게 커피를 한 잔씩 대접합니다!" },
  { id: "half", label: "절반만 내기 🌓", text: "술값의 정확히 절반을 부담합니다!" },
  { id: "one-shot", label: "소주 원샷 🍻", text: "벌주 한 잔을 남김없이 비워냅니다!" },
  { id: "sing", label: "노래 한 곡 하기 🎤", text: "모임 분위기를 위해 멋진 노래 한 곡을 부릅니다!" }
];

// 조각별로 칠해질 예쁜 파스텔 톤 색상 목록
const COLORS = [
  "#FF6B6B", // 살짝 붉은색
  "#4D96FF", // 시원한 파란색
  "#6BCB77", // 싱그러운 초록색
  "#FFD93D", // 귀여운 노란색
  "#F473B9", // 화사한 핑크색
  "#9B72AA", // 차분한 보라색
  "#FFB3B3", // 연한 살구색
  "#79DAE8"  // 상쾌한 민트색
];

export default function RoulettePage() {
  // 모임 참가자 목록 (초기값 4명)
  const [participants, setParticipants] = useState<string[]>([
    "김철수", "이영희", "박민수", "최수지"
  ]);
  const [newParticipant, setNewParticipant] = useState("");
  
  // 내기 벌칙 선택 상태 (기본값: 술값 전체 독박)
  const [selectedPunishment, setSelectedPunishment] = useState(PUNISHMENTS[0]);

  // 룰렛 회전 관련 상태
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);

  // 룰렛이 끝났을 때 종이가루 효과(이펙트) 제어
  const [showConfetti, setShowConfetti] = useState(false);

  // 참가자 추가 함수
  const addParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newParticipant.trim();
    if (!name) return;
    if (participants.length >= 10) {
      alert("참가자는 최대 10명까지만 등록할 수 있습니다!");
      return;
    }
    if (participants.includes(name)) {
      alert("이미 동일한 이름이 참가자 목록에 있습니다!");
      return;
    }
    setParticipants([...participants, name]);
    setNewParticipant("");
    setWinner(null);
  };

  // 참가자 삭제 함수
  const removeParticipant = (index: number) => {
    if (participants.length <= 2) {
      alert("룰렛을 돌리려면 최소 2명 이상의 참가자가 필요합니다!");
      return;
    }
    const updated = participants.filter((_, i) => i !== index);
    setParticipants(updated);
    setWinner(null);
  };

  // 참가자 이름 수정 함수
  const updateParticipantName = (index: number, newName: string) => {
    const updated = [...participants];
    updated[index] = newName;
    setParticipants(updated);
  };

  // 룰렛 돌리기 실행 함수
  const spinRoulette = () => {
    if (isSpinning) return;
    
    setIsSpinning(true);
    setWinner(null);
    setShowConfetti(false);

    // 5바퀴에서 10바퀴 사이로 무작위 회전 각도 결정 (한 바퀴는 360도)
    const extraDegree = Math.floor(Math.random() * 360);
    const totalSpin = rotation + (360 * 8) + extraDegree;
    
    setRotation(totalSpin);

    // 5초 후 회전 애니메이션이 완전히 정지했을 때 당첨자 판정
    setTimeout(() => {
      setIsSpinning(false);
      
      // 12시 방향(상단 바늘)에 걸린 인덱스를 역산하는 수학 계산식
      // 룰렛판이 시계방향으로 회전하므로 12시 바늘(가장 윗부분, -90도 기준)을 계산합니다.
      const numParticipants = participants.length;
      const anglePerParticipant = 360 / numParticipants;
      
      // 회전값에서 한 바퀴 미만의 순수 각도만 추출
      const relativeAngle = (totalSpin % 360);
      
      // 바늘(12시 방향)이 가리키는 내부 조각 번호 계산
      // 룰렛 원판이 -90도 회전(12시 방향이 0도 시작)된 채로 렌더링되므로,
      // 12시 바늘이 가리키는 판 내부의 각도는 단순히 (360 - 회전각도)가 됩니다.
      const targetAngle = (360 - relativeAngle) % 360;
      const winningIndex = Math.floor(targetAngle / anglePerParticipant) % numParticipants;
      
      setWinner(participants[winningIndex]);
      setShowConfetti(true);
    }, 5000); // 5000ms = CSS 트랜지션 시간과 일치시킴
  };

  // SVG 원판 조각(Pie Slice) 생성 계산을 위한 헬퍼 함수
  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#333D4B] antialiased flex flex-col justify-between">
      {/* 상단 헤더 네비게이션 */}
      <nav className="bg-white border-b border-[#F2F4F6] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-[#191F28] hover:text-[#3182F6] transition-colors">
            &larr; 홈으로 돌아가기
          </Link>
          <span className="text-xs font-semibold text-[#8B95A1] tracking-wider">복불복 룰렛 판</span>
        </div>
      </nav>

      {/* 중앙 메인 레이아웃 */}
      <main className="max-w-4xl mx-auto w-full px-6 py-10 flex-grow grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* 왼쪽 영역: 룰렛 원판 판넬 */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F2F4F6] shadow-[0_12px_40px_rgba(0,0,0,0.03)] flex flex-col items-center justify-center space-y-6">
          <div className="text-center space-y-2">
            <span className="inline-block px-3 py-1 text-[11px] font-bold rounded-full bg-[#FFEAEB] text-[#F04452]">
              벌칙 룰렛 돌리기
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#191F28]">
              과연 오늘의 당첨자는? 🎯
            </h1>
            <p className="text-xs sm:text-sm text-[#8B95A1]">
              바늘이 가리키는 곳에 걸린 사람이 오늘의 벌칙 왕이 됩니다.
            </p>
          </div>

          {/* 룰렛 그래픽 컴포넌트 영역 */}
          <div className="relative w-72 h-72 sm:w-80 sm:h-80 my-4">
            
            {/* 12시 방향 상단 삼각 바늘 (인디케이터) */}
            <div className="absolute top-[-10px] left-1/2 transform -translate-x-1/2 z-20">
              <svg width="24" height="28" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 28L0 4C0 4 5 -1.25829e-06 12 0C19 1.25829e-06 24 4 24 4L12 28Z" fill="#F04452" />
                <path d="M12 20L4 4C4 4 7 1 12 1C17 1 20 4 20 4L12 20Z" fill="#FFEAEB" />
              </svg>
            </div>

            {/* 빙글빙글 도는 룰렛 원판 바디 */}
            <div
              className="w-full h-full rounded-full border-[8px] border-[#F2F4F6] shadow-xl overflow-hidden relative"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning
                  ? "transform 5s cubic-bezier(0.1, 0.8, 0.1, 1)" // 천천히 감속하며 서서히 멈추는 효과
                  : "none",
              }}
            >
              <svg viewBox="-1 -1 2 2" className="w-full h-full transform -rotate-90">
                {/* 참가자 명수에 따라 균등하게 파이 조각들을 그립니다. */}
                {participants.map((name, index) => {
                  const numP = participants.length;
                  const slicePercent = 1 / numP;
                  const startPercent = index * slicePercent;
                  const endPercent = (index + 1) * slicePercent;
                  
                  const [startX, startY] = getCoordinatesForPercent(startPercent);
                  const [endX, endY] = getCoordinatesForPercent(endPercent);
                  
                  // 큰 호를 그리는 기준 여부 결정 (참가자가 1명이면 360도 전체이나, 룰렛 특성상 최소 2명 이상이므로 항상 0)
                  const largeArcFlag = slicePercent > 0.5 ? 1 : 0;
                  
                  // 조각의 가운데 각도를 구해서 텍스트 방향을 회전시킵니다.
                  const midPercent = startPercent + (slicePercent / 2);
                  const angleRad = 2 * Math.PI * midPercent;
                  const textX = Math.cos(angleRad) * 0.6;
                  const textY = Math.sin(angleRad) * 0.6;
                  const angleDeg = (midPercent * 360) + 90; // 글씨가 원판 중심에서 바깥 방향을 바라보게 보정

                  return (
                    <g key={index}>
                      {/* 부채꼴 조각 그리기 */}
                      <path
                        d={`M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`}
                        fill={COLORS[index % COLORS.length]}
                        stroke="#FFFFFF"
                        strokeWidth="0.015"
                      />
                      {/* 조각 위에 이름 텍스트 얹기 */}
                      <text
                        x={textX}
                        y={textY}
                        fill="#FFFFFF"
                        fontSize="0.12"
                        fontWeight="bold"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${angleDeg}, ${textX}, ${textY})`}
                      >
                        {name.length > 4 ? name.substring(0, 3) + ".." : name}
                      </text>
                    </g>
                  );
                })}
                {/* 룰렛 정중앙 금속 핀 데코 */}
                <circle cx="0" cy="0" r="0.12" fill="#FFFFFF" shadow-sm="true" />
                <circle cx="0" cy="0" r="0.08" fill="#1D1D1B" />
              </svg>
            </div>
          </div>

          {/* 실행 제어 버튼 */}
          <button
            onClick={spinRoulette}
            disabled={isSpinning || participants.length < 2}
            className="w-full py-4 bg-[#1D1D1B] hover:bg-black text-white font-bold rounded-2xl transition-all shadow-md active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 text-sm sm:text-base"
          >
            {isSpinning ? "두근두근... 결과 기다리는 중 🤔" : "룰렛 돌리기 🎯"}
          </button>
        </div>

        {/* 오른쪽 영역: 참가자 관리 및 벌칙 선택 패널 */}
        <div className="space-y-6">
          
          {/* 벌칙 종류 선택 박스 */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F2F4F6] shadow-[0_12px_40px_rgba(0,0,0,0.03)] space-y-4">
            <h2 className="text-sm font-bold text-[#191F28] flex items-center gap-1.5">
              🎭 오늘의 내기 종류 선택
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {PUNISHMENTS.map((punish) => (
                <button
                  key={punish.id}
                  onClick={() => setSelectedPunishment(punish)}
                  className={`px-3 py-2.5 text-xs font-semibold rounded-xl border transition-all text-center ${
                    selectedPunishment.id === punish.id
                      ? "border-[#F04452] bg-[#FFEAEB] text-[#F04452]"
                      : "border-[#E5E8EB] hover:bg-[#F9FAFB] text-[#4E5968]"
                  }`}
                >
                  {punish.label.split(" ")[0]} {punish.label.substring(punish.label.indexOf(" ") + 1)}
                </button>
              ))}
            </div>
            <div className="bg-[#F9FAFB] rounded-2xl p-4 text-xs text-[#6B7684]">
              선택한 룰렛 내기: <strong>{selectedPunishment.label}</strong>
              <p className="mt-1">{selectedPunishment.text}</p>
            </div>
          </div>

          {/* 참가자 목록 편집기 */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F2F4F6] shadow-[0_12px_40px_rgba(0,0,0,0.03)] space-y-4">
            <h2 className="text-sm font-bold text-[#191F28] flex items-center gap-1.5">
              👥 참가자 명단 관리 ({participants.length}명 / 최대 10명)
            </h2>
            
            {/* 참가자 신규 추가 폼 */}
            <form onSubmit={addParticipant} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newParticipant}
                onChange={(e) => setNewParticipant(e.target.value)}
                placeholder="새 이름 입력"
                maxLength={8}
                className="w-full sm:flex-grow px-4 py-2.5 rounded-xl border border-[#E5E8EB] focus:outline-none focus:border-[#3182F6] text-xs sm:text-sm bg-white"
              />
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-2.5 bg-[#3182F6] hover:bg-[#1b64da] text-white text-xs font-bold rounded-xl whitespace-nowrap transition-colors"
              >
                추가
              </button>
            </form>

            {/* 현재 참가자 목록 (인라인 수정 및 삭제 가능) */}
            <div className="max-h-56 overflow-y-auto border border-[#F2F4F6] rounded-2xl p-2.5 space-y-1 bg-[#F9FAFB]">
              {participants.map((name, index) => (
                <div key={index} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-[#E5E8EB]">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => updateParticipantName(index, e.target.value)}
                    maxLength={8}
                    className="font-semibold text-xs sm:text-sm text-[#191F28] bg-transparent focus:outline-none focus:underline w-2/3"
                  />
                  <button
                    type="button"
                    onClick={() => removeParticipant(index)}
                    className="text-xs font-bold text-[#FF4D4D] hover:underline"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* 당첨 결과 발표 팝업창 (룰렛 완료 후 등장) */}
      {winner && showConfetti && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full border border-[#F2F4F6] text-center space-y-6 shadow-2xl transform scale-100 transition-all">
            <div className="space-y-2">
              <span className="text-4xl">🎉</span>
              <h3 className="text-lg font-bold text-[#8B95A1] tracking-tight">벌칙 당첨!</h3>
              <h2 className="text-2xl sm:text-3xl font-black text-[#191F28] tracking-tight break-all">
                {winner}님!
              </h2>
            </div>
            
            <div className="bg-[#FFEAEB] text-[#F04452] rounded-2xl p-4 border border-[#FFD5D6] text-xs sm:text-sm font-bold">
              📢 벌칙: {selectedPunishment.label}
              <p className="font-normal text-[11px] text-[#8B95A1] mt-1">당첨자는 약속대로 {selectedPunishment.text}</p>
            </div>

            <button
              onClick={() => {
                setWinner(null);
                setShowConfetti(false);
              }}
              className="w-full py-3 bg-[#1D1D1B] hover:bg-black text-white font-bold rounded-xl text-xs sm:text-sm transition-colors"
            >
              닫기 및 재도전 🍀
            </button>
          </div>
        </div>
      )}

      {/* 하단 푸터 영역 */}
      <footer className="bg-white border-t border-[#F2F4F6] py-6 px-6 text-center text-xs text-[#8B95A1]">
        <div className="max-w-4xl mx-auto space-y-1">
          <p>© {new Date().getFullYear()} 복불복 술값 계산 룰렛 엔진. 재미로 함께 웃으며 즐겨주세요.</p>
        </div>
      </footer>
    </div>
  );
}
