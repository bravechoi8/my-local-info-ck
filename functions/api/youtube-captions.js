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

const INNERTUBE_API_URL = "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";
const INNERTUBE_CLIENT_VERSION = "20.10.38";
const INNERTUBE_CONTEXT = {
  client: {
    clientName: "ANDROID",
    clientVersion: INNERTUBE_CLIENT_VERSION,
  },
};
const INNERTUBE_USER_AGENT = `com.google.android.youtube/${INNERTUBE_CLIENT_VERSION} (Linux; U; Android 14)`;

// 유튜브 페이지에서 자막 XML URL 목록 추출
async function getCaptionsTracks(videoId) {
  const proxies = [
    "", // 1. 직격
    "https://api.codetabs.com/v1/proxy?quest=", // 2. codetabs proxy
    "https://thingproxy.freeboard.io/fetch/", // 3. thingproxy
    "https://corsproxy.io/?" // 4. corsproxy
  ];

  // 1. InnerTube API 최우선 시도 (유튜브 공식 앱 프로토콜 + 서버측 멀티 프록시 우회)
  for (const proxy of proxies) {
    try {
      const targetUrl = proxy ? `${proxy}${encodeURIComponent(INNERTUBE_API_URL)}` : INNERTUBE_API_URL;
      const resp = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": INNERTUBE_USER_AGENT,
        },
        body: JSON.stringify({
          context: INNERTUBE_CONTEXT,
          videoId: videoId,
        }),
      });
      
      if (resp.ok) {
        const data = await resp.json();
        // codetabs 등의 proxy 경유 시 data 가 문자열로 오는 경우 대응
        const parsed = typeof data === "string" ? JSON.parse(data) : data;
        const captionTracks = parsed?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (Array.isArray(captionTracks) && captionTracks.length > 0) {
          console.log(`InnerTube API 성공 (프록시: ${proxy || "직격"})`);
          return captionTracks;
        }
      }
    } catch (e) {
      console.warn(`InnerTube API 프록시(${proxy}) 실패:`, e);
    }
  }

  // 2. HTML 스크래핑 폴백 (InnerTube가 모두 실패한 경우)
  const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const res = await fetch(pageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });

  if (!res.ok) {
    throw new Error(`유튜브 페이지 로드 실패 (HTTP ${res.status})`);
  }
  
  return parseHtmlCaptions(await res.text());
}

function parseInlineJson(html, globalName) {
  const startToken = `${globalName} = `;
  let startIndex = html.indexOf(startToken);
  if (startIndex === -1) {
    const varStartToken = `var ${globalName} = `;
    startIndex = html.indexOf(varStartToken);
    if (startIndex === -1) return null;
    startIndex += varStartToken.length - startToken.length;
  }
  
  const jsonStart = startIndex + startToken.length;
  let depth = 0;
  for (let i = jsonStart; i < html.length; i++) {
    if (html[i] === "{") {
      depth++;
    } else if (html[i] === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(jsonStart, i + 1));
        } catch (e) {
          return null;
        }
      }
    }
  }
  return null;
}

function parseHtmlCaptions(html) {
  const playerResponse = parseInlineJson(html, "ytInitialPlayerResponse");
  if (!playerResponse) {
    throw new Error("유튜브 플레이어 응답 데이터를 찾을 수 없습니다. (연령 제한 등이 걸린 영상일 수 있습니다)");
  }

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
