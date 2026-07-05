"use client";

import React, { useState, useEffect, useRef } from "react";
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

// 사운드 피드백을 위한 Web Audio API 헬퍼 함수 (파일 다운로드 불필요)
function playSound(type: "select" | "move" | "capture" | "win") {
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
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === "move") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } else if (type === "capture") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.setValueAtTime(60, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === "win") {
      const freqs = [300, 400, 500, 600, 800];
      freqs.forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.type = "sine";
        o.frequency.setValueAtTime(f, ctx.currentTime + i * 0.1);
        g.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.2);
        o.start(ctx.currentTime + i * 0.1);
        o.stop(ctx.currentTime + i * 0.1 + 0.2);
      });
    }
  } catch (e) {
    console.warn("Web Audio API not supported or blocked", e);
  }
}

// 1. 궁성 좌표 확인 헬퍼
function isWithinPalace(r: number, c: number, camp: "cho" | "han"): boolean {
  if (c < 3 || c > 5) return false;
  if (camp === "han") {
    return r >= 0 && r <= 2;
  } else {
    return r >= 7 && r <= 9;
  }
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

  // 보드 초기화 함수
  const initBoard = (choLay: MaSangLayout, hanLay: MaSangLayout) => {
    const tempBoard: Board = Array(10).fill(null).map(() => Array(9).fill(null));

    // --- 한 (Red) 기물 배치 (행 0 ~ 3) ---
    // 차
    tempBoard[0][0] = { type: "차", camp: "han", name: "車" };
    tempBoard[0][8] = { type: "차", camp: "han", name: "車" };
    
    // 마 & 상 배치 결정
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

    // 사
    tempBoard[0][3] = { type: "사", camp: "han", name: "士" };
    tempBoard[0][5] = { type: "사", camp: "han", name: "士" };
    
    // 궁
    tempBoard[1][4] = { type: "궁", camp: "han", name: "漢" };

    // 포
    tempBoard[2][1] = { type: "포", camp: "han", name: "包" };
    tempBoard[2][7] = { type: "포", camp: "han", name: "包" };

    // 병
    tempBoard[3][0] = { type: "병", camp: "han", name: "兵" };
    tempBoard[3][2] = { type: "병", camp: "han", name: "兵" };
    tempBoard[3][4] = { type: "병", camp: "han", name: "兵" };
    tempBoard[3][6] = { type: "병", camp: "han", name: "兵" };
    tempBoard[3][8] = { type: "병", camp: "han", name: "兵" };

    // --- 초 (Blue) 기물 배치 (행 6 ~ 9) ---
    // 차
    tempBoard[9][0] = { type: "차", camp: "cho", name: "車" };
    tempBoard[9][8] = { type: "차", camp: "cho", name: "車" };

    // 마 & 상 배치 결정
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

    // 사
    tempBoard[9][3] = { type: "사", camp: "cho", name: "士" };
    tempBoard[9][5] = { type: "사", camp: "cho", name: "士" };

    // 궁
    tempBoard[8][4] = { type: "궁", camp: "cho", name: "楚" };

    // 포
    tempBoard[7][1] = { type: "포", camp: "cho", name: "包" };
    tempBoard[7][7] = { type: "포", camp: "cho", name: "包" };

    // 졸
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
    setStatusMessage("대국이 시작되었습니다. 초(Blue) 차례입니다.");
  };

  useEffect(() => {
    initBoard(choLayout, hanLayout);
  }, []);

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
        moves.push([nr, nc]); // 적 기물 잡기
      }
      return false; // 더 이상 전진 불가
    };

    switch (piece.type) {
      // 1. 차 (Chariot) 행마
      case "차": {
        // 동서남북 직선 탐색
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
        // 초 궁성 대각선
        if (isWithinPalace(r, c, "cho")) {
          const palaceCoords = [[7, 3], [7, 5], [8, 4], [9, 3], [9, 5]];
          const hasCoord = (row: number, col: number) => palaceCoords.some(([pr, pc]) => pr === row && pc === col);
          if (hasCoord(r, c)) {
            // 대각선 방향들
            const diagDirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
            for (const [dr, dc] of diagDirs) {
              const nr = r + dr;
              const nc = c + dc;
              if (isWithinPalace(nr, nc, "cho")) {
                // 중앙을 거쳐 반대편으로 가는 경우도 체크
                if (r === 8 && c === 4) { // 중앙에서 모서리로 갈 때
                  addMoveIfValid(nr, nc);
                } else if ((r === 7 || r === 9) && (c === 3 || c === 5)) { // 모서리에서 중앙으로 갈 때
                  const centerPiece = currentBoard[8][4];
                  if (centerPiece === null) {
                    // 중앙이 비었으면 중앙 추가 후 반대쪽 모서리도 확인
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
                    // 중앙이 가로막혀 있으면 중앙까지만
                    if (centerPiece.camp !== piece.camp) {
                      moves.push([8, 4]);
                    }
                  }
                }
              }
            }
          }
        }

        // 한 궁성 대각선
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
                // 다리 역할 기물 발견 (단, 포는 다리가 될 수 없음)
                if (target.type === "포") break;
                bridgeFound = true;
              }
            } else {
              // 다리를 건넌 후 탐색
              if (target === null) {
                moves.push([nr, nc]);
              } else {
                // 기물이 존재하는데, 포가 아니고 적의 기물인 경우만 잡을 수 있음
                if (target.type !== "포" && target.camp !== piece.camp) {
                  moves.push([nr, nc]);
                }
                break; // 기물이 있으므로 종료
              }
            }
            step++;
          }
        }

        // 궁성 내 대각선 포 행마
        const checkPalaceCannon = (palaceCamp: "cho" | "han", centerR: number) => {
          if (isWithinPalace(r, c, palaceCamp)) {
            // 모서리에서 중앙을 건너뛰는 경우만 대각선 포 행마가 유효
            if (r !== centerR && c !== 4) {
              const diagDirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
              for (const [dr, dc] of diagDirs) {
                const nr = r + dr * 2;
                const nc = c + dc * 2;
                if (isWithinPalace(nr, nc, palaceCamp)) {
                  // 다리가 될 기물 (중앙)
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
        // 8방향 일자 행마
        // 멱(막힘) 위치: 각 마 방향의 직선 1칸
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
          // 멱 위치가 판 내부여야 함
          if (br >= 0 && br <= 9 && bc >= 0 && bc <= 8) {
            // 멱이 비어있어야 이동 가능
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
        // 8방향 행마
        // 멱 위치 1: 직선 1칸
        // 멱 위치 2: 대각선 1칸 (꺾이는 부위)
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
            // 두 군데의 멱이 모두 비어 있어야 함
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
        // 궁성 내부 4방향 직선 이동
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const [dr, dc] of dirs) {
          const nr = r + dr;
          const nc = c + dc;
          if (isWithinPalace(nr, nc, palaceCamp)) {
            addMoveIfValid(nr, nc);
          }
        }

        // 궁성 대각선 선을 따른 이동
        const diagDirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        const centerR = palaceCamp === "han" ? 1 : 8;

        if (r === centerR && c === 4) {
          // 중앙에서는 대각선 4방향 이동 가능
          for (const [dr, dc] of diagDirs) {
            const nr = r + dr;
            const nc = c + dc;
            if (isWithinPalace(nr, nc, palaceCamp)) {
              addMoveIfValid(nr, nc);
            }
          }
        } else if ((r === centerR - 1 || r === centerR + 1) && (c === 3 || c === 5)) {
          // 모서리에서는 중앙으로만 대각선 이동 가능
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
        // 앞으로 1칸, 좌우로 1칸 (뒤로는 못감)
        const forwardDir = piece.camp === "cho" ? -1 : 1;
        const dirs = [[forwardDir, 0], [0, 1], [0, -1]];
        for (const [dr, dc] of dirs) {
          const nr = r + dr;
          const nc = c + dc;
          addMoveIfValid(nr, nc);
        }

        // 상대방 궁성에 들어갔을 때, 대각선 앞 방향 전진 가능
        const enemyPalace = piece.camp === "cho" ? "han" : "cho";
        const centerR = enemyPalace === "han" ? 1 : 8;

        if (isWithinPalace(r, c, enemyPalace)) {
          // 모서리에서 중앙으로 전진
          if ((piece.camp === "cho" && r === centerR + 1) || (piece.camp === "han" && r === centerR - 1)) {
            if (c === 3 || c === 5) {
              const dr = centerR - r;
              const dc = 4 - c;
              addMoveIfValid(r + dr, c + dc);
            }
          }
          // 중앙에서 전진 모서리로 대각선 전진
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

  // 인공지능(AI) 자동 계산 및 수 행하기
  const makeAIMove = (currentBoard: Board) => {
    // 1. AI(한나라 - Red)의 모든 유효한 기물 및 행마 수집
    const aiPieces: { from: [number, number]; to: [number, number]; weight: number }[] = [];

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const piece = currentBoard[r][c];
        if (piece && piece.camp === "han") {
          const pieceMoves = getMoves(r, c, currentBoard);
          for (const [tr, tc] of pieceMoves) {
            // 기물별 잡기 가중치 부여
            let weight = 0;
            const targetPiece = currentBoard[tr][tc];
            if (targetPiece) {
              // 피스 가치: 궁(100) > 차(15) > 포(10) > 마(7) > 상(5) > 사(3) > 졸/병(2)
              const values = { 궁: 1000, 차: 80, 포: 50, 마: 35, 상: 20, 사: 15, 졸: 10, 병: 10 };
              weight = values[targetPiece.type] || 10;
            }

            // 기물 전진 시 가벼운 가중치 (병 전진, 차 전진 등)
            weight += (tr - r) * 0.5; // 아래 방향으로 갈 때 가중치

            aiPieces.push({ from: [r, c], to: [tr, tc], weight });
          }
        }
      }
    }

    if (aiPieces.length === 0) {
      // 움직일 수 없으면 기권
      setWinner("cho");
      setStatusMessage("한(Red)이 움직일 기물이 없어 초(Blue)가 우승했습니다!");
      playSound("win");
      return;
    }

    // 가중치가 가장 높은 수 정렬 후 약간의 랜덤성 가미
    aiPieces.sort((a, b) => b.weight - a.weight);
    // 상위 30% 내의 행동 중 무작위 선택하여 너무 예측가능하지 않게 조절
    const bestPool = aiPieces.slice(0, Math.max(1, Math.floor(aiPieces.length * 0.25)));
    const selectedMove = bestPool[Math.floor(Math.random() * bestPool.length)];

    const [fr, fc] = selectedMove.from;
    const [tr, tc] = selectedMove.to;

    const movingPiece = currentBoard[fr][fc]!;
    const destPiece = currentBoard[tr][tc];

    // 이동 처리
    const nextBoard = currentBoard.map(row => [...row]);
    nextBoard[tr][tc] = movingPiece;
    nextBoard[fr][fc] = null;

    setBoard(nextBoard);
    playSound(destPiece ? "capture" : "move");

    const moveStr = `한: ${movingPiece.type}(${fr},${fc}) → (${tr},${tc})${destPiece ? ` [${destPiece.type} 획득]` : ""}`;
    setMoveHistory(prev => [moveStr, ...prev]);

    // 승리 감지 (궁 획득)
    if (destPiece && destPiece.type === "궁") {
      setWinner("han");
      setStatusMessage("한(Red)이 초의 궁을 획득하여 승리하였습니다!");
      playSound("win");
      return;
    }

    setCurrentTurn("cho");
    setStatusMessage("초(Blue) 차례입니다. 기물을 선택하세요.");
  };

  // 플레이어의 셀 클릭 시 동작 핸들러
  const handleCellClick = (r: number, c: number) => {
    if (winner) return;

    // AI 대전일 때 플레이어(초)의 턴이 아닐 때는 클릭 차단
    if (gameMode === "ai" && currentTurn === "han") return;

    // 1. 이미 이동 가능한 위치를 클릭한 경우 이동 처리
    const isPossible = possibleMoves.some(([pr, pc]) => pr === r && pc === c);
    if (isPossible && selectedPos) {
      const [sr, sc] = selectedPos;
      const piece = board[sr][sc]!;
      const destPiece = board[r][c];

      // 이동 적용
      const nextBoard = board.map(row => [...row]);
      nextBoard[r][c] = piece;
      nextBoard[sr][sc] = null;

      setBoard(nextBoard);
      playSound(destPiece ? "capture" : "move");

      const moveStr = `${piece.camp === "cho" ? "초" : "한"}: ${piece.type}(${sr},${sc}) → (${r},${c})${destPiece ? ` [${destPiece.type} 획득]` : ""}`;
      setMoveHistory(prev => [moveStr, ...prev]);

      // 승리 검사 (궁 획득)
      if (destPiece && destPiece.type === "궁") {
        setWinner(piece.camp);
        setStatusMessage(`${piece.camp === "cho" ? "초(Blue)" : "한(Red)"}가 승리하였습니다!`);
        playSound("win");
        return;
      }

      // 선택 상태 초기화
      setSelectedPos(null);
      setPossibleMoves([]);

      // 턴 교대
      const nextTurn = currentTurn === "cho" ? "han" : "cho";
      setCurrentTurn(nextTurn);

      if (gameMode === "ai" && nextTurn === "han") {
        setStatusMessage("한(Red) 컴퓨터가 수 계산 중입니다...");
        setTimeout(() => {
          makeAIMove(nextBoard);
        }, 800);
      } else {
        setStatusMessage(`${nextTurn === "cho" ? "초(Blue)" : "한(Red)"} 차례입니다. 기물을 선택하세요.`);
      }
      return;
    }

    // 2. 내 기물 선택 처리
    const clickedPiece = board[r][c];
    if (clickedPiece && clickedPiece.camp === currentTurn) {
      playSound("select");
      setSelectedPos([r, c]);
      const moves = getMoves(r, c, board);
      setPossibleMoves(moves);
      setStatusMessage(`${clickedPiece.type}을(를) 선택함. 이동할 위치를 클릭하세요.`);
    } else {
      // 빈 바닥이나 다른 곳 클릭 시 선택 초기화
      setSelectedPos(null);
      setPossibleMoves([]);
      setStatusMessage(`${currentTurn === "cho" ? "초(Blue)" : "한(Red)"} 차례입니다. 기물을 선택하세요.`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* 네비게이션 헤더 */}
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
              클래식 장기
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

      {/* 메인 영역 */}
      <main className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 설정 및 정보 카드 */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between gap-6 h-fit">
          <div className="space-y-4">
            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white leading-tight">
              클래식 한국 장기
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              가로 9줄, 세로 10줄의 선 위에서 초와 한이 수 싸움을 겨루는 한국의 정통 전략 보드게임입니다. 
            </p>

            {/* 모드 선택 */}
            {!gameStarted && (
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">게임 모드 선택</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setGameMode("pvp")}
                    className={`py-2 text-xs font-bold rounded-xl transition ${
                      gameMode === "pvp"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    👥 2인용 대국
                  </button>
                  <button
                    onClick={() => setGameMode("ai")}
                    className={`py-2 text-xs font-bold rounded-xl transition ${
                      gameMode === "ai"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    🤖 AI 대전 (VS 한나라)
                  </button>
                </div>

                {/* 차림새(마상 배열) 설정 */}
                <div className="space-y-2.5 pt-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                      초(Blue - 나) 차림새
                    </label>
                    <select
                      value={choLayout}
                      onChange={(e) => setChoLayout(e.target.value as MaSangLayout)}
                      className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs px-3 py-2 font-bold outline-none"
                    >
                      <option value="왼상">왼상차림 (마 - 상 - 마 - 상)</option>
                      <option value="오른상">오른상차림 (상 - 마 - 상 - 마)</option>
                      <option value="안상">안상차림 (마 - 상 - 상 - 마)</option>
                      <option value="바깥상">바깥상차림 (상 - 마 - 마 - 상)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                      한(Red - 상대) 차림새
                    </label>
                    <select
                      value={hanLayout}
                      onChange={(e) => setHanLayout(e.target.value as MaSangLayout)}
                      className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs px-3 py-2 font-bold outline-none"
                    >
                      <option value="왼상">왼상차림 (마 - 상 - 마 - 상)</option>
                      <option value="오른상">오른상차림 (상 - 마 - 상 - 마)</option>
                      <option value="안상">안상차림 (마 - 상 - 상 - 마)</option>
                      <option value="바깥상">바깥상차림 (상 - 마 - 마 - 상)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 상태 판 */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">현재 턴</span>
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
                  setStatusMessage("차림새를 설정하고 게임을 시작하세요.");
                }}
                className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-xl transition"
              >
                ⚙️ 차림새 설정 모드로 돌아가기
              </button>
            )}
          </div>
        </section>

        {/* 장기판 영역 */}
        <section className="col-span-1 lg:col-span-2 flex flex-col items-center">
          <div className="relative bg-[#e0a96d] dark:bg-[#5c4033] p-6 sm:p-8 rounded-3xl shadow-xl border-4 border-[#b87d4b] dark:border-[#3d2b1f] max-w-full overflow-auto">
            {/* 장기 격자선 데코용 SVG */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none opacity-20 dark:opacity-30"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* 여기에 추가적인 나무 무늬나 나뭇결 오버레이 제공 가능 */}
            </svg>

            {/* 격자판 컨테이너 */}
            <div className="grid grid-cols-9 gap-[3px] sm:gap-[6px] relative bg-[#f7eedc]/90 dark:bg-[#3d2c1f]/40 p-4 border-2 border-[#b87d4b] rounded-2xl min-w-[280px] sm:min-w-[420px]">
              
              {/* 장기선 그리기 (선 데코레이션) */}
              <div className="absolute inset-0 pointer-events-none p-4">
                <div className="w-full h-full relative border-2 border-[#b87d4b] dark:border-[#6a4e3b]">
                  {/* 가로 격자선 */}
                  {Array(8).fill(null).map((_, idx) => (
                    <div
                      key={`h-${idx}`}
                      className="absolute left-0 right-0 border-t border-[#b87d4b] dark:border-[#6a4e3b]"
                      style={{ top: `${(idx + 1) * 11.11}%` }}
                    />
                  ))}
                  {/* 세로 격자선 */}
                  {Array(7).fill(null).map((_, idx) => (
                    <div
                      key={`v-${idx}`}
                      className="absolute top-0 bottom-0 border-l border-[#b87d4b] dark:border-[#6a4e3b]"
                      style={{ left: `${(idx + 1) * 12.5}%` }}
                    />
                  ))}
                  {/* 한나라 궁성 대각선 (행 0~2, 열 3~5 -> 가로 37.5%~62.5%, 세로 0%~22.2%) */}
                  <svg className="absolute inset-0 w-full h-full" style={{ stroke: "#b87d4b", strokeWidth: 1.5 }}>
                    {/* 한 궁성 대각선 */}
                    <line x1="37.5%" y1="0%" x2="62.5%" y2="22.2%" />
                    <line x1="62.5%" y1="0%" x2="37.5%" y2="22.2%" />
                    {/* 초 궁성 대각선 (행 7~9, 열 3~5 -> 가로 37.5%~62.5%, 세로 77.7%~100%) */}
                    <line x1="37.5%" y1="77.7%" x2="62.5%" y2="100%" />
                    <line x1="62.5%" y1="77.7%" x2="37.5%" y2="100%" />
                  </svg>
                </div>
              </div>

              {/* 실제 기물 타일 */}
              {gameStarted &&
                board.map((row, rIdx) =>
                  row.map((piece, cIdx) => {
                    const isSelected = selectedPos && selectedPos[0] === rIdx && selectedPos[1] === cIdx;
                    const isMoveCandidate = possibleMoves.some(([pr, pc]) => pr === rIdx && pc === cIdx);

                    return (
                      <div
                        key={`cell-${rIdx}-${cIdx}`}
                        onClick={() => handleCellClick(rIdx, cIdx)}
                        className={`aspect-square flex items-center justify-center relative cursor-pointer z-10 transition rounded-full`}
                      >
                        {/* 이동 가능한 힌트 점 */}
                        {isMoveCandidate && (
                          <div className={`absolute w-3.5 h-3.5 rounded-full ${board[rIdx][cIdx] ? "bg-red-500/80 animate-pulse scale-110" : "bg-green-500/70"} z-20`} />
                        )}

                        {/* 기물 */}
                        {piece && (
                          <div
                            className={`w-[85%] h-[85%] rounded-full border-2 shadow-md flex items-center justify-center font-extrabold select-none transition-transform active:scale-95 ${
                              piece.camp === "cho"
                                ? "bg-[#dbebff] border-blue-500 text-blue-700 dark:bg-[#1E293B] dark:border-blue-500 dark:text-blue-400"
                                : "bg-[#ffdbe0] border-red-500 text-red-700 dark:bg-[#1E293B] dark:border-red-500 dark:text-red-400"
                            } ${isSelected ? "ring-4 ring-yellow-400 scale-110" : ""} ${
                              piece.type === "궁" ? "text-base sm:text-lg w-[95%] h-[95%]" : "text-xs sm:text-sm"
                            }`}
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

          {/* 승리 팝업 모달 */}
          {winner && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-sm w-full p-8 rounded-3xl text-center space-y-6 shadow-2xl">
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

          {/* 대국 기보 히스토리 로그 */}
          {gameStarted && moveHistory.length > 0 && (
            <div className="w-full mt-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-400 block">대국 기록 (실시간 기보)</h3>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-2 font-mono text-[10px] text-slate-600 dark:text-slate-400 leading-normal">
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

      {/* 푸터 영역 */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 bg-white dark:bg-slate-900 transition-colors">
        <div className="max-w-6xl mx-auto px-6 text-center text-xs text-slate-400 dark:text-slate-500">
          <p>© {new Date().getFullYear()} 리얼인포 전통 장기. 머리 아픈 일상에서 가볍게 전통 대국을 한 판 즐겨보세요.</p>
        </div>
      </footer>
    </div>
  );
}
