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

  // 타이머 모달 열림 상태 추가
  const [isTimerOpen, setIsTimerOpen] = useState(false);

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

        {/* 가운데 영역: 참가자 관리 및 벌칙 선택 패널 */}
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

          {/* ⏱️ 스마트 멀티 타이머 실행 배너 카드 추가 */}
          <div
            onClick={() => setIsTimerOpen(true)}
            className="bg-gradient-to-br from-[#3182F6] to-[#0051C6] rounded-3xl p-5 border border-[#F2F4F6] shadow-[0_12px_40px_rgba(49,130,246,0.15)] flex items-center justify-between cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <div className="space-y-1 text-white">
              <span className="inline-block text-[9px] font-bold bg-white/20 px-2.5 py-0.5 rounded-full mb-1">
                스마트 유틸
              </span>
              <h3 className="text-sm font-extrabold">술자리 템포 조절 타이머 ⏱️</h3>
              <p className="text-[11px] text-white/80">일반 타이머, 뽀모도로, 일정 알림까지 한 번에 쓰기!</p>
            </div>
            <div className="text-white text-lg font-bold pr-2 animate-bounce">&rarr;</div>
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

      {/* ⏱️ 멀티 타이머 모달창 렌더링 */}
      {isTimerOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="max-w-sm w-full">
            <TimerPanel onClose={() => setIsTimerOpen(false)} />
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

// 웹 브라우저 호환성 멀티 타이머 컴포넌트 추가
function TimerPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'normal' | 'pomodoro' | 'timetable'>('normal');

  // 1. 일반 카운트다운 타이머
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isNormalRunning, setIsNormalRunning] = useState(false);
  const normalIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const normalTimeRef = useRef(0);

  // 2. 뽀모도로 타이머
  const [pomoWork, setPomoWork] = useState(25);
  const [pomoBreak, setPomoBreak] = useState(5);
  const [pomoState, setPomoState] = useState<'idle' | 'work' | 'break'>('idle');
  const [pomoSeconds, setPomoSeconds] = useState(0);
  const pomoIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 3. 시간표
  const [tableTime, setTableTime] = useState("");
  const [tableMemo, setTableMemo] = useState("");
  const [timetableItems, setTimetableItems] = useState<{ id: number; time: string; memo: string }[]>([]);

  // 4. 다이얼로그 모달 알림
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");

  const lastCheckedMinuteRef = useRef("");

  // 비프음 재생
  const playBeep = (isBreak = false) => {
    if (typeof window === 'undefined') return;
    try {
      const frequency = isBreak ? 440 : 880;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.4);
        }, i * 500);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 로컬 스토리지 로드
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPomo = localStorage.getItem('pomoSettings');
      if (savedPomo) {
        try {
          const parsed = JSON.parse(savedPomo);
          setPomoWork(parsed.workMin || 25);
          setPomoBreak(parsed.breakMin || 5);
        } catch (e) {}
      }
      const savedTable = localStorage.getItem('timetableItems');
      if (savedTable) {
        try {
          setTimetableItems(JSON.parse(savedTable));
        } catch (e) {}
      }
    }
  }, []);

  // 시간 조정
  const adjustTime = (type: 'hours' | 'minutes' | 'seconds', amount: number) => {
    if (isNormalRunning) return;
    if (type === 'hours') {
      setHours(prev => {
        let n = prev + amount;
        if (n > 99) return 0;
        if (n < 0) return 99;
        return n;
      });
    } else if (type === 'minutes') {
      setMinutes(prev => {
        let n = prev + amount;
        if (n > 59) return 0;
        if (n < 0) return 59;
        return n;
      });
    } else if (type === 'seconds') {
      setSeconds(prev => {
        let n = prev + amount;
        if (n > 59) return 0;
        if (n < 0) return 59;
        return n;
      });
    }
  };

  // 일반 타이머 제어
  const startNormalTimer = () => {
    if (isNormalRunning) return;
    const total = (hours * 3600) + (minutes * 60) + seconds;
    if (total <= 0) {
      alert("시간을 설정해 주세요.");
      return;
    }
    setIsNormalRunning(true);
    normalTimeRef.current = total;
    normalIntervalRef.current = setInterval(() => {
      if (normalTimeRef.current <= 0) {
        if (normalIntervalRef.current) clearInterval(normalIntervalRef.current);
        normalIntervalRef.current = null;
        setIsNormalRunning(false);
        playBeep(false);
        setHours(0);
        setMinutes(0);
        setSeconds(0);
        setDialogMessage("시간이 종료되었습니다!");
        setDialogOpen(true);
        return;
      }
      normalTimeRef.current -= 1;
      setHours(Math.floor(normalTimeRef.current / 3600));
      setMinutes(Math.floor((normalTimeRef.current % 3600) / 60));
      setSeconds(normalTimeRef.current % 60);
    }, 1000);
  };

  const stopNormalTimer = () => {
    if (normalIntervalRef.current) clearInterval(normalIntervalRef.current);
    normalIntervalRef.current = null;
    setIsNormalRunning(false);
  };

  const resetNormalTimer = () => {
    stopNormalTimer();
    setHours(0);
    setMinutes(0);
    setSeconds(0);
  };

  // 뽀모도로 타이머 제어
  const startPomodoro = () => {
    if (pomoIntervalRef.current) return;
    setPomoState('work');
    setPomoSeconds(pomoWork * 60);
    localStorage.setItem('pomoSettings', JSON.stringify({ workMin: pomoWork, breakMin: pomoBreak }));
    pomoIntervalRef.current = setInterval(() => {
      setPomoSeconds(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (pomoState !== 'idle' && pomoSeconds === 0 && pomoIntervalRef.current) {
      if (pomoState === 'work') {
        playBeep(false);
        setPomoState('break');
        setPomoSeconds(pomoBreak * 60);
        setDialogMessage("작업 시간이 끝났습니다! 휴식을 취하세요.");
        setDialogOpen(true);
      } else if (pomoState === 'break') {
        playBeep(true);
        setPomoState('work');
        setPomoSeconds(pomoWork * 60);
        setDialogMessage("휴식 시간이 끝났습니다! 다시 시작하세요.");
        setDialogOpen(true);
      }
    }
  }, [pomoSeconds, pomoState, pomoWork, pomoBreak]);

  const stopPomodoro = () => {
    if (pomoIntervalRef.current) clearInterval(pomoIntervalRef.current);
    pomoIntervalRef.current = null;
  };

  const resetPomodoro = () => {
    stopPomodoro();
    setPomoState('idle');
    setPomoSeconds(0);
  };

  // 시간표 감시
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const hrs = now.getHours().toString().padStart(2, '0');
      const mins = now.getMinutes().toString().padStart(2, '0');
      const currentTimeStr = `${hrs}:${mins}`;

      if (currentTimeStr !== lastCheckedMinuteRef.current) {
        const matched = timetableItems.filter(item => item.time === currentTimeStr);
        if (matched.length > 0) {
          lastCheckedMinuteRef.current = currentTimeStr;
          playBeep(false);
          const msgs = matched.map(m => `[${m.time}] ${m.memo}`).join('\n');
          setDialogMessage(`시간표 알림:\n${msgs}`);
          setDialogOpen(true);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [timetableItems]);

  const addTimetableItem = () => {
    if (!tableTime) {
      alert("시각을 설정해 주세요.");
      return;
    }
    const newItem = {
      id: Date.now(),
      time: tableTime,
      memo: tableMemo || "알림"
    };
    const updated = [...timetableItems, newItem].sort((a, b) => a.time.localeCompare(b.time));
    setTimetableItems(updated);
    localStorage.setItem('timetableItems', JSON.stringify(updated));
    setTableMemo("");
  };

  const deleteTimetableItem = (id: number) => {
    const updated = timetableItems.filter(item => item.id !== id);
    setTimetableItems(updated);
    localStorage.setItem('timetableItems', JSON.stringify(updated));
  };

  // 뽀모도로 포맷
  const getPomoTimeStr = () => {
    const m = Math.floor(pomoSeconds / 60).toString().padStart(2, '0');
    const s = (pomoSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F2F4F6] shadow-[0_12px_40px_rgba(0,0,0,0.03)] space-y-6 relative">
      {/* 모달 닫기(✕) 버튼 */}
      <button 
        onClick={onClose} 
        className="absolute top-6 right-6 text-[#8B95A1] hover:text-[#4E5968] font-bold text-lg transition-colors"
      >
        ✕
      </button>

      <div className="text-center space-y-2 pr-6">
        <span className="inline-block px-3 py-1 text-[11px] font-bold rounded-full bg-[#E8F3FF] text-[#3182F6]">
          멀티 타이머 ⏱️
        </span>
        <h2 className="text-lg font-bold text-[#191F28]">내 스마트 타이머</h2>
        <p className="text-xs text-[#8B95A1]">룰렛 게임 중 시간 관리나 벌칙 시간 측정에 활용해 보세요!</p>
      </div>

      {/* 탭 버튼 */}
      <div className="flex bg-[#F2F4F6] p-1 rounded-2xl">
        <button
          onClick={() => { resetNormalTimer(); resetPomodoro(); setTab('normal'); }}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${tab === 'normal' ? 'bg-white text-[#191F28] shadow-sm' : 'text-[#8B95A1] hover:text-[#4E5968]'}`}
        >
          일반 타이머
        </button>
        <button
          onClick={() => { resetNormalTimer(); resetPomodoro(); setTab('pomodoro'); }}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${tab === 'pomodoro' ? 'bg-white text-[#191F28] shadow-sm' : 'text-[#8B95A1] hover:text-[#4E5968]'}`}
        >
          뽀모도로
        </button>
        <button
          onClick={() => { resetNormalTimer(); resetPomodoro(); setTab('timetable'); }}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${tab === 'timetable' ? 'bg-white text-[#191F28] shadow-sm' : 'text-[#8B95A1] hover:text-[#4E5968]'}`}
        >
          시간표 알림
        </button>
      </div>

      {/* 1. 일반 카운트다운 타이머 */}
      {tab === 'normal' && (
        <div className="space-y-6">
          <div className="flex justify-center gap-4">
            {/* 시간 */}
            <div className="flex flex-col items-center">
              <div className="flex items-center border border-[#E5E8EB] rounded-2xl bg-[#F9FAFB] p-2 focus-within:border-[#3182F6]">
                <span className="text-2xl font-bold px-3 py-1 w-12 text-center text-[#191F28]">{hours.toString().padStart(2, '0')}</span>
                <div className="flex flex-col text-[10px] pr-1">
                  <button onClick={() => adjustTime('hours', 1)} className="hover:bg-[#E5E8EB] p-0.5 rounded">▲</button>
                  <button onClick={() => adjustTime('hours', -1)} className="hover:bg-[#E5E8EB] p-0.5 rounded">▼</button>
                </div>
              </div>
              <span className="text-[11px] text-[#8B95A1] mt-1.5 font-medium">시간</span>
            </div>
            
            {/* 분 */}
            <div className="flex flex-col items-center">
              <div className="flex items-center border border-[#E5E8EB] rounded-2xl bg-[#F9FAFB] p-2 focus-within:border-[#3182F6]">
                <span className="text-2xl font-bold px-3 py-1 w-12 text-center text-[#191F28]">{minutes.toString().padStart(2, '0')}</span>
                <div className="flex flex-col text-[10px] pr-1">
                  <button onClick={() => adjustTime('minutes', 1)} className="hover:bg-[#E5E8EB] p-0.5 rounded">▲</button>
                  <button onClick={() => adjustTime('minutes', -1)} className="hover:bg-[#E5E8EB] p-0.5 rounded">▼</button>
                </div>
              </div>
              <span className="text-[11px] text-[#8B95A1] mt-1.5 font-medium">분</span>
            </div>

            {/* 초 */}
            <div className="flex flex-col items-center">
              <div className="flex items-center border border-[#E5E8EB] rounded-2xl bg-[#F9FAFB] p-2 focus-within:border-[#3182F6]">
                <span className="text-2xl font-bold px-3 py-1 w-12 text-center text-[#191F28]">{seconds.toString().padStart(2, '0')}</span>
                <div className="flex flex-col text-[10px] pr-1">
                  <button onClick={() => adjustTime('seconds', 1)} className="hover:bg-[#E5E8EB] p-0.5 rounded">▲</button>
                  <button onClick={() => adjustTime('seconds', -1)} className="hover:bg-[#E5E8EB] p-0.5 rounded">▼</button>
                </div>
              </div>
              <span className="text-[11px] text-[#8B95A1] mt-1.5 font-medium">초</span>
            </div>
          </div>

          <div className="flex gap-2">
            {!isNormalRunning ? (
              <button onClick={startNormalTimer} className="flex-grow py-3 bg-[#3182F6] hover:bg-[#1b64da] text-white font-bold rounded-2xl text-sm transition-colors">시작</button>
            ) : (
              <button onClick={stopNormalTimer} className="flex-grow py-3 bg-[#F04452] hover:bg-[#d83542] text-white font-bold rounded-2xl text-sm transition-colors">정지</button>
            )}
            <button onClick={resetNormalTimer} className="px-5 py-3 bg-[#E5E8EB] hover:bg-[#D5D8DB] text-[#4E5968] font-bold rounded-2xl text-sm transition-colors">리셋</button>
          </div>
        </div>
      )}

      {/* 2. 뽀모도로 타이머 */}
      {tab === 'pomodoro' && (
        <div className="space-y-6">
          {pomoState === 'idle' ? (
            <div className="flex gap-4">
              <div className="flex-1 flex flex-col items-center">
                <input
                  type="number"
                  value={pomoWork}
                  onChange={(e) => setPomoWork(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-center border border-[#E5E8EB] rounded-2xl bg-[#F9FAFB] p-3 text-lg font-bold focus:outline-none focus:border-[#3182F6]"
                />
                <span className="text-[11px] text-[#8B95A1] mt-1.5">작업 (분)</span>
              </div>
              <div className="flex-1 flex flex-col items-center">
                <input
                  type="number"
                  value={pomoBreak}
                  onChange={(e) => setPomoBreak(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-center border border-[#E5E8EB] rounded-2xl bg-[#F9FAFB] p-3 text-lg font-bold focus:outline-none focus:border-[#3182F6]"
                />
                <span className="text-[11px] text-[#8B95A1] mt-1.5">휴식 (분)</span>
              </div>
            </div>
          ) : (
            <div className="text-center bg-[#F9FAFB] rounded-2xl p-6 border border-[#F2F4F6] space-y-1">
              <div className={`text-xs font-bold ${pomoState === 'work' ? 'text-[#3182F6]' : 'text-[#4ECA54]'}`}>
                {pomoState === 'work' ? '작업하는 시간 ✍️' : '꿀맛 같은 휴식 ☕'}
              </div>
              <div className="text-4xl font-extrabold text-[#191F28] tracking-tight">{getPomoTimeStr()}</div>
            </div>
          )}

          <div className="flex gap-2">
            {pomoState === 'idle' || !pomoIntervalRef.current ? (
              <button onClick={startPomodoro} className="flex-grow py-3 bg-[#3182F6] hover:bg-[#1b64da] text-white font-bold rounded-2xl text-sm transition-colors">시작</button>
            ) : (
              <button onClick={stopPomodoro} className="flex-grow py-3 bg-[#F04452] hover:bg-[#d83542] text-white font-bold rounded-2xl text-sm transition-colors">정지</button>
            )}
            <button onClick={resetPomodoro} className="px-5 py-3 bg-[#E5E8EB] hover:bg-[#D5D8DB] text-[#4E5968] font-bold rounded-2xl text-sm transition-colors">리셋</button>
          </div>
        </div>
      )}

      {/* 3. 시간표 알림 */}
      {tab === 'timetable' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="time"
              value={tableTime}
              onChange={(e) => setTableTime(e.target.value)}
              className="border border-[#E5E8EB] rounded-2xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#3182F6] bg-white flex-grow"
            />
            <input
              type="text"
              placeholder="메모"
              value={tableMemo}
              onChange={(e) => setTableMemo(e.target.value)}
              className="border border-[#E5E8EB] rounded-2xl p-2.5 text-xs focus:outline-none focus:border-[#3182F6] bg-white flex-[2]"
            />
            <button onClick={addTimetableItem} className="px-4 py-2.5 bg-[#3182F6] hover:bg-[#1b64da] text-white text-xs font-bold rounded-2xl transition-colors">추가</button>
          </div>

          <div className="max-h-40 overflow-y-auto bg-[#F9FAFB] rounded-2xl p-3 border border-[#F2F4F6] space-y-1.5">
            {timetableItems.length === 0 ? (
              <div className="text-center text-xs text-[#8B95A1] py-4">등록된 정기 일정이 없습니다.</div>
            ) : (
              timetableItems.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-white px-3 py-2 rounded-xl border border-[#E5E8EB]">
                  <div className="text-xs">
                    <strong className="text-[#3182F6] font-bold">{item.time}</strong>
                    <span className="text-[#4E5968] ml-2 font-medium">{item.memo}</span>
                  </div>
                  <button onClick={() => deleteTimetableItem(item.id)} className="text-[11px] font-bold text-[#FF4D4D] hover:underline">삭제</button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 자체 알림 모달 */}
      {dialogOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full text-center space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-[#191F28]">🔔 타이머 알림</h3>
            <p className="text-xs text-[#4E5968] whitespace-pre-line leading-relaxed">{dialogMessage}</p>
            <button
              onClick={() => setDialogOpen(false)}
              className="w-full py-2.5 bg-[#1D1D1B] hover:bg-black text-white font-bold rounded-xl text-xs transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
