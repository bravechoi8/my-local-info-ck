"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function TimerPage() {
  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#333D4B] antialiased flex flex-col justify-between">
      {/* 상단 헤더 네비게이션 */}
      <nav className="bg-white border-b border-[#F2F4F6] px-6 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-[#191F28] hover:text-[#3182F6] transition-colors">
            &larr; 홈으로 돌아가기
          </Link>
          <span className="text-xs font-semibold text-[#8B95A1] tracking-wider">스마트 타이머</span>
        </div>
      </nav>

      {/* 중앙 메인 레이아웃 */}
      <main className="max-w-md mx-auto w-full px-6 py-12 flex-grow flex items-center justify-center">
        <div className="w-full">
          <TimerPanel />
        </div>
      </main>

      {/* 하단 푸터 영역 */}
      <footer className="bg-white border-t border-[#F2F4F6] py-6 px-6 text-center text-xs text-[#8B95A1]">
        <div className="max-w-md mx-auto space-y-1">
          <p>© {new Date().getFullYear()} 유용한 멀티 타이머. 일상 속 생산성을 높여보세요.</p>
        </div>
      </footer>
    </div>
  );
}

// 웹 호환성 멀티 타이머 컴포넌트
function TimerPanel() {
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
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F2F4F6] shadow-[0_12px_40px_rgba(0,0,0,0.03)] space-y-6">
      <div className="text-center space-y-2">
        <span className="inline-block px-3 py-1 text-[11px] font-bold rounded-full bg-[#E8F3FF] text-[#3182F6]">
          멀티 타이머 ⏱️
        </span>
        <h2 className="text-lg font-bold text-[#191F28]">내 스마트 타이머</h2>
        <p className="text-xs text-[#8B95A1]">시간 관리나 생산성 관리에 자유롭게 활용해 보세요!</p>
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
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="time"
                value={tableTime}
                onChange={(e) => setTableTime(e.target.value)}
                className="border border-[#E5E8EB] rounded-2xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#3182F6] bg-white w-1/3 min-w-[90px]"
              />
              <input
                type="text"
                placeholder="메모 입력"
                value={tableMemo}
                onChange={(e) => setTableMemo(e.target.value)}
                className="border border-[#E5E8EB] rounded-2xl p-2.5 text-xs focus:outline-none focus:border-[#3182F6] bg-white w-2/3 min-w-0 flex-grow"
              />
            </div>
            <button 
              onClick={addTimetableItem} 
              className="w-full py-2.5 bg-[#3182F6] hover:bg-[#1b64da] text-white text-xs font-bold rounded-2xl transition-colors"
            >
              알림 추가하기
            </button>
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
