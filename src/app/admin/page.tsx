"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Message {
  id: number;
  sender: "user" | "admin";
  text: string;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. 로그인 핸들러
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "admin1234") {
      setIsAuthorized(true);
      setErrorMsg("");
      // 로그인 시 최초 알림 메시지 추가
      setMessages([
        {
          id: 1,
          sender: "admin",
          text: "고객 상담 관리 모드가 시작되었습니다. 2초 주기로 새 문의 사항을 동기화합니다.",
        },
      ]);
    } else {
      setErrorMsg("비밀번호가 일치하지 않습니다. 다시 입력해 주세요.");
    }
  };

  // 2. 대화 스크롤 이동
  useEffect(() => {
    if (isAuthorized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAuthorized]);

  // 3. 메시지 데이터를 가져오는 함수 (실시간 동기화)
  const fetchMessages = async () => {
    try {
      const res = await fetch("/api/chat-poll");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.messages || [];

        setMessages((prev) => {
          // 중복 렌더링 방지를 위해 기존 메시지들의 텍스트 세트 생성
          const existingTexts = prev.map((m) => m.text);

          // 서버에서 받은 전체 대화 내역 중 화면에 없는 메시지만 필터링해서 추가
          const newMsgs = list
            .filter((m: any) => !existingTexts.includes(m.message))
            .map((m: any) => ({
              id: Date.now() + Math.random(),
              sender: m.sender as "user" | "admin",
              text: m.message,
            }));

          if (newMsgs.length === 0) return prev;
          return [...prev, ...newMsgs];
        });
      }
    } catch (error) {
      console.error("Admin poll error:", error);
    }
  };

  // 4. 0.5초 주기 폴링 (인증 완료된 경우에만 작동)
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isAuthorized) {
      // 즉시 한 번 동기화 실행
      fetchMessages();

      // 0.5초 주기로 빠르게 갱신
      intervalId = setInterval(fetchMessages, 500);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAuthorized]);

  // 5. 답장 전송 핸들러
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const replyText = inputValue.trim();
    const replyMsgId = Date.now();

    // 관리자 메시지를 로컬 화면에 즉시 노출 (좌측 정렬)
    setMessages((prev) => [
      ...prev,
      { id: replyMsgId, sender: "admin", text: replyText },
    ]);

    setInputValue("");
    setIsLoading(true);

    try {
      // /api/chat-human으로 관리자 답장 POST 요청
      const res = await fetch("/api/chat-human", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: replyText,
          sender: "admin", // 관리자임을 표기
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      // 답장 전송 성공 후 즉시 메시지 갱신 실행
      await fetchMessages();
    } catch (error) {
      console.error("Failed to send reply:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: "admin",
          text: "[오류] 답장 전송에 실패했습니다. 네트워크 환경을 다시 확인해 주세요.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- UI 렌더링 시작 ---

  // A. 미인증 상태: 로그인 폼 표시
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] text-[#333D4B] flex items-center justify-center p-6 antialiased">
        <div className="max-w-md w-full bg-white rounded-3xl border border-[#E5E8EB] p-8 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#191F28]">
              상담 관리자 로그인
            </h1>
            <p className="text-xs text-[#8B95A1]">
              고객 실시간 1:1 상담을 위해 관리자 인증번호를 입력해 주세요.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs font-bold text-[#4E5968] uppercase tracking-wider"
              >
                비밀번호
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                required
                className="w-full bg-[#F2F4F6] border-0 outline-none rounded-xl py-3 px-4 text-sm text-[#191F28] placeholder-[#8B95A1] focus:ring-2 focus:ring-[#FF8A00]"
              />
            </div>

            {errorMsg && (
              <p className="text-xs font-semibold text-[#F04452] pl-1">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-[#FF8A00] hover:bg-[#e07b00] text-white text-sm font-bold rounded-xl transition-all duration-200 shadow-sm focus:outline-none"
            >
              인증 및 접속하기
            </button>
          </form>

          <div className="text-center pt-2">
            <Link
              href="/"
              className="text-xs text-[#8B95A1] hover:text-[#4E5968] underline"
            >
              홈페이지로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // B. 인증 완료 상태: 1:1 대화 대시보드 표시
  return (
    <div className="min-h-screen bg-[#F2F4F6] text-[#333D4B] antialiased flex flex-col">
      {/* 관리자 헤더 */}
      <nav className="sticky top-0 z-50 bg-white border-b border-[#E5E8EB] px-6 py-4 shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-full bg-[#FFEEDC] flex items-center justify-center text-sm font-bold text-[#FF8A00]">
              상
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#2EBD59] rounded-full border-2 border-white animate-pulse"></span>
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-[#191F28]">
                실시간 1:1 고객 상담실
              </h1>
              <p className="text-[10px] text-[#2EBD59] font-bold">
                실시간 업데이트 작동 중 (2초 주기로 동기화)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAuthorized(false)}
              className="text-xs font-semibold text-[#8B95A1] hover:text-[#4E5968]"
            >
              로그아웃
            </button>
            <Link
              href="/"
              className="text-xs font-semibold text-[#FF8A00] hover:text-[#e07b00] px-3 py-1.5 bg-[#FFEEDC] rounded-lg"
            >
              블로그 홈
            </Link>
          </div>
        </div>
      </nav>

      {/* 중앙 대화방 영역 */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 overflow-y-auto space-y-4">
        <div className="bg-white border border-[#E5E8EB] rounded-3xl shadow-sm flex flex-col h-[calc(100vh-180px)] overflow-hidden">
          
          {/* 내부 대화 창 */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#F2F4F6]">
            {messages.map((msg) => (
              <div key={msg.id} className="flex flex-col">
                {msg.sender === "admin" ? (
                  // 관리자 본인의 답장 (왼쪽 배치 - 요구사항 적용)
                  <div className="flex items-start gap-2.5 max-w-[85%]">
                    <div className="w-8 h-8 rounded-full bg-[#FFEEDC] flex items-center justify-center text-xs font-bold text-[#FF8A00] shrink-0 shadow-sm">
                      상
                    </div>
                    <div className="bg-white text-[#191F28] border border-[#E5E8EB] rounded-2xl rounded-tl-none p-3 text-xs sm:text-sm leading-relaxed shadow-sm whitespace-pre-line">
                      {msg.text}
                    </div>
                  </div>
                ) : (
                  // 고객(방문자)의 메시지 (오른쪽 배치 - 요구사항 적용)
                  <div className="flex flex-col items-end ml-auto max-w-[85%]">
                    <span className="text-[10px] text-[#8B95A1] font-semibold mb-1 pr-1">고객 문의</span>
                    <div className="bg-[#3182F6] text-white rounded-2xl rounded-tr-none p-3 text-xs sm:text-sm leading-relaxed shadow-sm">
                      {msg.text}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* 하단 입력창 영역 */}
          <form
            onSubmit={handleSendReply}
            className="border-t border-[#E5E8EB] p-4 bg-white flex items-center gap-3 shrink-0"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="방문자 고객에게 보낼 답장을 입력하세요..."
              className="flex-1 bg-[#F2F4F6] border-0 outline-none rounded-2xl py-3.5 px-4 text-xs sm:text-sm text-[#191F28] placeholder-[#8B95A1] focus:ring-1 focus:ring-[#FF8A00]"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className={`p-3.5 rounded-2xl transition-all duration-200 flex items-center justify-center shrink-0 ${
                inputValue.trim() && !isLoading
                  ? "bg-[#FF8A00] text-white hover:bg-[#e07b00]"
                  : "bg-[#F2F4F6] text-[#8B95A1] cursor-not-allowed"
              }`}
              aria-label="답장 전송"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="w-4 h-4 sm:w-5 sm:h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
