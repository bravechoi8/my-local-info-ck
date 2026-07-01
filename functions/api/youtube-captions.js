function extractYoutubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

function decodeHtmlEntities(s) {
  if (!s) return "";
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)));
}

// 유튜브 페이지에서 자막 XML URL 목록 추출
async function getCaptionsTracks(videoId) {
  // 모바일 유튜브 주소를 활용해 429 차단을 줄입니다.
  const pageUrl = `https://m.youtube.com/watch?v=${videoId}`;
  const res = await fetch(pageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36",
      "Accept-Language": "ko,en-US;q=0.9,en;q=0.8",
      "Referer": "https://m.youtube.com/",
      "Sec-Fetch-Mode": "navigate"
    }
  });

  if (!res.ok) {
    // 1차 모바일 실패 시 데스크탑 URL로 한 번 더 폴백 시도
    const fallbackUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const fallbackRes = await fetch(fallbackUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ko,en-US;q=0.9,en;q=0.8",
        "Referer": "https://www.google.com/"
      }
    });

    if (!fallbackRes.ok) {
      throw new Error(`유튜브 페이지 로드 실패 (HTTP ${fallbackRes.status})`);
    }
    
    return parseHtmlCaptions(await fallbackRes.text());
  }

  return parseHtmlCaptions(await res.text());
}

function parseHtmlCaptions(html) {
  // ytInitialPlayerResponse 가 포함된 JSON 데이터를 찾습니다. (모바일/데스크톱 대응)
  let regex = /ytInitialPlayerResponse\s*=\s*({.+?});/;
  let match = html.match(regex);
  
  if (!match) {
    // 모바일 등에서 세미콜론이 없는 경우 대응
    regex = /ytInitialPlayerResponse\s*=\s*({.+?})\s*</;
    match = html.match(regex);
  }
  
  if (!match) {
    // 세 번째 시도: JSON 원본 변수 매칭
    regex = /var\s+ytInitialPlayerResponse\s*=\s*({.+?});/;
    match = html.match(regex);
  }

  if (!match) {
    throw new Error("유튜브 플레이어 응답 데이터를 찾을 수 없습니다. (연령 제한 등이 걸린 영상일 수 있습니다)");
  }

  const playerResponse = JSON.parse(match[1]);
  const captions = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  
  if (!captions || captions.length === 0) {
    throw new Error("이 영상에는 자막이 비활성화되어 있거나 자막 트랙이 존재하지 않습니다.");
  }

  return captions;
}

// 자막 XML(TimedText)을 파싱하여 세그먼트 배열로 반환 (srv3 및 클래식 포맷 지원)
async function fetchAndParseXml(xmlUrl) {
  const res = await fetch(xmlUrl);
  if (!res.ok) {
    throw new Error("자막 데이터 다운로드 실패");
  }
  const xmlText = await res.text();
  const segments = [];
  let match;

  // 1. srv3 포맷 시도: <p t="ms" d="ms">
  const pRegex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/gi;
  while ((match = pRegex.exec(xmlText)) !== null) {
    const startMs = parseInt(match[1], 10);
    const durMs = parseInt(match[2], 10);
    const inner = match[3];
    
    let text = "";
    const sRegex = /<s[^>]*>([^<]*)<\/s>/gi;
    let sMatch;
    while ((sMatch = sRegex.exec(inner)) !== null) {
      text += sMatch[1];
    }
    if (!text) {
      text = inner.replace(/<[^>]+>/g, ""); // HTML 태그 제거
    }
    text = decodeHtmlEntities(text).trim();
    if (text) {
      segments.push({
        start: startMs / 1000,
        end: (startMs + durMs) / 1000,
        text
      });
    }
  }

  if (segments.length > 0) return segments;

  // 2. 클래식 포맷 시도: <text start="s" dur="s">
  const classicRegex = /<text\s+start="([\d.]+)"\s+dur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/gi;
  while ((match = classicRegex.exec(xmlText)) !== null) {
    const start = parseFloat(match[1]);
    const duration = parseFloat(match[2]);
    const rawText = match[3];
    const text = decodeHtmlEntities(rawText)
      .replace(/<[^>]*>/g, "") // HTML 태그 제거
      .replace(/\s+/g, " ")
      .trim();

    if (text) {
      segments.push({
        start,
        end: start + duration,
        text
      });
    }
  }

  return segments;
}

export async function onRequestGet(context) {
  try {
    const { searchParams } = new URL(context.request.url);
    const url = searchParams.get("url");

    if (!url) {
      return new Response(JSON.stringify({ error: "유튜브 주소(URL)가 누락되었습니다." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const videoId = extractYoutubeId(url);
    if (!videoId) {
      return new Response(JSON.stringify({ error: "유효한 유튜브 주소가 아닙니다." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 1. 자막 트랙 정보 가져오기
    let tracks;
    try {
      tracks = await getCaptionsTracks(videoId);
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. 한국어(ko), 영어(en), 그 외 순으로 적절한 트랙 매칭
    let selectedTrack = tracks.find(t => t.languageCode === "ko") ||
                        tracks.find(t => t.languageCode === "en") ||
                        tracks[0];

    if (!selectedTrack) {
      return new Response(JSON.stringify({ error: "사용 가능한 자막 트랙이 없습니다." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 3. 자막 데이터 가져오기 및 파싱 (URL 디코딩 및 프로토콜 보정, 포맷 강제)
    let xmlUrl = selectedTrack.baseUrl;
    xmlUrl = decodeHtmlEntities(xmlUrl);
    if (xmlUrl.startsWith("//")) {
      xmlUrl = "https:" + xmlUrl;
    } else if (!xmlUrl.startsWith("http")) {
      xmlUrl = "https://www.youtube.com" + xmlUrl;
    }
    if (!xmlUrl.includes("fmt=")) {
      xmlUrl = xmlUrl + "&fmt=srv1";
    }
    const segments = await fetchAndParseXml(xmlUrl);
    const duration = segments.length > 0 ? segments[segments.length - 1].end : 0;

    return new Response(
      JSON.stringify({
        segments,
        lang: selectedTrack.languageCode,
        title: `유튜브 영상 (${videoId})`,
        duration
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("유튜브 자막 로드 오류:", error);
    return new Response(JSON.stringify({ error: error.message || "서버 오류가 발생했습니다." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
