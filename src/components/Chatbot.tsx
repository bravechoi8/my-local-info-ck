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
  sender: "user" | "bot";
  text: string;
}

export default function Chatbot({ chatData }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 챗봇 창이 열릴 때 최초 웰컴 메시지 등록
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 1,
          sender: "bot",
          text: "안녕하세요! '리얼인포' AI 상담원입니다. 아래 질문 리스트에서 궁금하신 내용을 선택하시면 자세히 안내해 드릴게요!",
        },
      ]);
    }
  }, [messages]);

  // 대화가 추가될 때마다 최하단으로 부드러운 스크롤 이동
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  }, [messages, isOpen]);

  // 질문 버튼 클릭 시 처리 로직
  const handleQuestionClick = (question: string, answer: string) => {
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

  return (
    <>
      {/* 1. 플로팅 챗봇 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 p-4 bg-[#3182F6] hover:bg-[#1b64da] text-white rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center focus:outline-none"
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
            {/* 챗봇 프로필 아이콘 영역 */}
            <div className="relative w-8 h-8 rounded-full bg-[#E5E8EB] flex items-center justify-center text-sm font-bold text-[#4E5968]">
              RI
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#2EBD59] rounded-full border-2 border-white"></span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#191F28]">리얼인포 AI 상담원</h3>
              <p className="text-[10px] text-[#2EBD59] font-semibold">온라인 · 실시간 답변</p>
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
              {msg.sender === "bot" ? (
                // 봇의 메시지 (왼쪽 배치)
                <div className="flex items-start gap-2 max-w-[85%]">
                  <div className="w-6 h-6 rounded-full bg-[#E5E8EB] flex items-center justify-center text-[10px] font-bold text-[#8B95A1] shrink-0">
                    AI
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
          <div ref={messagesEndRef} />
        </div>

        {/* 채팅창 하단: 질문 버튼 목록 */}
        <div className="bg-white border-t border-[#F2F4F6] p-4 shrink-0 flex flex-col gap-2 max-h-[180px] overflow-y-auto">
          <p className="text-[10px] font-bold text-[#8B95A1] uppercase tracking-wider mb-1">
            자주 묻는 질문
          </p>
          <div className="space-y-1.5">
            {chatData.map((item, index) => (
              <button
                key={index}
                onClick={() => handleQuestionClick(item.question, item.answer)}
                className="w-full text-left text-xs bg-[#F9FAFB] hover:bg-[#F2F4F6] text-[#4E5968] hover:text-[#191F28] py-2.5 px-3 rounded-xl border border-[#F2F4F6] transition-all duration-200 line-clamp-1 font-medium focus:outline-none"
              >
                {item.question}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
