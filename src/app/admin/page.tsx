"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Room {
  userId: string;
  message: string;
  sender: "user" | "admin";
  timestamp: number;
}

interface Message {
  id: number;
  sender: "user" | "admin";
  text: string;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
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
    } else {
      setErrorMsg("비밀번호가 일치하지 않습니다. 다시 입력해 주세요.");
    }
  };

  // 2. 대화 스크롤 이동
  useEffect(() => {
    if (isAuthorized && selectedUserId) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAuthorized, selectedUserId]);

  // 3. 활동 중인 방 목록 조회 (2초 주기로 동기화)
  const fetchRooms = async () => {
    try {
      const res = await fetch("/api/chat-poll?admin=true&t=" + Date.now(), { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const rawRooms = Array.isArray(data) ? data : [];
        // 최근 메시지 타임스탬프 기준으로 정렬하여 가장 최근에 대화한 손님이 목록 상단에 노출되도록 보장
        const sortedRooms = [...rawRooms].sort((a, b) => b.timestamp - a.timestamp);
        setRooms(sortedRooms);
      }
    } catch (error) {
      console.error("Admin fetch rooms error:", error);
    }
  };

  // 4. 선택된 방의 대화 내역 조회 (0.5초 주기로 동기화)
  const fetchMessages = async (userId: string) => {
    try {
      const res = await fetch(`/api/chat-poll?userId=${userId}&t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];

        const formattedList = list.map((m: any) => ({
          id: m.timestamp,
          sender: m.sender as "user" | "admin",
          text: m.message,
        }));

        setMessages([
          {
            id: 1,
            sender: "admin",
            text: `[방 번호: ${userId}] 고객 실시간 1:1 상담방입니다.`,
          },
          ...formattedList,
        ]);
      }
    } catch (error) {
      console.error("Admin fetch messages error:", error);
    }
  };

  // 5. 룸 목록 2초 주기 폴링
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isAuthorized) {
      fetchRooms();
      intervalId = setInterval(fetchRooms, 2000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAuthorized]);

  // 6. 활성화된 방 0.5초 주기 폴링
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isAuthorized && selectedUserId) {
      fetchMessages(selectedUserId);
      intervalId = setInterval(() => fetchMessages(selectedUserId), 500);
    } else {
      setMessages([]);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAuthorized, selectedUserId]);

  // 7. 답장 전송 핸들러
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !inputValue.trim() || isLoading) return;

    const replyText = inputValue.trim();
    setInputValue("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat-human", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUserId,
          message: replyText,
          sender: "admin",
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      await fetchMessages(selectedUserId);
      fetchRooms(); // 목록 최신화
    } catch (error) {
      console.error("Failed to send reply:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: "admin",
          text: "[오류] 답장 전송에 실패했습니다.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // 시간 포맷팅 함수
  const formatTime = (ts: number) => {
    if (!ts) return "";
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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

  // B. 인증 완료 상태: 멀티 상담방 대시보드 표시
  return (
    <div className="min-h-screen bg-[#F2F4F6] text-[#333D4B] antialiased flex flex-col h-screen overflow-hidden">
      {/* 관리자 헤더 */}
      <nav className="bg-white border-b border-[#E5E8EB] px-6 py-4 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
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
                D1 실시간 데이터베이스 연동 활성화 중
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setIsAuthorized(false);
                setSelectedUserId(null);
              }}
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

      {/* 대화방 목록 + 대화창 */}
      <div className="flex-grow max-w-7xl w-full mx-auto flex overflow-hidden p-4 sm:p-6 gap-4">
        {/* 왼쪽: 대화방 리스트 */}
        <aside className="w-80 bg-white border border-[#E5E8EB] rounded-3xl shadow-sm flex flex-col overflow-hidden shrink-0">
          <div className="p-4 border-b border-[#E5E8EB]">
            <h2 className="text-sm font-bold text-[#191F28]">대화 중인 손님 ({rooms.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-[#F2F4F6]">
            {rooms.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8B95A1] font-semibold">
                현재 활성화된 대화방이 없습니다.
              </div>
            ) : (
              rooms.map((room) => {
                const isActive = room.userId === selectedUserId;
                return (
                  <button
                    key={room.userId}
                    onClick={() => setSelectedUserId(room.userId)}
                    className={`w-full text-left p-4 transition-colors duration-150 flex flex-col gap-1 focus:outline-none ${
                      isActive ? "bg-[#FFEEDC]" : "hover:bg-[#F9FAFB]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#191F28] truncate max-w-[150px]">
                        {room.userId.replace("user_", "손님 #")}
                      </span>
                      <span className="text-[10px] text-[#8B95A1] font-medium shrink-0">
                        {formatTime(room.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-[#4E5968] truncate pr-2">
                      {room.sender === "admin" ? "[상담원] " : ""}{room.message}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* 오른쪽: 대화방 세부 대화 및 입력 */}
        <main className="flex-grow bg-white border border-[#E5E8EB] rounded-3xl shadow-sm flex flex-col overflow-hidden">
          {selectedUserId ? (
            <>
              {/* 대화 뷰 헤더 */}
              <div className="px-6 py-4 border-b border-[#E5E8EB] bg-[#F9FAFB] shrink-0">
                <span className="text-xs font-bold text-[#191F28]">
                  {selectedUserId.replace("user_", "손님 #")} 와의 대화방
                </span>
              </div>

              {/* 메시지 리스트 */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#F2F4F6]">
                {messages.map((msg) => (
                  <div key={msg.id} className="flex flex-col">
                    {msg.sender === "admin" ? (
                      <div className="flex items-start gap-2.5 max-w-[85%]">
                        <div className="w-8 h-8 rounded-full bg-[#FFEEDC] flex items-center justify-center text-xs font-bold text-[#FF8A00] shrink-0 shadow-sm">
                          상
                        </div>
                        <div className="bg-white text-[#191F28] border border-[#E5E8EB] rounded-2xl rounded-tl-none p-3 text-xs sm:text-sm leading-relaxed shadow-sm whitespace-pre-line">
                          {msg.text}
                        </div>
                      </div>
                    ) : (
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

              {/* 하단 답장 입력 폼 */}
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
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#F2F4F6] text-[#8B95A1] p-8">
              <div className="text-4xl mb-3">💬</div>
              <h3 className="text-sm font-bold text-[#4E5968] mb-1">대화방이 선택되지 않았습니다.</h3>
              <p className="text-xs text-center">왼쪽 손님 목록에서 대화하고 싶은 채팅방을 클릭하여 시작하세요! 🐾</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
