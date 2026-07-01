"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import DarkModeToggle from "@/components/DarkModeToggle";

interface Segment {
  start: number;
  end: number;
  text: string;
}

interface FileState {
  file: File;
  name: string;
  size: number;
  status: "pending" | "processing" | "done" | "error";
  errorMsg?: string;
  result?: {
    text: string;
    segments?: Segment[];
    hasTimestamps: boolean;
  };
}

// 1. WAV 헤더 작성 및 PCM 데이터 인코딩 유틸리티
function bufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // 1 = 16-bit PCM
  const bitDepth = 16;
  
  let result;
  if (numOfChan === 1) {
    result = buffer.getChannelData(0);
  } else {
    // 2채널 오디오 데이터 인터리빙 병합
    const c0 = buffer.getChannelData(0);
    const c1 = buffer.getChannelData(1);
    const interleaved = new Float32Array(c0.length + c1.length);
    let srcIdx = 0;
    let dstIdx = 0;
    while (srcIdx < c0.length) {
      interleaved[dstIdx++] = c0[srcIdx];
      interleaved[dstIdx++] = c1[srcIdx];
      srcIdx++;
    }
    result = interleaved;
  }
  
  const bufferArr = new ArrayBuffer(44 + result.length * 2);
  const view = new DataView(bufferArr);
  
  writeString(0, "RIFF");
  view.setUint32(4, 36 + result.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numOfChan, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numOfChan * (bitDepth / 8), true);
  view.setUint16(32, numOfChan * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(36, "data");
  view.setUint32(40, result.length * 2, true);
  
  let offset = 44;
  for (let i = 0; i < result.length; i++) {
    const s = Math.max(-1, Math.min(1, result[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }
  
  return new Blob([bufferArr], { type: "audio/wav" });
  
  function writeString(offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}

// 2. 브라우저 프론트엔드 내장 Web Audio API 고압축 리샘플링 음성 추출기 (16kHz 모노 변환)
async function extractAudioInBrowser(file: File, onProgress: (msg: string) => void): Promise<File> {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error("이 브라우저는 Web Audio API를 지원하지 않습니다.");
  }
  
  const audioCtx = new AudioContextClass();
  const arrayBuffer = await file.arrayBuffer();
  
  onProgress("⏳ 미디어 해체 및 음질 분석 중... (대용량 파일은 최대 10~30초 소요)");
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  
  onProgress("⏳ 16kHz 모노 고압축 리샘플링 진행 중...");
  const targetSampleRate = 16000;
  const offlineCtx = new OfflineAudioContext(
    1, // 1채널 (모노)
    Math.floor(audioBuffer.duration * targetSampleRate),
    targetSampleRate
  );
  
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start();
  
  const renderedBuffer = await offlineCtx.startRendering();
  
  onProgress("⏳ 초경량 WAV 파일 인코딩 중...");
  const wavBlob = bufferToWav(renderedBuffer);
  
  const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
  return new File([wavBlob], `${originalName}.wav`, { type: "audio/wav" });
}

// 3. 정형 환각 및 침묵 패턴 차단 필터
function checkHallucination(text: string, elapsed?: number): boolean {
  if (!text) return false;
  const normalized = text.replace(/\s+/g, "").toLowerCase();
  
  const hallucinationPhrases = [
    "시청해주셔서감사합니다",
    "시청해주셔서감사합니다.",
    "구독과좋아요",
    "구독좋아요",
    "구독&좋아요",
    "구독부탁드립니다",
    "좋아요부탁드립니다",
    "다음영상에서만나요",
    "다음시간에만나요",
    "플레임tv",
    "자막제공",
    "한국어자막",
    "번역제공",
    "배달의민족",
    "쿠팡플레이",
    "쿠팡이츠",
    "네이버",
    "mbc뉴스",
    "kbs뉴스",
    "sbs뉴스",
    "jtbc뉴스",
    "ytn",
    "이덕영입니다",
    "thanksforwatching",
    "thankyouforwatching",
    "plsesubscribe",
    "subscribetomychannel",
    "likeandsubscribe",
    "고맙습니다",
    "감사합니다",
    "고맙습니다.",
    "감사합니다."
  ];

  for (const phrase of hallucinationPhrases) {
    if (normalized === phrase || normalized.includes(phrase)) {
      return true;
    }
  }

  // 2초 이하 초단기 소리인데 글자수가 비정상적으로 쏟아져 들어온 경우 차단
  if (elapsed !== undefined && elapsed <= 2.0 && text.length > elapsed * 12) {
    return true;
  }

  return false;
}

export default function STTPage() {
  const [files, setFiles] = useState<FileState[]>([]);
  const [ytUrl, setYtUrl] = useState("");
  const [ytSource, setYtSource] = useState<any>(null);
  
  // 모달 제어
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showYtModal, setShowYtModal] = useState(false);
  
  // API Keys
  const [openaiKey, setOpenaiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  
  // 옵션들
  const [optTimestamps, setOptTimestamps] = useState(false);
  const [optDiarize, setOptDiarize] = useState(false);
  const [optSummary, setOptSummary] = useState(false);
  const [optKeywords, setOptKeywords] = useState(false);

  // 결과 패널들
  const [transResult, setTransResult] = useState<any>(null);
  const [aiResult, setAiResult] = useState<{
    keywords: string[] | null;
    summary: string | null;
    diarize: string | null;
  }>({ keywords: null, summary: null, diarize: null });

  const [isProcessing, setIsProcessing] = useState(false);
  const [aiProgress, setAiProgress] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);

  // 실시간 마이크 받아쓰기 상태
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribingMic, setIsTranscribingMic] = useState(false);
  const [dictationText, setDictationText] = useState("");
  const [hotkey, setHotkey] = useState("F8");
  const [isListeningHotkey, setIsListeningHotkey] = useState(false);
  const [showDictationPanel, setShowDictationPanel] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const toastTimeoutRef = useRef<any>(null);
  const recordingStartTimeRef = useRef<number>(0);

  // API 키 로드
  useEffect(() => {
    if (typeof window !== "undefined") {
      setOpenaiKey(localStorage.getItem("openai_api_key") || "");
      setGeminiKey(localStorage.getItem("gemini_api_key") || "");
      setHotkey(localStorage.getItem("dictation_hotkey") || "F8");
    }
  }, []);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setShowToast(false);
    }, 2500);
  };

  const handleToggleDictation = () => {
    const nextState = !showDictationPanel;
    setShowDictationPanel(nextState);
    
    if (nextState) {
      if (!isRecording) {
        toggleRecording();
      }
    } else {
      if (isRecording) {
        toggleRecording();
      }
    }
  };

  // 단축키 녹음 기능 연동
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isListeningHotkey) return; // 단축키 지정 중에는 무시
      // 활성화된 입력 필드에 포커스가 있을 때는 무시 (채팅창 입력 등 방지)
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      if (e.key.toUpperCase() === hotkey.toUpperCase()) {
        e.preventDefault();
        handleToggleDictation();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hotkey, isRecording, isListeningHotkey, openaiKey, showDictationPanel]);

  // 마이크 녹음 시작/중지
  const toggleRecording = async () => {
    if (isRecording) {
      // 녹음 종료
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      // API Key 체크
      if (!openaiKey) {
        triggerToast("마이크 받아쓰기에는 OpenAI API 키가 필요합니다. 설정에서 먼저 등록해주세요.");
        setShowApiKeyModal(true);
        return;
      }
      // 녹음 시작
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
        mediaRecorderRef.current = mediaRecorder;
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const elapsed = (Date.now() - recordingStartTimeRef.current) / 1000;
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          // 스트림 트랙 중지 (마이크 끄기)
          stream.getTracks().forEach(track => track.stop());
          
          // API 변환 요청
          await transcribeMicAudio(audioBlob, elapsed);
        };

        mediaRecorder.start();
        recordingStartTimeRef.current = Date.now();
        setIsRecording(true);
        triggerToast("🎙️ 실시간 녹음 시작 (다시 누르면 완료)");
      } catch (err) {
        console.error(err);
        triggerToast("마이크 연결 실패: 권한을 확인해주세요.");
      }
    }
  };

  // 녹음된 오디오 변환
  const transcribeMicAudio = async (blob: Blob, elapsed: number) => {
    setIsTranscribingMic(true);
    triggerToast("⏳ 녹음 완료! 텍스트로 변환 중...");
    try {
      const file = new File([blob], "mic-recording.webm", { type: "audio/webm" });
      const text = await whisperTranscribeDirect(file, false);
      
      // 환각 방지 필터링
      if (checkHallucination(text, elapsed)) {
        console.log(`[Whisper 마이크] 환각 차단됨 | 시간: ${elapsed.toFixed(1)}초 | 결과: "${text}"`);
        triggerToast("⚠️ 오인식(침묵/환각)이 감지되어 입력을 차단했습니다.");
        return;
      }

      setDictationText(prev => prev ? prev + "\n" + text : text);
      triggerToast("✅ 받아쓰기 완료!");
    } catch (err: any) {
      console.error(err);
      triggerToast(`변환 실패: ${err.message}`);
    } finally {
      setIsTranscribingMic(false);
    }
  };

  // 브라우저에서 직접 OpenAI Whisper API 호출
  const whisperTranscribeDirect = async (file: File, timestamps: boolean) => {
    if (!openaiKey) throw new Error("OpenAI API Key가 누락되었습니다.");
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", "whisper-1");
    formData.append("language", "ko");

    if (timestamps) {
      formData.append("response_format", "verbose_json");
      formData.append("timestamp_granularities[]", "segment");
    } else {
      formData.append("response_format", "json");
    }

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody?.error?.message || `Whisper API 오류 (${res.status})`);
    }

    const data = await res.json();
    return timestamps ? data : data.text;
  };

  // 파일 추가 핸들러
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const addFiles = (rawFiles: File[]) => {
    setYtSource(null); // 유튜브 지움
    const validFiles = rawFiles.filter(file => {
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > 1024) {
        triggerToast(`${file.name}은 1GB를 초과하여 제외됩니다.`);
        return false;
      }
      return true;
    });

    const newStates: FileState[] = validFiles.map(file => ({
      file,
      name: file.name,
      size: file.size,
      status: "pending",
    }));

    setFiles(prev => {
      const filtered = prev.filter(p => !newStates.some(n => n.name === p.name));
      return [...filtered, ...newStates];
    });
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  // API 키 저장
  const handleSaveApiKeys = () => {
    localStorage.setItem("openai_api_key", openaiKey.trim());
    localStorage.setItem("gemini_api_key", geminiKey.trim());
    triggerToast("API 키가 저장되었습니다.");
    setShowApiKeyModal(false);
  };

  // 유튜브 자막 가져오기
  const handleFetchYoutube = async () => {
    if (!ytUrl.trim()) return;
    setShowYtModal(false);
    triggerToast("🎬 유튜브 자막을 파싱하고 있습니다...");
    try {
      const res = await fetch(`/api/youtube-captions?url=${encodeURIComponent(ytUrl.trim())}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "자막을 가져오는데 실패했습니다.");
      }
      const data = await res.json();
      setFiles([]); // 파일목록 클리어
      setYtSource(data);
      
      const resData = {
        title: data.title,
        segments: data.segments,
        hasTimestamps: true,
      };
      setTransResult(resData);
      triggerToast("✅ 유튜브 자막 추출 성공!");

      // AI 후속 처리 실행
      await runAiAnalysis(data.segments, data.segments.map((s: any) => s.text).join(" "));
    } catch (err: any) {
      triggerToast(err.message);
    }
  };

  // 변환 시작 버튼
  const handleConvert = async () => {
    setAiResult({ keywords: null, summary: null, diarize: null });
    setAiProgress("");

    if (files.length > 0) {
      if (!openaiKey) {
        triggerToast("변환을 위해 OpenAI API 키를 설정해주세요.");
        setShowApiKeyModal(true);
        return;
      }

      setIsProcessing(true);
      let lastResult: any = null;

      const updatedFiles = [...files];
      for (let i = 0; i < updatedFiles.length; i++) {
        const f = updatedFiles[i];
        if (f.status === "done") continue;
        
        f.status = "processing";
        setFiles([...updatedFiles]);

        try {
          const sizeMB = f.file.size / (1024 * 1024);
          let fileToTranscribe = f.file;
          
          // 확장자 체크
          const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
          const isPassthrough = [".mp3", ".wav", ".flac", ".ogg", ".oga"].includes(ext);
          
          // 25MB를 초과하거나 비디오 파일인 경우, 브라우저 단에서 WAV 음성 디코딩 추출 수행
          if (!isPassthrough || sizeMB > 24.5) {
            try {
              fileToTranscribe = await extractAudioInBrowser(f.file, (msg) => {
                f.errorMsg = msg; // 진행상황을 UI에 상태 뱃지로 실시간 표현
                setFiles([...updatedFiles]);
              });
            } catch (extractErr: any) {
              throw new Error(`브라우저 음성 추출 실패: ${extractErr.message}`);
            }
          }

          f.errorMsg = "⏳ OpenAI Whisper 변환 시작...";
          setFiles([...updatedFiles]);

          const apiResult = await whisperTranscribeDirect(fileToTranscribe, optTimestamps);
          let segments = null;
          let text = "";

          if (optTimestamps && apiResult.segments) {
            segments = apiResult.segments.map((s: any) => ({
              start: s.start,
              end: s.end,
              text: s.text,
            }));
            text = apiResult.text;
          } else {
            text = typeof apiResult === "string" ? apiResult : apiResult.text;
          }

          // 환각 방지 검사
          if (checkHallucination(text)) {
            text = "[침묵 또는 AI 오인식(환각) 텍스트 차단됨]";
            if (segments) {
              segments = segments.filter((s: any) => !checkHallucination(s.text));
            }
          }

          f.status = "done";
          f.errorMsg = undefined;
          f.result = {
            text,
            segments,
            hasTimestamps: optTimestamps,
          };
          lastResult = {
            title: f.name,
            text,
            segments,
            hasTimestamps: optTimestamps,
          };
        } catch (err: any) {
          f.status = "error";
          f.errorMsg = err.message;
          triggerToast(`${f.name} 변환 실패: ${err.message}`);
        }
        setFiles([...updatedFiles]);
      }

      setIsProcessing(false);
      if (lastResult) {
        setTransResult(lastResult);
        triggerToast("🎉 변환이 완료되었습니다!");

        // AI 분석 실행
        await runAiAnalysis(lastResult.segments || [], lastResult.text);
      }
    } else if (ytSource) {
      const resData = {
        title: ytSource.title,
        segments: ytSource.segments,
        hasTimestamps: true,
      };
      setTransResult(resData);
      triggerToast("자막 데이터를 로드했습니다.");
      await runAiAnalysis(ytSource.segments, ytSource.segments.map((s: any) => s.text).join(" "));
    }
  };

  // Gemini AI 분석 공통 호출
  const callGeminiDirect = async (prompt: string) => {
    if (!geminiKey) {
      throw new Error("Gemini API 키가 설정되지 않았습니다.");
    }
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || "Gemini 호출 오류");
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini 응답이 비어있습니다.");
    return text.trim();
  };

  // AI 분석 옵션 실행
  const runAiAnalysis = async (segments: any[], fullText: string) => {
    if (!optDiarize && !optSummary && !optKeywords) return;
    if (!geminiKey) {
      triggerToast("화자분리/요약/키워드 분석을 하려면 Gemini API 키를 먼저 등록해주세요.");
      return;
    }

    let diarizeText = null;
    let summaryText = null;
    let keywordsList = null;

    // 1. 화자분리
    if (optDiarize) {
      setAiProgress("👥 AI 화자 분리 분석 중...");
      try {
        const body = segments && segments.length > 0
          ? segments.map(s => `[${s.start.toFixed(1)}s] ${s.text}`).join("\n")
          : fullText;
        const prompt = `다음은 음성 받아쓰기 결과입니다. 발화 패턴(말투, 어조, 응답 관계)을 보고 화자를 추정해 라벨링해주세요.
규칙:
- 화자는 '화자1', '화자2', '화자3' 형식으로 표기
- 같은 사람이 연속해서 말하면 한 줄로 합쳐도 됨
- 시간 정보가 있으면 [00:12] 형식으로 변환해 앞에 붙임
- 한 화자가 명확하면 그렇게 라벨링, 1인 발화로 보이면 모두 '화자1'
- 결과는 순수 텍스트만. 설명/마크다운 금지

원본:
${body}

화자 분리 결과:`;
        diarizeText = await callGeminiDirect(prompt);
      } catch (err: any) {
        console.error(err);
        triggerToast(`화자 분리 실패: ${err.message}`);
      }
    }

    // 2. 요약
    if (optSummary) {
      setAiProgress("📝 AI 요약 작성 중...");
      try {
        const prompt = `다음 받아쓰기 결과를 한국어로 요약해주세요.
규칙:
- 마크다운 형식 (불릿 포인트 위주)
- 핵심 주제 1~2줄로 시작
- 주요 내용을 5~8개 불릿으로
- 결정 사항이나 액션 아이템이 있으면 별도 섹션으로
- 군더더기 없이 간결하게

원본:
${fullText}

요약:`;
        summaryText = await callGeminiDirect(prompt);
      } catch (err: any) {
        console.error(err);
        triggerToast(`요약 실패: ${err.message}`);
      }
    }

    // 3. 키워드 추출
    if (optKeywords) {
      setAiProgress("🔑 핵심 키워드 추출 중...");
      try {
        const prompt = `다음 받아쓰기 결과에서 핵심 키워드 5~10개를 추출해주세요.
규칙:
- 한국어 명사 위주 (필요하면 영어 고유명사 허용)
- 너무 일반적인 단어 제외
- 결과는 반드시 JSON 배열 한 줄: ['키워드1', '키워드2', ...]
- JSON 외 다른 텍스트, 설명 금지

원본:
${fullText}

JSON 배열:`;
        const raw = await callGeminiDirect(prompt);
        // JSON 파싱 시도
        let cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
        try {
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed)) keywordsList = parsed;
        } catch (_) {
          // 폴백 파싱
          keywordsList = cleaned.replace(/[\[\]"'`]/g, "").split(/,|\n/).map((k: string) => k.trim()).filter((k: string) => k);
        }
      } catch (err: any) {
        console.error(err);
        triggerToast(`키워드 추출 실패: ${err.message}`);
      }
    }

    setAiProgress("");
    setAiResult({
      keywords: keywordsList,
      summary: summaryText,
      diarize: diarizeText,
    });
  };

  // 복사 / 저장 유틸리티
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    triggerToast("📋 클립보드에 복사되었습니다!");
  };

  const handleDownloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast("💾 파일이 저장되었습니다.");
  };

  // SRT 파일 변환 유틸
  const convertToSrt = (segments: Segment[]) => {
    return segments.map((s, idx) => {
      const num = idx + 1;
      return `${num}\n${formatSrtTime(s.start)} --> ${formatSrtTime(s.end)}\n${s.text}\n\n`;
    }).join("");
  };

  const formatSrtTime = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 1000);
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
  };

  const formatTs = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = Math.floor(sec % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // 단축키 설정 대기 리스너
  const handleListenHotkey = () => {
    setIsListeningHotkey(true);
    triggerToast("키보드의 원하시는 단축키를 입력하세요...");
  };

  useEffect(() => {
    if (!isListeningHotkey) return;
    const handleKeyDetect = (e: KeyboardEvent) => {
      e.preventDefault();
      const newKey = e.key.toUpperCase();
      setHotkey(newKey);
      localStorage.setItem("dictation_hotkey", newKey);
      setIsListeningHotkey(false);
      triggerToast(`단축키가 [${newKey}] 로 변경되었습니다.`);
    };
    window.addEventListener("keydown", handleKeyDetect);
    return () => window.removeEventListener("keydown", handleKeyDetect);
  }, [isListeningHotkey]);

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#0B0F19] text-[#333D4B] dark:text-[#E5E8EB] antialiased flex flex-col justify-between transition-colors duration-300">
      {/* GNB (상단 네비게이션) */}
      <nav className="bg-white dark:bg-[#0B0F19] border-b border-[#F2F4F6] dark:border-slate-800/80 px-3 py-2 sm:px-6 sm:py-4 transition-colors">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#191F28] dark:text-[#F3F4F6] hover:text-[#3182F6] transition-colors"
          >
            &larr; 홈으로 돌아가기
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-[10px] sm:text-xs font-semibold text-[#8B95A1] dark:text-slate-400 tracking-wider">
              STT 받아쓰기 스튜디오 🎙️
            </span>
            <button
              onClick={() => setShowApiKeyModal(true)}
              className="text-[10px] sm:text-xs font-bold text-[#4E5968] dark:text-slate-300 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              🔑 API 설정
            </button>
            <DarkModeToggle />
          </div>
        </div>
      </nav>

      {/* 메인 작업 영역 */}
      <main className="max-w-3xl mx-auto w-full px-4 py-8 flex-grow flex flex-col gap-6">
        {/* 설명 헤더 */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#191F28] dark:text-white leading-tight">
              STT Studio
            </h1>
            <button
              onClick={(e) => { e.stopPropagation(); handleToggleDictation(); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer select-none active:scale-95 flex items-center gap-1.5 ${
                isRecording 
                  ? "bg-red-500 hover:bg-red-600 text-white border-red-500 animate-pulse font-extrabold" 
                  : "bg-[#EEF2FF] dark:bg-slate-800 text-[#3182F6] dark:text-blue-400 border-[#DBEAFE] dark:border-slate-700 hover:bg-[#E0E7FF] dark:hover:bg-slate-700"
              }`}
            >
              {isRecording ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                  녹음 중 (클릭시 종료)
                </>
              ) : (
                "🎙️ stt 실시간 받아쓰기"
              )}
            </button>
          </div>
          <p className="text-sm text-[#4E5968] dark:text-[#8B95A1]">
            음성/영상 파일(최대 1GB)을 올리거나 유튜브 링크를 텍스트로 변환합니다.
          </p>
        </div>

        {/* 파일 드롭존 */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          onClick={() => document.getElementById("file-input")?.click()}
          className="border-2 border-dashed border-[#CBD5E0] dark:border-slate-700 hover:border-[#3182F6] dark:hover:border-[#3182F6] bg-white dark:bg-slate-900 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center gap-4 shadow-sm"
        >
          <input
            type="file"
            id="file-input"
            accept="audio/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(Array.from(e.target.files));
            }}
          />
          <span className="text-4xl">🎙️</span>
          <div>
            <p className="text-base font-bold text-slate-800 dark:text-slate-200">파일을 여기로 드래그하거나 클릭하세요</p>
            <p className="text-xs text-slate-400 mt-1">mp3, wav, m4a, mp4, webm, mkv, mov 등 (최대 1GB 대용량 지원)</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); document.getElementById("file-input")?.click(); }}
              className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              📁 파일 선택
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowYtModal(true); }}
              className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              🎬 유튜브 링크
            </button>
          </div>
        </div>

        {/* 변환 설정 옵션 */}
        <div className="bg-white dark:bg-slate-900 border border-[#F2F4F6] dark:border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
          <div className="text-sm font-bold text-[#191F28] dark:text-white">변환 및 AI 분석 옵션</div>
          
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-4 text-xs font-medium">
              <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                <input type="checkbox" checked disabled className="accent-[#3182F6] h-4 w-4" />
                <span>받아쓰기 (기본)</span>
              </label>
              <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={optTimestamps}
                  onChange={(e) => setOptTimestamps(e.target.checked)}
                  className="accent-[#3182F6] h-4 w-4 cursor-pointer"
                />
                <span>타임스탬프 표시</span>
              </label>
            </div>
            
            <div className="border-t border-[#F2F4F6] dark:border-slate-800/80 my-1"></div>
            
            <div className="flex flex-wrap gap-4 text-xs font-medium">
              <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300 cursor-pointer select-none" title="제미나이가 화자 대화를 분리해 라벨링해 줍니다.">
                <input
                  type="checkbox"
                  checked={optDiarize}
                  onChange={(e) => setOptDiarize(e.target.checked)}
                  className="accent-[#3182F6] h-4 w-4 cursor-pointer"
                />
                <span>화자 분리 👥</span>
              </label>
              <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300 cursor-pointer select-none" title="내용을 핵심 위주로 불릿 요약합니다.">
                <input
                  type="checkbox"
                  checked={optSummary}
                  onChange={(e) => setOptSummary(e.target.checked)}
                  className="accent-[#3182F6] h-4 w-4 cursor-pointer"
                />
                <span>자동 요약 📝</span>
              </label>
              <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300 cursor-pointer select-none" title="주제 키워드를 5~10개 추출합니다.">
                <input
                  type="checkbox"
                  checked={optKeywords}
                  onChange={(e) => setOptKeywords(e.target.checked)}
                  className="accent-[#3182F6] h-4 w-4 cursor-pointer"
                />
                <span>키워드 추출 🔑</span>
              </label>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500">
            ⚠️ 화자 분리 / 요약 / 키워드는 Gemini API 키가 별도로 필요합니다 (설정).
          </div>
        </div>

        {/* 파일 목록 */}
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 border border-[#F2F4F6] dark:border-slate-800 rounded-xl px-4 py-3 flex items-center justify-between text-xs gap-3">
                <span className="text-lg">📄</span>
                <span className="flex-1 font-semibold text-slate-800 dark:text-slate-200 truncate" title={file.name}>{file.name}</span>
                
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    {file.status === "pending" && <span className="bg-blue-50 dark:bg-blue-950/30 text-blue-600 px-2 py-0.5 rounded font-bold">대기</span>}
                    {file.status === "processing" && <span className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-600 px-2 py-0.5 rounded font-bold animate-pulse">변환 중</span>}
                    {file.status === "done" && <span className="bg-green-50 dark:bg-green-950/30 text-green-600 px-2 py-0.5 rounded font-bold">완료</span>}
                    {file.status === "error" && <span className="bg-red-50 dark:bg-red-950/30 text-red-600 px-2 py-0.5 rounded font-bold">오류</span>}
                  </div>
                  {file.status === "processing" && file.errorMsg && (
                    <span className="text-[10px] text-yellow-600 dark:text-yellow-400 font-medium whitespace-nowrap">{file.errorMsg}</span>
                  )}
                  {file.status === "error" && file.errorMsg && (
                    <span className="text-[10px] text-red-500 font-medium max-w-[200px] truncate" title={file.errorMsg}>{file.errorMsg}</span>
                  )}
                </div>

                <button
                  onClick={() => removeFile(idx)}
                  className="text-slate-400 hover:text-red-500 font-bold text-base cursor-pointer"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 변환 시작 버튼 */}
        <button
          onClick={handleConvert}
          disabled={isProcessing || (files.length === 0 && !ytSource)}
          className="w-full py-3.5 bg-[#3182F6] hover:bg-[#1b64da] disabled:bg-slate-200 dark:disabled:bg-slate-800/80 text-white disabled:text-slate-400 text-sm font-bold rounded-xl shadow-sm transition-all cursor-pointer"
        >
          {isProcessing ? "오디오 변환 처리 중..." : "변환 시작 🚀"}
        </button>

        {/* 실시간 마이크 녹음 대시보드 (토글형 확장 구조) */}
        {showDictationPanel && (
          <div className="bg-white dark:bg-slate-900 border border-[#F2F4F6] dark:border-slate-800 rounded-2xl p-5 flex flex-col gap-3 shadow-sm animate-fadeIn">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#191F28] dark:text-white">🎙️ STT 실시간 마이크 받아쓰기</h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">단축키:</span>
                <button
                  onClick={handleListenHotkey}
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-bold text-[#3182F6] hover:bg-slate-200 cursor-pointer"
                >
                  {hotkey}
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              단축키를 누르면 녹음이 시작되고, 다시 누르면 마이크 녹음본이 즉시 텍스트로 자동 받아쓰기 됩니다.
            </p>

            <div className="relative">
              <textarea
                value={dictationText}
                onChange={(e) => setDictationText(e.target.value)}
                placeholder="단축키를 한 번 누른 뒤 편하게 말씀하시고, 완료되면 다시 단축키를 눌러보세요. 변환 결과가 여기에 자동으로 입력됩니다..."
                className="w-full h-32 p-3 text-xs bg-[#F9FAFB] dark:bg-slate-800/40 border border-[#F2F4F6] dark:border-slate-800 rounded-xl focus:outline-none focus:border-[#3182F6] text-[#191F28] dark:text-white leading-relaxed resize-y"
              ></textarea>
              {isRecording && (
                <span className="absolute top-3 right-3 text-[10px] font-bold text-red-500 animate-pulse flex items-center gap-1 bg-red-100/80 px-2 py-0.5 rounded">
                  🔴 녹음 중...
                </span>
              )}
              {isTranscribingMic && (
                <span className="absolute top-3 right-3 text-[10px] font-bold text-yellow-600 animate-pulse flex items-center gap-1 bg-yellow-100/80 px-2 py-0.5 rounded">
                  ⏳ 텍스트로 변환하는 중...
                </span>
              )}
            </div>

            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setDictationText("")}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-400 rounded-lg cursor-pointer font-bold"
              >
                🧹 지우기
              </button>
              <button
                onClick={() => handleCopyText(dictationText)}
                className="px-3 py-1.5 bg-[#3182F6] text-white hover:bg-[#1b64da] rounded-lg cursor-pointer font-bold"
              >
                📋 결과 복사
              </button>
            </div>
          </div>
        )}

        {/* AI 분석 결과 패널 */}
        {(aiProgress || aiResult.keywords || aiResult.summary || aiResult.diarize) && (
          <div className="bg-white dark:bg-slate-900 border border-[#F2F4F6] dark:border-slate-800 rounded-2xl p-5 space-y-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <span>🤖 AI 분석</span>
              {aiProgress && <span className="text-xs text-yellow-600 animate-pulse">{aiProgress}</span>}
            </h3>

            {/* 키워드 블록 */}
            {aiResult.keywords && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-500">🔑 키워드</div>
                <div className="flex flex-wrap gap-1.5">
                  {aiResult.keywords.map((kw, i) => (
                    <span key={i} className="px-2 py-1 bg-blue-50 dark:bg-blue-950/20 text-[#3182F6] text-xs font-bold rounded-lg border border-blue-100 dark:border-blue-900/30">
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 요약 블록 */}
            {aiResult.summary && (
              <div className="space-y-2 border-t border-[#F2F4F6] dark:border-slate-800/80 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500">📝 요약 (.md)</span>
                  <button
                    onClick={() => handleDownloadFile("summary.md", aiResult.summary || "")}
                    className="text-[10px] font-bold text-[#3182F6] hover:underline"
                  >
                    💾 다운로드
                  </button>
                </div>
                <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 bg-[#F9FAFB] dark:bg-slate-800/40 p-3.5 rounded-xl whitespace-pre-wrap">
                  {aiResult.summary}
                </div>
              </div>
            )}

            {/* 화자 분리 블록 */}
            {aiResult.diarize && (
              <div className="space-y-2 border-t border-[#F2F4F6] dark:border-slate-800/80 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500">👥 화자 분리</span>
                  <button
                    onClick={() => handleDownloadFile("diarize.txt", aiResult.diarize || "")}
                    className="text-[10px] font-bold text-[#3182F6] hover:underline"
                  >
                    💾 다운로드
                  </button>
                </div>
                <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 bg-[#F9FAFB] dark:bg-slate-800/40 p-3.5 rounded-xl whitespace-pre-wrap max-h-56 overflow-y-auto">
                  {aiResult.diarize}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 결과 텍스트 패널 */}
        {transResult && (
          <div className="bg-white dark:bg-slate-900 border border-[#F2F4F6] dark:border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
            <div className="flex justify-between items-center border-b border-[#F2F4F6] dark:border-slate-800/80 pb-3">
              <h3 className="text-sm font-bold text-[#191F28] dark:text-white">받아쓰기</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopyText(transResult.text)}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[10px] font-bold rounded cursor-pointer text-slate-700 dark:text-slate-300"
                >
                  📋 복사
                </button>
                <button
                  onClick={() => handleDownloadFile("transcript.txt", transResult.text)}
                  className="px-2.5 py-1 bg-[#3182F6] text-white hover:bg-[#1b64da] text-[10px] font-bold rounded cursor-pointer"
                >
                  💾 .txt 저장
                </button>
                {transResult.hasTimestamps && transResult.segments && (
                  <button
                    onClick={() => handleDownloadFile("subtitle.srt", convertToSrt(transResult.segments))}
                    className="px-2.5 py-1 bg-[#2ebd59] text-white hover:bg-green-600 text-[10px] font-bold rounded cursor-pointer"
                  >
                    🎬 .srt 저장
                  </button>
                )}
              </div>
            </div>

            <div className="bg-[#F9FAFB] dark:bg-slate-800/40 p-4 rounded-xl border border-dashed border-[#E5E8EB] dark:border-slate-800 max-h-96 overflow-y-auto space-y-3">
              {transResult.hasTimestamps && transResult.segments && transResult.segments.length > 0 ? (
                transResult.segments.map((seg: Segment, idx: number) => (
                  <div key={idx} className="flex gap-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    <span className="font-mono text-[#3182F6] font-bold">[{formatTs(seg.start)}]</span>
                    <span>{seg.text}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{transResult.text}</p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 유튜브 가져오기 모달 */}
      {showYtModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-[#F2F4F6] dark:border-slate-850 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-extrabold text-[#191F28] dark:text-white">🎬 유튜브 자막 가져오기</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              분석할 유튜브 동영상의 전체 주소(URL)를 입력해주세요. 자막 리소스를 가져옵니다.
            </p>
            <input
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              value={ytUrl}
              onChange={(e) => setYtUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-[#3182F6] text-slate-800 dark:text-slate-200"
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowYtModal(false)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg cursor-pointer font-bold"
              >
                취소
              </button>
              <button
                onClick={handleFetchYoutube}
                className="px-3 py-1.5 bg-[#3182F6] hover:bg-[#1b64da] text-white rounded-lg cursor-pointer font-bold"
              >
                자막 가져오기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API 설정 모달 */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-[#F2F4F6] dark:border-slate-850 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-extrabold text-[#191F28] dark:text-white">🔑 API 키 설정</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              두 가지 키가 필요합니다. 빈 칸으로 두면 그 기능만 비활성화됩니다. 입력하신 API 키는 브라우저 내부 로컬스토리지에 안전하게 보관됩니다.
            </p>
            
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">OpenAI API Key (받아쓰기용)</label>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-[#3182F6] text-slate-800 dark:text-slate-200"
                />
              </div>
              
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Gemini API Key (화자 분리 / 요약 / 키워드용)</label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-[#3182F6] text-slate-800 dark:text-slate-200"
                />
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  Gemini 키 발급: <a href="https://aistudio.google.com/apikey" target="_blank" className="text-[#3182F6] underline">aistudio.google.com/apikey</a>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs pt-2">
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg cursor-pointer font-bold"
              >
                취소
              </button>
              <button
                onClick={handleSaveApiKeys}
                className="px-3 py-1.5 bg-[#3182F6] hover:bg-[#1b64da] text-white rounded-lg cursor-pointer font-bold"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 알림 팝업 */}
      <div
        className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 text-xs font-bold rounded-full shadow-lg z-[9999] transition-all duration-300 ${
          showToast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        {toastMsg}
      </div>

      {/* 푸터 영역 */}
      <footer className="hidden md:block bg-white dark:bg-[#0B0F19] border-t border-[#F2F4F6] dark:border-slate-800/80 py-6 px-6 text-center text-xs text-[#8B95A1] transition-colors">
        <div className="max-w-5xl mx-auto space-y-1">
          <p>© 2026 리얼인포 STT 스튜디오. 회의록 작성 및 미디어 자막 추출을 빠르고 간편하게 처리해 보세요.</p>
        </div>
      </footer>
    </div>
  );
}
