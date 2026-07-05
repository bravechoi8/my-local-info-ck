"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import DarkModeToggle from "@/components/DarkModeToggle";

// 기물 타입 및 구조 정의
interface Piece {
  type: "궁" | "사" | "차" | "포" | "마" | "상" | "졸" | "병";
  camp: "cho" | "han";
  name: string;
}

type Board = (Piece | null)[][];

type MaSangLayout = "왼상" | "오른상" | "안상" | "바깥상";

type AIDifficulty = "easy" | "normal" | "hard";

interface GameMove {
  from: [number, number];
  to: [number, number];
}

// 사운드 피드백을 위한 Web Audio API 헬퍼 함수
function playSound(type: "select" | "move" | "capture" | "win" | "check") {
  if (typeof window === "undefined") return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "select") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === "move") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.16);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } else if (type === "capture") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      osc.frequency.setValueAtTime(50, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } else if (type === "win") {
      const freqs = [330, 440, 550, 660, 880];
      freqs.forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.type = "sine";
        o.frequency.setValueAtTime(f, ctx.currentTime + i * 0.08);
        g.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.08);
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.18);
        o.start(ctx.currentTime + i * 0.08);
        o.stop(ctx.currentTime + i * 0.08 + 0.18);
      });
    } else if (type === "check") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(780, ctx.currentTime);
      osc.frequency.setValueAtTime(630, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    }
  } catch (e) {
    console.warn("Web Audio API not supported or blocked", e);
  }
}

// 궁성 좌표 확인 헬퍼
function isWithinPalace(r: number, c: number, camp: "cho" | "han"): boolean {
  if (c < 3 || c > 5) return false;
  if (camp === "han") {
    return r >= 0 && r <= 2;
  } else {
    return r >= 7 && r <= 9;
  }
}

// 보드 객체 완전 복제 함수 (참조 오염 완벽 복구 - Deep Copy)
function cloneBoard(b: Board): Board {
  return b.map(row => row.map(cell => cell ? { ...cell } : null));
}

export default function JanggiPage() {
  const [board, setBoard] = useState<Board>([]);
  const [currentTurn, setCurrentTurn] = useState<"cho" | "han">("cho");
  const [selectedPos, setSelectedPos] = useState<[number, number] | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<[number, number][]>([]);
  const [gameMode, setGameMode] = useState<"pvp" | "ai">("pvp");
  const [choLayout, setChoLayout] = useState<MaSangLayout>("왼상");
  const [hanLayout, setHanLayout] = useState<MaSangLayout>("왼상");
  const [gameStarted, setGameStarted] = useState(false);
  const [winner, setWinner] = useState<"cho" | "han" | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>("초(Blue) 차례입니다. 기물을 선택하세요.");
  const [is3dMode, setIs3dMode] = useState<boolean>(true); 
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>("normal"); 
  const [isChoCheck, setIsChoCheck] = useState<boolean>(false); 
  const [isHanCheck, setIsHanCheck] = useState<boolean>(false); 
  const [lastMove, setLastMove] = useState<GameMove | null>(null); 

  // 보드 초기화 함수
  const initBoard = (choLay: MaSangLayout, hanLay: MaSangLayout) => {
    const tempBoard: Board = Array(10).fill(null).map(() => Array(9).fill(null));

    // --- 한 (Red) 기물 배치 (행 0 ~ 3) ---
    tempBoard[0][0] = { type: "차", camp: "han", name: "車" };
    tempBoard[0][8] = { type: "차", camp: "han", name: "車" };
    
    if (hanLay === "왼상") {
      tempBoard[0][1] = { type: "마", camp: "han", name: "馬" };
      tempBoard[0][2] = { type: "상", camp: "han", name: "象" };
      tempBoard[0][6] = { type: "마", camp: "han", name: "馬" };
      tempBoard[0][7] = { type: "상", camp: "han", name: "象" };
    } else if (hanLay === "오른상") {
      tempBoard[0][1] = { type: "상", camp: "han", name: "象" };
      tempBoard[0][2] = { type: "마", camp: "han", name: "馬" };
      tempBoard[0][6] = { type: "상", camp: "han", name: "象" };
      tempBoard[0][7] = { type: "마", camp: "han", name: "馬" };
    } else if (hanLay === "안상") {
      tempBoard[0][1] = { type: "마", camp: "han", name: "馬" };
      tempBoard[0][2] = { type: "상", camp: "han", name: "象" };
      tempBoard[0][6] = { type: "상", camp: "han", name: "象" };
      tempBoard[0][7] = { type: "마", camp: "han", name: "馬" };
    } else if (hanLay === "바깥상") {
      tempBoard[0][1] = { type: "상", camp: "han", name: "象" };
      tempBoard[0][2] = { type: "마", camp: "han", name: "馬" };
      tempBoard[0][6] = { type: "마", camp: "han", name: "馬" };
      tempBoard[0][7] = { type: "상", camp: "han", name: "象" };
    }

    tempBoard[0][3] = { type: "사", camp: "han", name: "士" };
    tempBoard[0][5] = { type: "사", camp: "han", name: "士" };
    tempBoard[1][4] = { type: "궁", camp: "han", name: "漢" };
    tempBoard[2][1] = { type: "포", camp: "han", name: "包" };
    tempBoard[2][7] = { type: "포", camp: "han", name: "包" };

    tempBoard[3][0] = { type: "병", camp: "han", name: "兵" };
    tempBoard[3][2] = { type: "병", camp: "han", name: "兵" };
    tempBoard[3][4] = { type: "병", camp: "han", name: "兵" };
    tempBoard[3][6] = { type: "병", camp: "han", name: "兵" };
    tempBoard[3][8] = { type: "병", camp: "han", name: "兵" };

    // --- 초 (Blue) 기물 배치 (행 6 ~ 9) ---
    tempBoard[9][0] = { type: "차", camp: "cho", name: "車" };
    tempBoard[9][8] = { type: "차", camp: "cho", name: "車" };

    if (choLay === "왼상") {
      tempBoard[9][1] = { type: "마", camp: "cho", name: "馬" };
      tempBoard[9][2] = { type: "상", camp: "cho", name: "象" };
      tempBoard[9][6] = { type: "마", camp: "cho", name: "馬" };
      tempBoard[9][7] = { type: "상", camp: "cho", name: "象" };
    } else if (choLay === "오른상") {
      tempBoard[9][1] = { type: "상", camp: "cho", name: "象" };
      tempBoard[9][2] = { type: "마", camp: "cho", name: "馬" };
      tempBoard[9][6] = { type: "상", camp: "cho", name: "象" };
      tempBoard[9][7] = { type: "마", camp: "cho", name: "馬" };
    } else if (choLay === "안상") {
      tempBoard[9][1] = { type: "마", camp: "cho", name: "馬" };
      tempBoard[9][2] = { type: "상", camp: "cho", name: "象" };
      tempBoard[9][6] = { type: "상", camp: "cho", name: "象" };
      tempBoard[9][7] = { type: "마", camp: "cho", name: "馬" };
    } else if (choLay === "바깥상") {
      tempBoard[9][1] = { type: "상", camp: "cho", name: "象" };
      tempBoard[9][2] = { type: "마", camp: "cho", name: "馬" };
      tempBoard[9][6] = { type: "마", camp: "cho", name: "馬" };
      tempBoard[9][7] = { type: "상", camp: "cho", name: "象" };
    }

    tempBoard[9][3] = { type: "사", camp: "cho", name: "士" };
    tempBoard[9][5] = { type: "사", camp: "cho", name: "士" };
    tempBoard[8][4] = { type: "궁", camp: "cho", name: "楚" };
    tempBoard[7][1] = { type: "포", camp: "cho", name: "包" };
    tempBoard[7][7] = { type: "포", camp: "cho", name: "包" };

    tempBoard[6][0] = { type: "졸", camp: "cho", name: "卒" };
    tempBoard[6][2] = { type: "졸", camp: "cho", name: "卒" };
    tempBoard[6][4] = { type: "졸", camp: "cho", name: "卒" };
    tempBoard[6][6] = { type: "졸", camp: "cho", name: "卒" };
    tempBoard[6][8] = { type: "졸", camp: "cho", name: "卒" };

    setBoard(tempBoard);
    setCurrentTurn("cho");
    setSelectedPos(null);
    setPossibleMoves([]);
    setWinner(null);
    setMoveHistory([]);
    setIsChoCheck(false);
    setIsHanCheck(false);
    setLastMove(null); 
    setStatusMessage("대국이 시작되었습니다. 초(Blue) 차례입니다.");
  };

  // 장기 기물별 이동 가능 경로 계산
  const getMoves = (r: number, c: number, currentBoard: Board): [number, number][] => {
    const piece = currentBoard[r][c];
    if (!piece) return [];

    const moves: [number, number][] = [];
    const addMoveIfValid = (nr: number, nc: number) => {
      if (nr < 0 || nr > 9 || nc < 0 || nc > 8) return false;
      const target = currentBoard[nr][nc];
      if (target === null) {
        moves.push([nr, nc]);
        return true;
      }
      if (target.camp !== piece.camp) {
        moves.push([nr, nc]);
      }
      return false;
    };

    switch (piece.type) {
      // 1. 차 (Chariot) 행마
      case "차": {
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const [dr, dc] of dirs) {
          let step = 1;
          while (true) {
            const nr = r + dr * step;
            const nc = c + dc * step;
            if (nr < 0 || nr > 9 || nc < 0 || nc > 8) break;
            const target = currentBoard[nr][nc];
            if (target === null) {
              moves.push([nr, nc]);
            } else {
              if (target.camp !== piece.camp) {
                moves.push([nr, nc]);
              }
              break;
            }
            step++;
          }
        }

        // 궁성 내 대각선 특수 행마
        if (isWithinPalace(r, c, "cho")) {
          const palaceCoords = [[7, 3], [7, 5], [8, 4], [9, 3], [9, 5]];
          const hasCoord = (row: number, col: number) => palaceCoords.some(([pr, pc]) => pr === row && pc === col);
          if (hasCoord(r, c)) {
            const diagDirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
            for (const [dr, dc] of diagDirs) {
              const nr = r + dr;
              const nc = c + dc;
              if (isWithinPalace(nr, nc, "cho")) {
                if (r === 8 && c === 4) {
                  addMoveIfValid(nr, nc);
                } else if ((r === 7 || r === 9) && (c === 3 || c === 5)) {
                  const centerPiece = currentBoard[8][4];
                  if (centerPiece === null) {
                    moves.push([8, 4]);
                    const fr = r + dr * 2;
                    const fc = c + dc * 2;
                    if (isWithinPalace(fr, fc, "cho")) {
                      const endPiece = currentBoard[fr][fc];
                      if (endPiece === null || endPiece.camp !== piece.camp) {
                        moves.push([fr, fc]);
                      }
                    }
                  } else {
                    if (centerPiece.camp !== piece.camp) {
                      moves.push([8, 4]);
                    }
                  }
                }
              }
            }
          }
        }

        if (isWithinPalace(r, c, "han")) {
          const palaceCoords = [[0, 3], [0, 5], [1, 4], [2, 3], [2, 5]];
          const hasCoord = (row: number, col: number) => palaceCoords.some(([pr, pc]) => pr === row && pc === col);
          if (hasCoord(r, c)) {
            const diagDirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
            for (const [dr, dc] of diagDirs) {
              const nr = r + dr;
              const nc = c + dc;
              if (isWithinPalace(nr, nc, "han")) {
                if (r === 1 && c === 4) {
                  addMoveIfValid(nr, nc);
                } else if ((r === 0 || r === 2) && (c === 3 || c === 5)) {
                  const centerPiece = currentBoard[1][4];
                  if (centerPiece === null) {
                    moves.push([1, 4]);
                    const fr = r + dr * 2;
                    const fc = c + dc * 2;
                    if (isWithinPalace(fr, fc, "han")) {
                      const endPiece = currentBoard[fr][fc];
                      if (endPiece === null || endPiece.camp !== piece.camp) {
                        moves.push([fr, fc]);
                      }
                    }
                  } else {
                    if (centerPiece.camp !== piece.camp) {
                      moves.push([1, 4]);
                    }
                  }
                }
              }
            }
          }
        }
        break;
      }

      // 2. 포 (Cannon) 행마
      case "포": {
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const [dr, dc] of dirs) {
          let step = 1;
          let bridgeFound = false;
          while (true) {
            const nr = r + dr * step;
            const nc = c + dc * step;
            if (nr < 0 || nr > 9 || nc < 0 || nc > 8) break;
            const target = currentBoard[nr][nc];

            if (!bridgeFound) {
              if (target !== null) {
                if (target.type === "포") break; 
                bridgeFound = true;
              }
            } else {
              if (target === null) {
                moves.push([nr, nc]);
              } else {
                if (target.type !== "포" && target.camp !== piece.camp) {
                  moves.push([nr, nc]);
                }
                break;
              }
            }
            step++;
          }
        }

        const checkPalaceCannon = (palaceCamp: "cho" | "han", centerR: number) => {
          if (isWithinPalace(r, c, palaceCamp)) {
            if (r !== centerR && c !== 4) {
              const diagDirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
              for (const [dr, dc] of diagDirs) {
                const nr = r + dr * 2;
                const nc = c + dc * 2;
                if (isWithinPalace(nr, nc, palaceCamp)) {
                  const bridge = currentBoard[centerR][4];
                  if (bridge !== null && bridge.type !== "포") {
                    const target = currentBoard[nr][nc];
                    if (target === null) {
                      moves.push([nr, nc]);
                    } else if (target.type !== "포" && target.camp !== piece.camp) {
                      moves.push([nr, nc]);
                    }
                  }
                }
              }
            }
          }
        };

        checkPalaceCannon("cho", 8);
        checkPalaceCannon("han", 1);
        break;
      }

      // 3. 마 (Horse) 행마
      case "마": {
        const marules = [
          { step: [-2, -1], block: [-1, 0] },
          { step: [-2, 1], block: [-1, 0] },
          { step: [2, -1], block: [1, 0] },
          { step: [2, 1], block: [1, 0] },
          { step: [-1, -2], block: [0, -1] },
          { step: [1, -2], block: [0, -1] },
          { step: [-1, 2], block: [0, 1] },
          { step: [1, 2], block: [0, 1] }
        ];

        for (const rule of marules) {
          const br = r + rule.block[0];
          const bc = c + rule.block[1];
          if (br >= 0 && br <= 9 && bc >= 0 && bc <= 8) {
            if (currentBoard[br][bc] === null) {
              const nr = r + rule.step[0];
              const nc = c + rule.step[1];
              addMoveIfValid(nr, nc);
            }
          }
        }
        break;
      }

      // 4. 상 (Elephant) 행마
      case "상": {
        const sangrules = [
          { step: [-3, -2], block1: [-1, 0], block2: [-2, -1] },
          { step: [-3, 2], block1: [-1, 0], block2: [-2, 1] },
          { step: [3, -2], block1: [1, 0], block2: [2, -1] },
          { step: [3, 2], block1: [1, 0], block2: [2, 1] },
          { step: [-2, -3], block1: [0, -1], block2: [-1, -2] },
          { step: [2, -3], block1: [0, -1], block2: [1, -2] },
          { step: [-2, 3], block1: [0, 1], block2: [-1, 2] },
          { step: [2, 3], block1: [0, 1], block2: [1, 2] }
        ];

        for (const rule of sangrules) {
          const br1 = r + rule.block1[0];
          const bc1 = c + rule.block1[1];
          const br2 = r + rule.block2[0];
          const bc2 = c + rule.block2[1];

          if (
            br1 >= 0 && br1 <= 9 && bc1 >= 0 && bc1 <= 8 &&
            br2 >= 0 && br2 <= 9 && bc2 >= 0 && bc2 <= 8
          ) {
            if (currentBoard[br1][bc1] === null && currentBoard[br2][bc2] === null) {
              const nr = r + rule.step[0];
              const nc = c + rule.step[1];
              addMoveIfValid(nr, nc);
            }
          }
        }
        break;
      }

      // 5. 궁 (General) & 사 (Guard) 행마
      case "궁":
      case "사": {
        const palaceCamp = piece.camp;
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const [dr, dc] of dirs) {
          const nr = r + dr;
          const nc = c + dc;
          if (isWithinPalace(nr, nc, palaceCamp)) {
            addMoveIfValid(nr, nc);
          }
        }

        const diagDirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        const centerR = palaceCamp === "han" ? 1 : 8;

        if (r === centerR && c === 4) {
          for (const [dr, dc] of diagDirs) {
            const nr = r + dr;
            const nc = c + dc;
            if (isWithinPalace(nr, nc, palaceCamp)) {
              addMoveIfValid(nr, nc);
            }
          }
        } else if ((r === centerR - 1 || r === centerR + 1) && (c === 3 || c === 5)) {
          const dr = centerR - r;
          const dc = 4 - c;
          const nr = r + dr;
          const nc = c + dc;
          addMoveIfValid(nr, nc);
        }
        break;
      }

      // 6. 졸 / 병 (Soldier) 행마
      case "졸":
      case "병": {
        const forwardDir = piece.camp === "cho" ? -1 : 1;
        const dirs = [[forwardDir, 0], [0, 1], [0, -1]];
        for (const [dr, dc] of dirs) {
          const nr = r + dr;
          const nc = c + dc;
          addMoveIfValid(nr, nc);
        }

        const enemyPalace = piece.camp === "cho" ? "han" : "cho";
        const centerR = enemyPalace === "han" ? 1 : 8;

        if (isWithinPalace(r, c, enemyPalace)) {
          if ((piece.camp === "cho" && r === centerR + 1) || (piece.camp === "han" && r === centerR - 1)) {
            if (c === 3 || c === 5) {
              const dr = centerR - r;
              const dc = 4 - c;
              addMoveIfValid(r + dr, c + dc);
            }
          }
          if (r === centerR && c === 4) {
            const dr = forwardDir;
            const diagCols = [3, 5];
            for (const col of diagCols) {
              addMoveIfValid(r + dr, col);
            }
          }
        }
        break;
      }
    }

    return moves;
  };

  // 실시간 장군(Check) 판독 함수
  const isUnderCheck = (camp: "cho" | "han", currentBoard: Board): boolean => {
    let kingR = -1;
    let kingC = -1;
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const p = currentBoard[r][c];
        if (p && p.type === "궁" && p.camp === camp) {
          kingR = r;
          kingC = c;
          break;
        }
      }
      if (kingR !== -1) break;
    }
    if (kingR === -1) return false; 

    const enemyCamp = camp === "cho" ? "han" : "cho";
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const p = currentBoard[r][c];
        if (p && p.camp === enemyCamp) {
          const moves = getMoves(r, c, currentBoard);
          const targetsKing = moves.some(([tr, tc]) => tr === kingR && tc === kingC);
          if (targetsKing) {
            return true; 
          }
        }
      }
    }
    return false;
  };

  // 아군 기물이 (tr, tc) 위치를 지원/엄호(Support)하는지 판별
  const isPieceSupported = (row: number, col: number, camp: "cho" | "han", boardState: Board): boolean => {
    const tempBoard = cloneBoard(boardState); // 딥 카피 오염 복구
    tempBoard[row][col] = { type: "졸", camp: camp === "cho" ? "han" : "cho", name: "卒" };

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const p = tempBoard[r][c];
        if (p && p.camp === camp && (r !== row || c !== col)) {
          const moves = getMoves(r, c, tempBoard);
          if (moves.some(([tr, tc]) => tr === row && tc === col)) {
            return true; 
          }
        }
      }
    }
    return false;
  };

  // 특정 진영의 모든 합법적인 수 리스트 계산 (자살 수 필터링 포함)
  const getAllLegalMoves = (camp: "cho" | "han", currentBoard: Board): { from: [number, number]; to: [number, number] }[] => {
    const list: { from: [number, number]; to: [number, number] }[] = [];
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const p = currentBoard[r][c];
        if (p && p.camp === camp) {
          const raw = getMoves(r, c, currentBoard);
          for (const [tr, tc] of raw) {
            const temp = cloneBoard(currentBoard); // 딥 카피 오염 복구
            temp[tr][tc] = p;
            temp[r][c] = null;
            if (!isUnderCheck(camp, temp)) {
              list.push({ from: [r, c], to: [tr, tc] });
            }
          }
        }
      }
    }
    return list;
  };

  // 기물 사냥 우선 가치 분석기 (MVV-LVA 정렬 도우미)
  const getMoveScore = (
    move: { from: [number, number]; to: [number, number] },
    currentBoard: Board
  ): number => {
    const assailant = currentBoard[move.from[0]][move.from[1]];
    const victim = currentBoard[move.to[0]][move.to[1]];
    if (!assailant) return 0;

    const values = { 궁: 15000, 차: 130, 포: 70, 마: 50, 상: 30, 사: 30, 졸: 15, 병: 15 };

    if (!victim) {
      const forward = (move.to[0] - move.from[0]) * (assailant.camp === "han" ? 1 : -1);
      return forward * 2;
    }

    const victimValue = values[victim.type] || 15;
    const assailantValue = values[assailant.type] || 15;
    // MVV-LVA 공식
    return victimValue * 10 - assailantValue;
  };

  // 통합 정적 판세 평가 함수 (Static Board Evaluator)
  const evaluateBoard = (currentBoard: Board): number => {
    const values = { 궁: 15000, 차: 130, 포: 70, 마: 50, 상: 30, 사: 30, 졸: 15, 병: 15 };
    let score = 0;

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const p = currentBoard[r][c];
        if (!p) continue;

        const val = values[p.type] || 15;
        const sign = p.camp === "han" ? 1 : -1;

        score += val * sign;

        if (p.camp === "han") {
          if (p.type === "차") {
            if (c === 4) score += 15; 
          }
          if (p.type === "마") {
            if (c === 0 || c === 8) score -= 15;
            else if (r >= 3 && r <= 7 && c >= 2 && c <= 6) score += 18;
          }
          if (p.type === "상") {
            if (c === 0 || c === 8) score -= 12;
            else if (r >= 3 && r <= 7 && c >= 2 && c <= 6) score += 12;
          }
          if (p.type === "포") {
            if (r === 2 && c === 4) score += 35; 
          }
          if (p.type === "사") {
            if (!isWithinPalace(r, c, "han")) score -= 35;
            else {
              let kr = 1, kc = 4;
              for (let row = 0; row < 3; row++) {
                for (let col = 3; col <= 5; col++) {
                  if (currentBoard[row][col]?.type === "궁" && currentBoard[row][col]?.camp === "han") {
                    kr = row; kc = col; break;
                  }
                }
              }
              if (Math.abs(r - kr) + Math.abs(c - kc) <= 1) score += 22;
            }
          }
          if (p.type === "졸" || p.type === "병") {
            score += r * 3.5;
            if (isWithinPalace(r, c, "cho")) score += 15; 
          }
          if (p.type === "궁") {
            if (r === 0 && c === 4) score += 15;
            if (r === 1 && c === 4) score += 10;
          }
        } else {
          if (p.type === "차") {
            if (c === 4) score -= 15;
          }
          if (p.type === "마") {
            if (c === 0 || c === 8) score += 15;
            else if (r >= 3 && r <= 7 && c >= 2 && c <= 6) score -= 18;
          }
          if (p.type === "상") {
            if (c === 0 || c === 8) score += 12;
            else if (r >= 3 && r <= 7 && c >= 2 && c <= 6) score -= 12;
          }
          if (p.type === "포") {
            if (r === 7 && c === 4) score -= 35;
          }
          if (p.type === "사") {
            if (!isWithinPalace(r, c, "cho")) score += 35;
            else {
              let kr = 8, kc = 4;
              for (let row = 7; row < 10; row++) {
                for (let col = 3; col <= 5; col++) {
                  if (currentBoard[row][col]?.type === "궁" && currentBoard[row][col]?.camp === "cho") {
                    kr = row; kc = col; break;
                  }
                }
              }
              if (Math.abs(r - kr) + Math.abs(c - kc) <= 1) score -= 22;
            }
          }
          if (p.type === "졸" || p.type === "병") {
            score -= (9 - r) * 3.5;
            if (isWithinPalace(r, c, "han")) score -= 15;
          }
          if (p.type === "궁") {
            if (r === 9 && c === 4) score -= 15;
            if (r === 8 && c === 4) score -= 10;
          }
        }
      }
    }

    if (isUnderCheck("han", currentBoard)) score -= 85;
    if (isUnderCheck("cho", currentBoard)) score += 85;

    return score;
  };

  // 알파-베타 가지치기 기반 Minimax 알고리즘 구현 (5-ply까지 고속 탐색)
  const minimax = (
    boardState: Board,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean
  ): number => {
    if (depth === 0) {
      return evaluateBoard(boardState);
    }

    const underCheckHan = isUnderCheck("han", boardState);
    const underCheckCho = isUnderCheck("cho", boardState);

    if (isMaximizing) {
      let maxEval = -Infinity;
      const moves = getAllLegalMoves("han", boardState);
      
      if (moves.length === 0) {
        return underCheckHan ? -100000 - depth : 0; 
      }

      moves.sort((a, b) => getMoveScore(b, boardState) - getMoveScore(a, boardState));

      for (const move of moves) {
        const temp = cloneBoard(boardState); // 딥 카피 오염 복구
        temp[move.to[0]][move.to[1]] = temp[move.from[0]][move.from[1]];
        temp[move.from[0]][move.from[1]] = null;

        const evaluation = minimax(temp, depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) {
          break; 
        }
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      const moves = getAllLegalMoves("cho", boardState);
      
      if (moves.length === 0) {
        return underCheckCho ? 100000 + depth : 0; 
      }

      moves.sort((a, b) => getMoveScore(b, boardState) - getMoveScore(a, boardState));

      for (const move of moves) {
        const temp = cloneBoard(boardState); // 딥 카피 오염 복구
        temp[move.to[0]][move.to[1]] = temp[move.from[0]][move.from[1]];
        temp[move.from[0]][move.from[1]] = null;

        const evaluation = minimax(temp, depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) {
          break;
        }
      }
      return minEval;
    }
  };

  // 인공지능(AI) 자동 대국 실행
  const makeAIMove = (currentBoard: Board) => {
    const startTime = Date.now();
    const legalMoves = getAllLegalMoves("han", currentBoard);

    if (legalMoves.length === 0) {
      setWinner("cho");
      setStatusMessage("한(Red)이 외통수(Checkmate)에 걸려 초(Blue)가 승리하였습니다!");
      playSound("win");
      return;
    }

    // 난이도별 탐색 수읽기 깊이 지정 (쉬움: 1수 앞, 보통: 2수 앞, 어려움: 5수 앞 알파고급 수읽기)
    const searchDepth = aiDifficulty === "hard" ? 5 : aiDifficulty === "normal" ? 2 : 1;
    const scoredMoves: { from: [number, number]; to: [number, number]; score: number }[] = [];

    for (const move of legalMoves) {
      const temp = cloneBoard(currentBoard); // 딥 카피 오염 복구
      temp[move.to[0]][move.to[1]] = temp[move.from[0]][move.from[1]];
      temp[move.from[0]][move.from[1]] = null;

      const score = minimax(temp, searchDepth - 1, -Infinity, Infinity, false);
      scoredMoves.push({ from: move.from, to: move.to, score });
    }

    scoredMoves.sort((a, b) => b.score - a.score);

    let selectedMove;
    if (aiDifficulty === "hard") {
      selectedMove = scoredMoves[0]; // 100% 묘수 고집
    } else if (aiDifficulty === "normal") {
      const poolSize = Math.max(1, Math.floor(scoredMoves.length * 0.15));
      const bestPool = scoredMoves.slice(0, poolSize);
      selectedMove = bestPool[Math.floor(Math.random() * bestPool.length)];
    } else {
      const poolSize = Math.max(1, Math.floor(scoredMoves.length * 0.50));
      const loosePool = scoredMoves.slice(0, poolSize);
      selectedMove = loosePool[Math.floor(Math.random() * loosePool.length)];
    }

    const [fr, fc] = selectedMove.from;
    const [tr, tc] = selectedMove.to;

    const movingPiece = currentBoard[fr][fc]!;
    const destPiece = currentBoard[tr][tc];

    const nextBoard = cloneBoard(currentBoard); // 딥 카피 오염 복구
    nextBoard[tr][tc] = movingPiece;
    nextBoard[fr][fc] = null;

    setBoard(nextBoard);
    playSound(destPiece ? "capture" : "move");

    setLastMove({ from: [fr, fc], to: [tr, tc] });

    const moveStr = `한: ${movingPiece.type}(${fr},${fc}) → (${tr},${tc})${destPiece ? ` [${destPiece.type} 획득]` : ""}`;
    setMoveHistory(prev => [moveStr, ...prev]);

    if (destPiece && destPiece.type === "궁") {
      setWinner("han");
      setStatusMessage("한(Red)이 초의 궁을 획득하여 승리하였습니다!");
      playSound("win");
      return;
    }

    const choCheck = isUnderCheck("cho", nextBoard);
    const hanCheck = isUnderCheck("han", nextBoard);
    setIsChoCheck(choCheck);
    setIsHanCheck(hanCheck);

    console.log(`AI Search Time: ${Date.now() - startTime}ms (Depth: ${searchDepth})`);
    setCurrentTurn("cho");

    if (choCheck) {
      playSound("check");
      setStatusMessage("🚨 장군! 초나라(Blue - 플레이어) 궁이 위협받고 있습니다! 멍군하세요.");
    } else {
      setStatusMessage("초(Blue) 차례입니다. 기물을 선택하세요.");
    }
  };

  // 플레이어의 셀 클릭 처리
  const handleCellClick = (r: number, c: number) => {
    if (winner) return;
    if (gameMode === "ai" && currentTurn === "han") return;

    const isSelectedSelf = selectedPos && selectedPos[0] === r && selectedPos[1] === c;
    if (isSelectedSelf) {
      setSelectedPos(null);
      setPossibleMoves([]);
      setStatusMessage(`${currentTurn === "cho" ? "초(Blue)" : "한(Red)"} 차례입니다. 기물을 선택하세요.`);
      return;
    }

    const isPossible = possibleMoves.some(([pr, pc]) => pr === r && pc === c);
    if (isPossible && selectedPos) {
      const [sr, sc] = selectedPos;
      const piece = board[sr][sc]!;
      const destPiece = board[r][c];

      const nextBoard = cloneBoard(board); // 딥 카피 오염 복구
      nextBoard[r][c] = piece;
      nextBoard[sr][sc] = null;

      setBoard(nextBoard);
      playSound(destPiece ? "capture" : "move");

      setLastMove({ from: [sr, sc], to: [r, c] });

      const moveStr = `${piece.camp === "cho" ? "초" : "한"}: ${piece.type}(${sr},${sc}) → (${r},${c})${destPiece ? ` [${destPiece.type} 획득]` : ""}`;
      setMoveHistory(prev => [moveStr, ...prev]);

      if (destPiece && destPiece.type === "궁") {
        setWinner(piece.camp);
        setStatusMessage(`${piece.camp === "cho" ? "초(Blue)" : "한(Red)"}가 승리하였습니다!`);
        playSound("win");
        return;
      }

      setSelectedPos(null);
      setPossibleMoves([]);

      const choCheck = isUnderCheck("cho", nextBoard);
      const hanCheck = isUnderCheck("han", nextBoard);
      setIsChoCheck(choCheck);
      setIsHanCheck(hanCheck);

      const nextTurn = currentTurn === "cho" ? "han" : "cho";
      setCurrentTurn(nextTurn);

      if (gameMode === "ai" && nextTurn === "han") {
        if (hanCheck) {
          playSound("check");
          setStatusMessage("🚨 장군! 한나라(Red - 컴퓨터) 컴퓨터가 위협을 수비(멍군)하는 중입니다...");
        } else {
          setStatusMessage("한(Red) 컴퓨터가 수 계산 중입니다...");
        }
        setTimeout(() => {
          makeAIMove(nextBoard);
        }, 900);
      } else {
        if (choCheck) {
          playSound("check");
          setStatusMessage("🚨 장군! 초나라(Blue - 플레이어) 궁이 위협받고 있습니다! 멍군하세요.");
        } else {
          setStatusMessage(`${nextTurn === "cho" ? "초(Blue)" : "한(Red)"} 차례입니다. 기물을 선택하세요.`);
        }
      }
      return;
    }

    const clickedPiece = board[r][c];
    if (clickedPiece && clickedPiece.camp === currentTurn) {
      playSound("select");
      setSelectedPos([r, c]);

      const rawMoves = getMoves(r, c, board);

      const filteredMoves = rawMoves.filter(([tr, tc]) => {
        const tempBoard = cloneBoard(board); // 딥 카피 오염 복구
        tempBoard[tr][tc] = clickedPiece;
        tempBoard[r][c] = null;
        return !isUnderCheck(clickedPiece.camp, tempBoard);
      });

      setPossibleMoves(filteredMoves);

      if (filteredMoves.length === 0) {
        setStatusMessage(`${clickedPiece.type}은(는) 장군을 피할 수 없어 현재 움직일 수 없습니다.`);
      } else {
        setStatusMessage(`${clickedPiece.type}을(를) 선택함. 이동할 위치를 클릭하세요.`);
      }
    } else {
      setSelectedPos(null);
      setPossibleMoves([]);
      setStatusMessage(`${currentTurn === "cho" ? "초(Blue)" : "한(Red)"} 차례입니다. 기물을 선택하세요.`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* 헤더 */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-50 transition-colors">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent"
            >
              리얼인포 🎮
            </Link>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              3D 클래식 장기
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
            >
              도구·게임 모음 &larr;
            </Link>
            <DarkModeToggle />
          </div>
        </div>
      </header>

      {/* 본문 */}
      <main className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 제어판 */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between gap-4.5 h-fit">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">
                3D 클래식 장기
              </h1>
              {/* 장군 감지 배지 */}
              {(isChoCheck || isHanCheck) && (
                <span className="animate-pulse bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.7)] flex items-center gap-1">
                  🚨 장군 (Check)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              교차점 정렬 배치, 3D 입체 뷰 토글 지원 및 장군(Check) 시 다른 동작을 제한하는 멍군 필수 규칙이 완벽 적용된 지능형 대국입니다.
            </p>

            {/* 3D 뷰 토글 */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl flex items-center justify-between border border-slate-200/50 dark:border-slate-800/40">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">🎮 입체 3D 뷰 모드</span>
              <button
                onClick={() => setIs3dMode(!is3dMode)}
                className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-200 focus:outline-none ${
                  is3dMode ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full bg-white transition-transform duration-200 ${
                    is3dMode ? "translate-x-5.5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* AI 난이도 위젯 */}
            {gameMode === "ai" && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl space-y-2 border border-slate-200/50 dark:border-slate-800/40">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">🤖 AI 컴퓨터 난이도</label>
                <div className="grid grid-cols-3 gap-1">
                  {(["easy", "normal", "hard"] as AIDifficulty[]).map((level) => {
                    const labels = { easy: "쉬움", normal: "보통", hard: "어려움" };
                    const activeStyles = {
                      easy: "bg-emerald-500 text-white shadow-sm",
                      normal: "bg-blue-600 text-white shadow-sm",
                      hard: "bg-red-500 text-white shadow-sm",
                    };
                    return (
                      <button
                        key={level}
                        onClick={() => setAiDifficulty(level)}
                        className={`py-1.5 text-[11px] font-bold rounded-lg transition ${
                          aiDifficulty === level
                            ? activeStyles[level]
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {labels[level]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 모드 선택 */}
            {!gameStarted && (
              <div className="space-y-3 pt-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">게임 모드</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setGameMode("pvp")}
                    className={`py-2 text-xs font-bold rounded-xl transition ${
                      gameMode === "pvp"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    👥 2인 대국
                  </button>
                  <button
                    onClick={() => setGameMode("ai")}
                    className={`py-2 text-xs font-bold rounded-xl transition ${
                      gameMode === "ai"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    🤖 AI 대전
                  </button>
                </div>

                {/* 마상 배치 설정 */}
                <div className="space-y-2 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                      초(Blue - 나) 차림
                    </label>
                    <select
                      value={choLayout}
                      onChange={(e) => setChoLayout(e.target.value as MaSangLayout)}
                      className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs px-3 py-2 font-bold outline-none"
                    >
                      <option value="왼상">왼상차림 (마-상-마-상)</option>
                      <option value="오른상">오른상차림 (상-마-상-마)</option>
                      <option value="안상">안상차림 (마-상-상-마)</option>
                      <option value="바깥상">바깥상차림 (상-마-마-상)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                      한(Red - 상대) 차림
                    </label>
                    <select
                      value={hanLayout}
                      onChange={(e) => setHanLayout(e.target.value as MaSangLayout)}
                      className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs px-3 py-2 font-bold outline-none"
                    >
                      <option value="왼상">왼상차림 (마-상-마-상)</option>
                      <option value="오른상">오른상차림 (상-마-상-마)</option>
                      <option value="안상">안상차림 (마-상-상-마)</option>
                      <option value="바깥상">바깥상차림 (상-마-마-상)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 상태 판 */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-800/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">진행 턴</span>
                <span
                  className={`text-xs font-extrabold px-3 py-0.5 rounded-full ${
                    currentTurn === "cho"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  {currentTurn === "cho" ? "초나라 (Blue)" : "한나라 (Red)"}
                </span>
              </div>
              <p className="text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
                {statusMessage}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => {
                setGameStarted(true);
                initBoard(choLayout, hanLayout);
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-2xl shadow-sm transition"
            >
              {gameStarted ? "🔄 대국 재시작" : "🏁 대국 시작하기"}
            </button>
            {gameStarted && (
              <button
                onClick={() => {
                  setGameStarted(false);
                  setWinner(null);
                  setSelectedPos(null);
                  setPossibleMoves([]);
                  setIsChoCheck(false);
                  setIsHanCheck(false);
                  setLastMove(null);
                  setStatusMessage("차림새를 설정하고 게임을 시작하세요.");
                }}
                className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-xl transition"
              >
                ⚙️ 차림새 설정 모드 이동
              </button>
            )}
          </div>
        </section>

        {/* 3D 판 */}
        <section className="col-span-1 lg:col-span-2 flex flex-col items-center justify-center">
          <div
            className="w-full max-w-[500px] flex items-center justify-center"
            style={{
              perspective: is3dMode ? "1000px" : "none",
              paddingBottom: is3dMode ? "40px" : "0px",
            }}
          >
            <div
              className={`w-full aspect-[9/10] relative bg-[#eed6b0] dark:bg-[#3d2a1b] rounded-3xl p-[7.5%] transition-all duration-500 ease-out border-4 border-[#a67146] dark:border-[#2f2015]`}
              style={{
                transform: is3dMode
                  ? "rotateX(28deg) rotateY(0deg) rotateZ(-2deg) translateY(-2%)"
                  : "none",
                transformStyle: "preserve-3d",
                boxShadow: is3dMode
                  ? "0 30px 60px -15px rgba(0, 0, 0, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.15)"
                  : "0 4px 12px rgba(0,0,0,0.08)",
                borderBottomWidth: is3dMode ? "16px" : "4px",
                borderRightWidth: is3dMode ? "5px" : "4px",
              }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none rounded-2xl" />

              {/* 격자선 영역 */}
              <div className="w-full h-full relative" style={{ transformStyle: "preserve-3d" }}>
                
                {/* 가로선 */}
                {Array(10).fill(null).map((_, idx) => (
                  <div
                    key={`line-h-${idx}`}
                    className="absolute left-0 right-0 border-t border-[#b68259] dark:border-[#5a4230]"
                    style={{
                      top: `${(idx / 9) * 100}%`,
                      borderTopWidth: idx === 0 || idx === 9 ? "1.5px" : "1px",
                    }}
                  />
                ))}

                {/* 세로선 */}
                {Array(9).fill(null).map((_, idx) => (
                  <div
                    key={`line-v-${idx}`}
                    className="absolute top-0 bottom-0 border-l border-[#b68259] dark:border-[#5a4230]"
                    style={{
                      left: `${(idx / 8) * 100}%`,
                      borderLeftWidth: idx === 0 || idx === 8 ? "1.5px" : "1px",
                    }}
                  />
                ))}

                {/* 궁성 대각선 */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <line
                    x1="37.5%" y1="0%" x2="62.5%" y2="22.22%"
                    stroke="#b68259" strokeWidth="1" className="dark:stroke-[#5a4230]"
                  />
                  <line
                    x1="62.5%" y1="0%" x2="37.5%" y2="22.22%"
                    stroke="#b68259" strokeWidth="1" className="dark:stroke-[#5a4230]"
                  />
                  <line
                    x1="37.5%" y1="77.78%" x2="62.5%" y2="100%"
                    stroke="#b68259" strokeWidth="1" className="dark:stroke-[#5a4230]"
                  />
                  <line
                    x1="62.5%" y1="77.78%" x2="37.5%" y2="100%"
                    stroke="#b68259" strokeWidth="1" className="dark:stroke-[#5a4230]"
                  />
                </svg>

                {/* 기물 및 힌트 렌더링 */}
                {gameStarted &&
                  board.map((row, rIdx) =>
                    row.map((piece, cIdx) => {
                      const isSelected = selectedPos && selectedPos[0] === rIdx && selectedPos[1] === cIdx;
                      const isMoveCandidate = possibleMoves.some(([pr, pc]) => pr === rIdx && pc === cIdx);

                      const isLastMoveFrom = lastMove && lastMove.from[0] === rIdx && lastMove.from[1] === cIdx;
                      const isLastMoveTo = lastMove && lastMove.to[0] === rIdx && lastMove.to[1] === cIdx;

                      return (
                        <div
                          key={`piece-cell-${rIdx}-${cIdx}`}
                          className="absolute w-0 h-0"
                          style={{
                            top: `${(rIdx / 9) * 100}%`,
                            left: `${(cIdx / 8) * 100}%`,
                            transformStyle: "preserve-3d",
                            zIndex: isSelected ? 40 : 20,
                          }}
                        >
                          {/* 직전 턴 출발지 잔상 */}
                          {isLastMoveFrom && !piece && (
                            <div
                              className="absolute w-8 h-8 rounded-full border-2 border-dashed border-purple-500/60 bg-purple-500/10 flex items-center justify-center animate-pulse"
                              style={{
                                transform: is3dMode 
                                  ? "translate(-50%, -50%) translateZ(4px)" 
                                  : "translate(-50%, -50%)",
                                pointerEvents: "none",
                              }}
                            />
                          )}

                          {/* 이동 힌트 점 */}
                          {isMoveCandidate && (
                            <div
                              onClick={() => handleCellClick(rIdx, cIdx)}
                              className="absolute w-12 h-12 flex items-center justify-center cursor-pointer z-30"
                              style={{
                                transform: is3dMode 
                                  ? "translate(-50%, -50%) translateZ(14px)" 
                                  : "translate(-50%, -50%)",
                              }}
                            >
                              <div
                                className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full border-2 border-dashed flex items-center justify-center pointer-events-none transition transform hover:scale-110 active:scale-95 ${
                                  board[rIdx][cIdx]
                                    ? "bg-red-500/80 border-white shadow-[0_0_12px_#ef4444] animate-pulse"
                                    : "bg-emerald-500/70 border-white shadow-[0_0_12px_#10b981]"
                                }`}
                              />
                            </div>
                          )}

                          {/* 실제 기물 알 */}
                          {piece && (
                            <div
                              onClick={() => handleCellClick(rIdx, cIdx)}
                              className={`absolute flex items-center justify-center font-black select-none cursor-pointer transition-transform border border-slate-800/20 rounded-full ${
                                piece.camp === "cho"
                                  ? "bg-[#e2f0ff] border-blue-500 text-blue-700 dark:bg-slate-800 dark:border-blue-400 dark:text-blue-400"
                                  : "bg-[#ffe3e7] border-red-500 text-red-700 dark:bg-slate-800 dark:border-red-400 dark:text-red-400"
                              } ${
                                piece.type === "궁"
                                  ? "w-[9.5vw] h-[9.5vw] max-w-[44px] max-h-[44px] text-sm sm:text-base ring-1 ring-amber-400/40"
                                  : piece.type === "사" || piece.type === "졸" || piece.type === "병"
                                  ? "w-[7.5vw] h-[7.5vw] max-w-[34px] max-h-[34px] text-[10px] sm:text-xs"
                                  : "w-[8.5vw] h-[8.5vw] max-w-[39px] max-h-[39px] text-xs sm:text-sm"
                              }`}
                              style={{
                                transform: is3dMode
                                  ? `translate(-50%, -50%) translateZ(10px) ${isSelected ? "scale(1.15) translateY(-8px)" : ""}`
                                  : isSelected
                                  ? "translate(-50%, -50%) scale(1.1) translateY(-3px)"
                                  : "translate(-50%, -50%)",
                                boxShadow: is3dMode
                                  ? isLastMoveTo
                                    ? "0 0 15px rgba(168, 85, 247, 0.9), 0 5px 0 #6d28d9" 
                                    : piece.camp === "cho"
                                    ? "0 5px 0 #1b386a, 0 8px 12px rgba(0,0,0,0.35)"
                                    : "0 5px 0 #6e1c25, 0 8px 12px rgba(0,0,0,0.35)"
                                  : isLastMoveTo
                                  ? "0 0 12px rgba(168, 85, 247, 0.9)"
                                  : "0 2px 4px rgba(0,0,0,0.15)",
                                outline: isSelected 
                                  ? "3px solid #facc15" 
                                  : isLastMoveTo
                                  ? "3px solid #a855f7" 
                                  : "none",
                              }}
                            >
                              {piece.name}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
              </div>
            </div>
          </div>

          {/* 승리 팝업 */}
          {winner && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn">
              <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 max-w-sm w-full p-8 rounded-3xl text-center space-y-6 shadow-2xl">
                <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-full flex items-center justify-center mx-auto text-3xl">
                  🏆
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black">대국 종료</h3>
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {winner === "cho" ? "초나라(Blue - 플레이어) 승리!" : "한나라(Red - 상대) 승리!"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    상대의 궁을 성공적으로 획득하여 경기가 완료되었습니다.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setWinner(null);
                    setGameStarted(false);
                    initBoard(choLayout, hanLayout);
                  }}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-2xl shadow-sm transition"
                >
                  새로운 대국하기
                </button>
              </div>
            </div>
          )}

          {/* 대국 기보 로그 */}
          {gameStarted && moveHistory.length > 0 && (
            <div className="w-full mt-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-2.5">
              <h3 className="text-xs font-bold text-slate-400 block">실시간 대국 기보</h3>
              <div className="max-h-28 overflow-y-auto space-y-1 pr-2 font-mono text-[10px] text-slate-600 dark:text-slate-400 leading-normal">
                {moveHistory.map((h, i) => (
                  <div key={`hist-${i}`} className="border-b border-slate-100 dark:border-slate-800/80 pb-1 flex justify-between">
                    <span>{h}</span>
                    <span className="text-slate-300 dark:text-slate-700">#{moveHistory.length - i}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* 푸터 */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 bg-white dark:bg-slate-900 transition-colors">
        <div className="max-w-6xl mx-auto px-6 text-center text-xs text-slate-400 dark:text-slate-500">
          <p>© {new Date().getFullYear()} 리얼인포 3D 장기. 머리 아픈 일상에서 가볍게 전통 대국을 한 판 즐겨보세요.</p>
        </div>
      </footer>
    </div>
  );
}
