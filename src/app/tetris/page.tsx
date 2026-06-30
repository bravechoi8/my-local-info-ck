"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import DarkModeToggle from "@/components/DarkModeToggle";

// 테트리스 블록 정의 (I, J, L, O, S, T, Z)
const SHAPES = {
  I: [[1, 1, 1, 1]],
  J: [
    [1, 0, 0],
    [1, 1, 1]
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1]
  ],
  O: [
    [1, 1],
    [1, 1]
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0]
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1]
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1]
  ]
};

const COLORS = {
  I: "bg-cyan-500 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]",
  J: "bg-blue-500 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]",
  L: "bg-orange-500 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]",
  O: "bg-yellow-500 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]",
  S: "bg-green-500 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]",
  T: "bg-purple-500 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]",
  Z: "bg-red-500 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]"
};

const COLS = 10;
const ROWS = 20;

export default function TetrisPage() {
  const [board, setBoard] = useState<(keyof typeof SHAPES | null)[][]>(
    Array(ROWS).fill(null).map(() => Array(COLS).fill(null))
  );
  
  const [currentPiece, setCurrentPiece] = useState<{
    shape: number[][];
    type: keyof typeof SHAPES;
    x: number;
    y: number;
  } | null>(null);

  const [nextPiece, setNextPiece] = useState<keyof typeof SHAPES>("I");
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [highScore, setHighScore] = useState(0);

  const gameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 최고 점수 불러오기
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tetrisHighScore");
      if (saved) {
        setHighScore(parseInt(saved, 10));
      }
    }
  }, []);

  // 레벨에 따른 속도 계산 (레벨이 올라갈수록 더 빨리 떨어짐)
  const getSpeed = () => {
    // 레벨 1: 800ms (0.8초)
    // 레벨이 올라갈 때마다 80ms씩 빨라짐 (최대 100ms까지 빨라짐)
    return Math.max(100, 800 - (level - 1) * 80);
  };

  // 새로운 블록 생성
  const generateRandomPiece = (nextType: keyof typeof SHAPES) => {
    const keys = Object.keys(SHAPES) as (keyof typeof SHAPES)[];
    const nextRandom = keys[Math.floor(Math.random() * keys.length)];
    setNextPiece(nextRandom);

    const shape = SHAPES[nextType];
    return {
      shape,
      type: nextType,
      x: Math.floor((COLS - shape[0].length) / 2),
      y: 0
    };
  };

  // 게임 시작
  const startGame = () => {
    setBoard(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
    setScore(0);
    setLines(0);
    setLevel(1);
    setGameOver(false);
    setIsPaused(false);
    
    // 첫 블록과 다음 블록 준비
    const keys = Object.keys(SHAPES) as (keyof typeof SHAPES)[];
    const initialType = keys[Math.floor(Math.random() * keys.length)];
    const nextRandom = keys[Math.floor(Math.random() * keys.length)];
    
    setNextPiece(nextRandom);
    setCurrentPiece({
      shape: SHAPES[initialType],
      type: initialType,
      x: Math.floor((COLS - SHAPES[initialType][0].length) / 2),
      y: 0
    });
    setGameStarted(true);
  };

  // 충돌 검사
  const checkCollision = (
    piece: { shape: number[][]; x: number; y: number },
    boardGrid: (keyof typeof SHAPES | null)[][],
    offsetX = 0,
    offsetY = 0
  ) => {
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c]) {
          const nextX = piece.x + c + offsetX;
          const nextY = piece.y + r + offsetY;

          if (nextX < 0 || nextX >= COLS || nextY >= ROWS) {
            return true;
          }
          if (nextY >= 0 && boardGrid[nextY][nextX] !== null) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // 블록을 보드에 고정 및 줄 지우기
  const lockPiece = () => {
    if (!currentPiece) return;

    const newBoard = board.map(row => [...row]);
    
    // 보드에 블록 삽입
    for (let r = 0; r < currentPiece.shape.length; r++) {
      for (let c = 0; c < currentPiece.shape[r].length; c++) {
        if (currentPiece.shape[r][c]) {
          const targetY = currentPiece.y + r;
          const targetX = currentPiece.x + c;
          if (targetY >= 0) {
            newBoard[targetY][targetX] = currentPiece.type;
          }
        }
      }
    }

    // 완전히 찬 줄 감지 및 제거
    let clearedLines = 0;
    const filteredBoard = newBoard.filter(row => {
      const isFull = row.every(cell => cell !== null);
      if (isFull) clearedLines++;
      return !isFull;
    });

    while (filteredBoard.length < ROWS) {
      filteredBoard.unshift(Array(COLS).fill(null));
    }

    // 점수 계산 (싱글: 100, 더블: 300, 트리플: 500, 테트리스: 800)
    let scoreGain = 0;
    if (clearedLines === 1) scoreGain = 100 * level;
    else if (clearedLines === 2) scoreGain = 300 * level;
    else if (clearedLines === 3) scoreGain = 500 * level;
    else if (clearedLines === 4) scoreGain = 800 * level;

    if (scoreGain > 0) {
      const newScore = score + scoreGain;
      const newLines = lines + clearedLines;
      const newLevel = Math.floor(newLines / 10) + 1; // 10줄마다 1레벨 상승

      setScore(newScore);
      setLines(newLines);
      setLevel(newLevel);

      // 최고 점수 갱신
      if (newScore > highScore) {
        setHighScore(newScore);
        localStorage.setItem("tetrisHighScore", newScore.toString());
      }
    }

    setBoard(filteredBoard);

    // 다음 블록 꺼내와서 장착
    const spawnPiece = generateRandomPiece(nextPiece);
    // 생성되자마자 충돌하면 게임 오버
    if (checkCollision(spawnPiece, filteredBoard)) {
      setGameOver(true);
      setCurrentPiece(null);
    } else {
      setCurrentPiece(spawnPiece);
    }
  };

  // 블록 한 칸 아래로 이동
  const moveDown = () => {
    if (!currentPiece || gameOver || isPaused || !gameStarted) return;

    if (!checkCollision(currentPiece, board, 0, 1)) {
      setCurrentPiece(prev => prev ? { ...prev, y: prev.y + 1 } : null);
    } else {
      lockPiece();
    }
  };

  // 블록 좌우 이동
  const moveHorizontal = (dir: number) => {
    if (!currentPiece || gameOver || isPaused || !gameStarted) return;
    if (!checkCollision(currentPiece, board, dir, 0)) {
      setCurrentPiece(prev => prev ? { ...prev, x: prev.x + dir } : null);
    }
  };

  // 블록 회전
  const rotatePiece = () => {
    if (!currentPiece || gameOver || isPaused || !gameStarted) return;

    // 행렬 회전 (시계방향 90도)
    const rotated = currentPiece.shape[0].map((_, index) =>
      currentPiece.shape.map(row => row[index]).reverse()
    );

    const testPiece = {
      ...currentPiece,
      shape: rotated
    };

    // 회전이 가능한지 검사 (벽 밀기 처리 포함)
    let offsetX = 0;
    if (checkCollision(testPiece, board)) {
      // 좌우로 밀어서 충돌 방지 시험
      if (!checkCollision(testPiece, board, -1, 0)) offsetX = -1;
      else if (!checkCollision(testPiece, board, 1, 0)) offsetX = 1;
      else if (!checkCollision(testPiece, board, -2, 0)) offsetX = -2;
      else if (!checkCollision(testPiece, board, 2, 0)) offsetX = 2;
      else return; // 회전 불가
    }

    setCurrentPiece(prev => prev ? { ...prev, shape: rotated, x: prev.x + offsetX } : null);
  };

  // 한 번에 수직 아래로 떨어뜨리기 (하드 드롭)
  const hardDrop = () => {
    if (!currentPiece || gameOver || isPaused || !gameStarted) return;

    let offset = 0;
    while (!checkCollision(currentPiece, board, 0, offset + 1)) {
      offset++;
    }

    // 보드에 고정하기 직전 좌표 갱신
    const droppedPiece = { ...currentPiece, y: currentPiece.y + offset };
    
    // 직접 lockPiece 함수 로직 인라인 수행하여 동기화 에러 차단
    const newBoard = board.map(row => [...row]);
    for (let r = 0; r < droppedPiece.shape.length; r++) {
      for (let c = 0; c < droppedPiece.shape[r].length; c++) {
        if (droppedPiece.shape[r][c]) {
          const targetY = droppedPiece.y + r;
          const targetX = droppedPiece.x + c;
          if (targetY >= 0) {
            newBoard[targetY][targetX] = droppedPiece.type;
          }
        }
      }
    }

    let clearedLines = 0;
    const filteredBoard = newBoard.filter(row => {
      const isFull = row.every(cell => cell !== null);
      if (isFull) clearedLines++;
      return !isFull;
    });

    while (filteredBoard.length < ROWS) {
      filteredBoard.unshift(Array(COLS).fill(null));
    }

    let scoreGain = 0;
    if (clearedLines === 1) scoreGain = 100 * level;
    else if (clearedLines === 2) scoreGain = 300 * level;
    else if (clearedLines === 3) scoreGain = 500 * level;
    else if (clearedLines === 4) scoreGain = 800 * level;

    // 하드 드롭 보너스 20점 가산
    const newScore = score + scoreGain + 20;
    const newLines = lines + clearedLines;
    const newLevel = Math.floor(newLines / 10) + 1;

    setScore(newScore);
    setLines(newLines);
    setLevel(newLevel);

    if (newScore > highScore) {
      setHighScore(newScore);
      localStorage.setItem("tetrisHighScore", newScore.toString());
    }

    setBoard(filteredBoard);

    const spawnPiece = generateRandomPiece(nextPiece);
    if (checkCollision(spawnPiece, filteredBoard)) {
      setGameOver(true);
      setCurrentPiece(null);
    } else {
      setCurrentPiece(spawnPiece);
    }
  };

  // 주기적으로 블록 아래로 떨어뜨리는 루프
  useEffect(() => {
    if (gameStarted && !gameOver && !isPaused) {
      gameIntervalRef.current = setInterval(moveDown, getSpeed());
    }

    return () => {
      if (gameIntervalRef.current) {
        clearInterval(gameIntervalRef.current);
      }
    };
  }, [currentPiece, gameOver, isPaused, gameStarted, level]);

  // 키보드 조작 이벤트 핸들러
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameStarted || gameOver || isPaused) return;

      switch (e.key) {
        case "ArrowLeft":
          moveHorizontal(-1);
          break;
        case "ArrowRight":
          moveHorizontal(1);
          break;
        case "ArrowDown":
          moveDown();
          break;
        case "ArrowUp":
          rotatePiece();
          break;
        case " ":
          e.preventDefault();
          hardDrop();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentPiece, board, gameOver, isPaused, gameStarted]);

  // 화면 렌더링용 임시 그리드 빌드 (현재 움직이는 블록 합성)
  const displayBoard = board.map(row => [...row]);
  if (currentPiece && !gameOver) {
    for (let r = 0; r < currentPiece.shape.length; r++) {
      for (let c = 0; c < currentPiece.shape[r].length; c++) {
        if (currentPiece.shape[r][c]) {
          const targetY = currentPiece.y + r;
          const targetX = currentPiece.x + c;
          if (targetY >= 0 && targetY < ROWS && targetX >= 0 && targetX < COLS) {
            displayBoard[targetY][targetX] = currentPiece.type;
          }
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#0B0F19] text-[#333D4B] dark:text-[#E5E8EB] antialiased flex flex-col justify-between transition-colors">
      {/* 상단 GNB 네비게이션 */}
      <nav className="bg-white dark:bg-[#0B0F19] border-b border-[#F2F4F6] dark:border-slate-800/80 px-6 py-4 transition-colors">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-bold text-[#191F28] dark:text-[#F3F4F6] hover:text-[#3182F6] transition-colors"
          >
            &larr; 홈으로 돌아가기
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-[#8B95A1] dark:text-slate-400 tracking-wider">
              미니 테트리스 🎮
            </span>
            <DarkModeToggle />
          </div>
        </div>
      </nav>

      {/* 게임 인터페이스 메인 레이아웃 */}
      <main className="max-w-5xl mx-auto w-full px-4 py-8 flex-grow flex items-center justify-center">
        <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-[#F2F4F6] dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl flex flex-col md:flex-row gap-8 items-center md:items-start justify-center transition-colors">
          
          {/* 왼쪽: 통계 및 다음 블록 미리보기 패널 */}
          <div className="flex flex-row md:flex-col justify-between w-full md:w-48 gap-4 shrink-0">
            {/* 스코어 & 레벨 카드 */}
            <div className="flex-1 bg-[#F9FAFB] dark:bg-slate-800/40 rounded-2xl p-4 border border-[#F2F4F6] dark:border-slate-800 space-y-3">
              <div>
                <div className="text-[10px] font-bold text-[#8B95A1] uppercase tracking-wider">High Score</div>
                <div className="text-lg font-black text-[#191F28] dark:text-white">{highScore}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#8B95A1] uppercase tracking-wider">Score</div>
                <div className="text-xl font-black text-[#3182F6]">{score}</div>
              </div>
              <div className="flex justify-between md:block md:space-y-3">
                <div>
                  <div className="text-[10px] font-bold text-[#8B95A1] uppercase tracking-wider">Level</div>
                  <div className="text-base font-extrabold text-[#191F28] dark:text-white">{level}</div>
                </div>
                <div className="md:mt-3">
                  <div className="text-[10px] font-bold text-[#8B95A1] uppercase tracking-wider">Lines</div>
                  <div className="text-base font-extrabold text-[#191F28] dark:text-white">{lines}</div>
                </div>
              </div>
            </div>

            {/* 다음 블록 패널 */}
            <div className="flex-1 bg-[#F9FAFB] dark:bg-slate-800/40 rounded-2xl p-4 border border-[#F2F4F6] dark:border-slate-800 flex flex-col items-center justify-center min-h-[110px]">
              <div className="text-[10px] font-bold text-[#8B95A1] uppercase tracking-wider mb-2 self-start">Next Block</div>
              <div className="flex items-center justify-center h-16 w-full">
                {gameStarted && !gameOver && (
                  <div className="flex flex-col gap-1">
                    {SHAPES[nextPiece].map((row, r) => (
                      <div key={r} className="flex gap-1 justify-center">
                        {row.map((val, c) => (
                          <div
                            key={c}
                            className={`w-4 h-4 rounded-sm ${
                              val ? COLORS[nextPiece] : "bg-transparent"
                            }`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 중앙: 테트리스 10x20 실제 메인 게임 보드 */}
          <div className="relative">
            <div className="bg-slate-900 border-4 border-slate-700 dark:border-slate-800 rounded-2xl p-1 shadow-2xl overflow-hidden">
              <div className="grid grid-cols-10 gap-0.5 bg-slate-950 w-[240px] h-[480px] sm:w-[280px] sm:h-[560px]">
                {displayBoard.map((row, rIndex) =>
                  row.map((cell, cIndex) => (
                    <div
                      key={`${rIndex}-${cIndex}`}
                      className={`w-full h-full rounded-[3px] border border-slate-950/20 transition-all duration-75 ${
                        cell ? COLORS[cell] : "bg-slate-900/30"
                      }`}
                    />
                  ))
                )}
              </div>
            </div>

            {/* 게임 오버 / 대기화면 오버레이 모달 */}
            {(!gameStarted || gameOver || isPaused) && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center text-center p-6 z-10">
                {gameOver ? (
                  <div className="space-y-4 animate-scaleUp">
                    <span className="text-4xl inline-block animate-bounce">💀</span>
                    <h2 className="text-2xl font-black text-white">GAME OVER</h2>
                    <p className="text-xs text-slate-300 font-semibold">
                      최종 점수: <span className="text-[#3182F6] font-bold">{score}점</span>
                    </p>
                    <button
                      onClick={startGame}
                      className="px-6 py-2.5 bg-[#3182F6] text-white text-xs font-bold rounded-xl hover:bg-[#1b64da] transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      다시 도전하기 🔄
                    </button>
                  </div>
                ) : isPaused ? (
                  <div className="space-y-4">
                    <span className="text-4xl inline-block animate-pulse">⏸️</span>
                    <h2 className="text-2xl font-black text-white">PAUSED</h2>
                    <p className="text-xs text-slate-300">잠시 멈춤 상태입니다.</p>
                    <button
                      onClick={() => setIsPaused(false)}
                      className="px-6 py-2.5 bg-[#3182F6] text-white text-xs font-bold rounded-xl hover:bg-[#1b64da] transition-all shadow-md cursor-pointer"
                    >
                      게임 계속하기 ➡️
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <span className="text-4xl inline-block">🎮</span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
                      도전! 클래식 테트리스
                    </h2>
                    <p className="text-[11px] sm:text-xs text-slate-300 max-w-[200px] leading-relaxed">
                      방향키로 조작하고 스페이스 바로 한 번에 떨어뜨리세요!
                    </p>
                    <button
                      onClick={startGame}
                      className="px-8 py-3 bg-[#3182F6] text-white text-xs font-bold rounded-xl hover:bg-[#1b64da] transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      게임 시작하기 🚀
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 오른쪽: 모바일 및 원터치 하드드롭 컨트롤러 패널 */}
          <div className="flex flex-col gap-4 w-full md:w-56 shrink-0 text-center">
            {/* 일시정지 제어 영역 */}
            {gameStarted && !gameOver && (
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-[#4E5968] dark:text-slate-300 hover:bg-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                {isPaused ? "재개하기 ▶️" : "잠시 멈춤 ⏸️"}
              </button>
            )}

            {/* 터치 컨트롤러 (모바일 터치 및 마우스 한번에 내리기 지원) */}
            <div className="bg-[#F9FAFB] dark:bg-slate-800/40 rounded-2xl p-4 border border-[#F2F4F6] dark:border-slate-800 space-y-4">
              <div className="text-[10px] font-bold text-[#8B95A1] uppercase tracking-wider">Controls</div>
              
              {/* 모바일 화면 방향 조절 십자패드 */}
              <div className="flex flex-col items-center gap-1.5 select-none">
                <button
                  onMouseDown={(e) => { e.preventDefault(); rotatePiece(); }}
                  onTouchStart={(e) => { e.preventDefault(); rotatePiece(); }}
                  className="w-12 h-12 rounded-xl bg-white dark:bg-slate-700 shadow-sm border border-[#E5E8EB] dark:border-slate-600 flex items-center justify-center text-lg active:scale-95 transition-all text-[#191F28] dark:text-white cursor-pointer"
                  title="블록 회전"
                >
                  🔄
                </button>
                <div className="flex gap-1.5">
                  <button
                    onMouseDown={(e) => { e.preventDefault(); moveHorizontal(-1); }}
                    onTouchStart={(e) => { e.preventDefault(); moveHorizontal(-1); }}
                    className="w-12 h-12 rounded-xl bg-white dark:bg-slate-700 shadow-sm border border-[#E5E8EB] dark:border-slate-600 flex items-center justify-center text-lg active:scale-95 transition-all text-[#191F28] dark:text-white cursor-pointer"
                    title="왼쪽 이동"
                  >
                    ⬅️
                  </button>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); moveDown(); }}
                    onTouchStart={(e) => { e.preventDefault(); moveDown(); }}
                    className="w-12 h-12 rounded-xl bg-white dark:bg-slate-700 shadow-sm border border-[#E5E8EB] dark:border-slate-600 flex items-center justify-center text-lg active:scale-95 transition-all text-[#191F28] dark:text-white cursor-pointer"
                    title="아래 한칸"
                  >
                    ⬇️
                  </button>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); moveHorizontal(1); }}
                    onTouchStart={(e) => { e.preventDefault(); moveHorizontal(1); }}
                    className="w-12 h-12 rounded-xl bg-white dark:bg-slate-700 shadow-sm border border-[#E5E8EB] dark:border-slate-600 flex items-center justify-center text-lg active:scale-95 transition-all text-[#191F28] dark:text-white cursor-pointer"
                    title="오른쪽 이동"
                  >
                    ➡️
                  </button>
                </div>
              </div>

              <div className="border-t border-[#F2F4F6] dark:border-slate-800 my-1"></div>

              {/* 🚀 한 번에 쭉 내려가기 (하드 드롭) 버튼 */}
              <button
                onMouseDown={(e) => { e.preventDefault(); hardDrop(); }}
                onTouchStart={(e) => { e.preventDefault(); hardDrop(); }}
                className="w-full py-3 bg-[#3182F6] hover:bg-[#1b64da] text-white text-xs font-black rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 select-none cursor-pointer"
              >
                ⚡ 한 번에 끝까지 내리기 (Space)
              </button>
            </div>
            
            <p className="text-[10px] text-[#8B95A1] leading-relaxed">
              PC에서는 키보드 방향키(좌우이동, 위 회전) 및 스페이스바(하드드롭)를 사용해 편리하게 플레이할 수 있습니다.
            </p>
          </div>

        </div>
      </main>

      {/* 하단 푸터 영역 */}
      <footer className="bg-white dark:bg-[#0B0F19] border-t border-[#F2F4F6] dark:border-slate-800/80 py-6 px-6 text-center text-xs text-[#8B95A1] transition-colors">
        <div className="max-w-5xl mx-auto space-y-1">
          <p>© {new Date().getFullYear()} 리얼인포 클래식 테트리스. 일상 속 스트레스를 미니게임으로 날려보세요.</p>
        </div>
      </footer>
    </div>
  );
}
