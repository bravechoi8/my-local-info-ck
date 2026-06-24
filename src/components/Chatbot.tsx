"use client";

import React, { useState, useEffect, useRef } from "react";

interface ChatItem {
  question: string;
  answer: string;
}

interface ChatbotProps {
  chatData: ChatItem[];
}

interface Message {
  id: number;
  sender: "user" | "bot" | "admin";
  text: string;
}

export default function Chatbot({ chatData }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isHumanMode, setIsHumanMode] = useState(false); // 상담원 모드 여부
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 챗봇 창이 열릴 때 최초 웰컴 메시지 등록
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 1,
          sender: "bot",
          text: "안녕하세요! '리얼인포'의 친절한 정보 가이드 '리얼 알리미'입니다. 아래 질문 리스트에서 궁금하신 내용을 선택하시거나, 입력창에 직접 질문을 남겨주시면 자세히 답변해 드릴게요!",
        },
      ]);
    }
  }, [messages]);

  // 대화가 추가되거나 로딩 상태가 바뀔 때마다 최하단으로 부드러운 스크롤 이동
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  }, [messages, isOpen, isLoading]);

  // 상담원 대화 데이터를 가져오는 함수 (실시간 동기화)
  const fetchAdminMessages = async () => {
    try {
      const res = await fetch("/api/chat-poll");
      if (res.ok) {
        const data = await res.json();
        // 응답이 배열 [{ sender: "admin", text: "..." }] 또는 { messages: [...] } 인지 유연하게 파싱
        const list = Array.isArray(data) ? data : data.messages || [];

        setMessages((prev) => {
          // 중복 렌더링 방지를 위해 기존 admin 메시지 텍스트 리스트 추출
          const existingAdminTexts = prev
            .filter((m) => m.sender === "admin")
            .map((m) => m.text);

          // 새로 들어온 admin 메시지만 필터링
          const newAdminMsgs = list
            .filter((m: any) => m.sender === "admin" && !existingAdminTexts.includes(m.message))
            .map((m: any) => ({
              id: Date.now() + Math.random(),
              sender: "admin" as const,
              text: m.message,
            }));

          if (newAdminMsgs.length === 0) return prev;
          return [...prev, ...newAdminMsgs];
        });
      }
    } catch (error) {
      console.error("Polling admin messages error:", error);
    }
  };

  // 상담원 대기 모드일 때 0.5초마다 /api/chat-poll 호출해서 admin 새 메시지 확인 (폴링)
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isOpen && isHumanMode) {
      // 즉시 한 번 동기화 실행
      fetchAdminMessages();

      // 0.5초 주기로 빠르게 갱신
      intervalId = setInterval(fetchAdminMessages, 500);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isOpen, isHumanMode]);

  // 상담원 연결 모드로 전환하는 함수
  const handleConnectHuman = () => {
    if (isHumanMode) return;
    setIsHumanMode(true);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: "bot",
        text: "상담원 연결을 시작합니다. 궁금한 내용을 남겨주시면 상담원이 확인 후 대답해 드립니다. 잠시만 기다려 주세요...",
      },
    ]);
  };

  // 자주 묻는 질문 버튼 클릭 시 처리 로직 (AI 모드에서만 사용)
  const handleQuestionClick = (question: string, answer: string) => {
    if (isLoading || isHumanMode) return;
    const userMsgId = Date.now();
    const botMsgId = userMsgId + 1;

    // 1. 유저의 질문 추가
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: "user", text: question },
    ]);

    // 2. 약간의 딜레이(300ms) 후 봇의 답변 추가
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: botMsgId, sender: "bot", text: answer },
      ]);
    }, 300);
  };

  // 사용자가 텍스트를 입력해서 전송할 때 처리 로직
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue.trim();
    const userMsgId = Date.now();

    // 1. 유저의 입력 질문 추가
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: "user", text: userText },
    ]);

    setInputValue("");

    // 상담원 대화 모드인 경우
    if (isHumanMode) {
      try {
        // /api/chat-human으로 POST 요청 (sender: "user" 추가)
        const res = await fetch("/api/chat-human", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: userText, sender: "user" }),
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        // 전송 성공 후 즉시 메시지 갱신 실행
        await fetchAdminMessages();
      } catch (error) {
        console.error("Failed to send message to counselor:", error);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            sender: "bot",
            text: "메시지 전송에 실패했습니다. 네트워크를 확인해 주세요.",
          },
        ]);
      }
      return;
    }

    // AI 모드인 경우 (기존 로직 수행)
    setIsLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userText }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      const botText =
        data.response ||
        data.result?.response ||
        "죄송합니다. 답변을 처리하지 못했습니다. 다시 시도해 주세요.";

      setMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: "bot", text: botText },
      ]);
    } catch (error) {
      console.error("AI chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: "bot",
          text: "서버와 통신하는 과정에서 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* 1. 플로팅 챗봇 버튼 (오렌지색 테마) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 p-4 bg-[#FF8A00] hover:bg-[#e07b00] text-white rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center focus:outline-none"
        aria-label="채팅 상담 열기"
      >
        {isOpen ? (
          // 닫기 아이콘 SVG
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          // 채팅 아이콘 SVG
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
            />
          </svg>
        )}
      </button>

      {/* 2. 채팅창 UI */}
      <div
        className={`fixed z-50 bg-[#F2F4F6] sm:bg-white flex flex-col border border-[#E5E8EB] shadow-2xl transition-all duration-300 ease-out origin-bottom-right
          ${
            isOpen
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 translate-y-10 scale-95 pointer-events-none"
          }
          fixed inset-0 sm:inset-auto sm:bottom-24 sm:right-6 sm:w-[360px] sm:h-[500px] sm:rounded-2xl overflow-hidden
        `}
      >
        {/* 채팅창 헤더 */}
        <div className="flex items-center justify-between px-4 py-4 bg-white border-b border-[#F2F4F6] shrink-0">
          <div className="flex items-center gap-2">
            {/* 챗봇 프로필 아이콘 영역 (오렌지색 테마) */}
            <div className="relative w-8 h-8 rounded-full bg-[#FFEEDC] flex items-center justify-center text-sm font-bold text-[#FF8A00]">
              {isHumanMode ? "상" : "알"}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#2EBD59] rounded-full border-2 border-white"></span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#191F28]">
                {isHumanMode ? "1:1 실시간 상담" : "리얼 알리미"}
              </h3>
              <p className="text-[10px] text-[#2EBD59] font-semibold">
                {isHumanMode ? "상담원 연결 대기" : "온라인 · 실시간 답변"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-[#F2F4F6] text-[#8B95A1] rounded-lg transition-colors focus:outline-none"
            aria-label="채팅 상담 닫기"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 채팅창 중앙: 대화 말풍선 영역 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F2F4F6]">
          {messages.map((msg) => (
            <div key={msg.id} className="flex flex-col">
              {msg.sender === "bot" || msg.sender === "admin" ? (
                // 봇 또는 관리자 상담원 메시지 (왼쪽 배치)
                <div className="flex items-start gap-2 max-w-[85%]">
                  <div className="w-6 h-6 rounded-full bg-[#FFEEDC] flex items-center justify-center text-[10px] font-bold text-[#FF8A00] shrink-0">
                    {msg.sender === "admin" ? "상" : "알"}
                  </div>
                  <div className="bg-white text-[#191F28] border border-[#E5E8EB] rounded-2xl rounded-tl-none p-3 text-xs leading-relaxed shadow-sm whitespace-pre-line">
                    {msg.text}
                  </div>
                </div>
              ) : (
                // 유저의 메시지 (오른쪽 배치)
                <div className="bg-[#3182F6] text-white rounded-2xl rounded-tr-none p-3 text-xs leading-relaxed shadow-sm max-w-[85%] ml-auto">
                  {msg.text}
                </div>
              )}
            </div>
          ))}

          {/* AI 답변 로딩 중 스피너 표시 */}
          {isLoading && !isHumanMode && (
            <div className="flex items-start gap-2 max-w-[85%]">
              <div className="w-6 h-6 rounded-full bg-[#FFEEDC] flex items-center justify-center text-[10px] font-bold text-[#FF8A00] shrink-0">
                알
              </div>
              <div className="bg-white text-[#8B95A1] border border-[#E5E8EB] rounded-2xl rounded-tl-none p-3 text-xs leading-relaxed shadow-sm flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 bg-[#FF8A00] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-1.5 h-1.5 bg-[#FF8A00] rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-1.5 h-1.5 bg-[#FF8A00] rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                <span className="text-[10px] ml-1 text-[#8B95A1] font-semibold">알리미가 생각하는 중...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 채팅창 하단: 질문 및 상담원 연결 제어 */}
        {!isHumanMode ? (
          <div className="bg-white border-t border-[#F2F4F6] p-3 shrink-0 flex flex-col gap-2 max-h-[160px] overflow-y-auto">
            {/* 상담원 연결 버튼 */}
            <button
              type="button"
              onClick={handleConnectHuman}
              className="w-full text-center text-xs bg-[#FF8A00] hover:bg-[#e07b00] text-white py-2 px-3 rounded-xl font-bold transition-all duration-200 focus:outline-none flex items-center justify-center gap-1.5 shadow-sm shrink-0"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
              실시간 상담원 연결
            </button>

            <div className="border-t border-[#F2F4F6] my-1"></div>

            <p className="text-[10px] font-bold text-[#8B95A1] uppercase tracking-wider">
              자주 묻는 질문
            </p>
            <div className="flex flex-col gap-1">
              {chatData.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleQuestionClick(item.question, item.answer)}
                  className="w-full text-left text-[11px] bg-[#F9FAFB] hover:bg-[#F2F4F6] text-[#4E5968] hover:text-[#191F28] py-2 px-3 rounded-xl border border-[#F2F4F6] transition-all duration-200 line-clamp-1 font-medium focus:outline-none"
                >
                  {item.question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          // 상담원 모드인 경우 안내바
          <div className="bg-[#FFEEDC] border-t border-[#FF8A00]/20 px-4 py-2 shrink-0 flex items-center justify-between text-[10px] font-bold text-[#FF8A00]">
            <span>상담원 1:1 채팅이 진행 중입니다.</span>
            <button
              onClick={() => setIsHumanMode(false)}
              className="text-[#e07b00] hover:underline"
            >
              상담 종료 (AI로 복귀)
            </button>
          </div>
        )}

        {/* 직접 텍스트 질문 입력창 */}
        <form
          onSubmit={handleSend}
          className="border-t border-[#F2F4F6] p-3 bg-white flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={
              isHumanMode
                ? "상담원에게 메시지를 보내세요..."
                : "알리미에게 무엇이든 물어보세요..."
            }
            disabled={isLoading && !isHumanMode}
            className="flex-1 bg-[#F2F4F6] border-0 outline-none rounded-xl py-2 px-3 text-xs text-[#191F28] placeholder-[#8B95A1] focus:ring-1 focus:ring-[#FF8A00] disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={(isLoading && !isHumanMode) || !inputValue.trim()}
            className={`p-2 rounded-xl transition-all duration-200 flex items-center justify-center ${
              inputValue.trim() && !(isLoading && !isHumanMode)
                ? "bg-[#FF8A00] text-white hover:bg-[#e07b00]"
                : "bg-[#F2F4F6] text-[#8B95A1] cursor-not-allowed"
            }`}
            aria-label="메시지 전송"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className="w-4 h-4"
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
    </>
  );
}
