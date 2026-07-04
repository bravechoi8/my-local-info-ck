import { fetchWithRetry } from './utils.js';

/**
 * Pexels API를 통해 검색어에 맞는 이미지 한 장의 URL을 가져옵니다.
 * 
 * @param {string} query 검색어 (예: 'sky', 'coffee')
 * @returns {Promise<string|null>} 이미지 URL (성공 시) 또는 null (실패 시)
 */
export async function getPexelsImage(query) {
  // .env.local 파일에 설정해둔 API 키를 안전하게 가져옵니다.
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey || apiKey.includes('여기에_발급받은_펙셀_API_키를_입력하세요')) {
    console.error("[Pexels API] API 키가 설정되지 않았거나 기본값입니다. .env.local 파일에서 PEXELS_API_KEY 값을 실제 발급받은 키로 변경해주세요.");
    return null;
  }

  // Pexels 이미지 검색 API 주소 (검색어로 1개만 요청)
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`;

  try {
    // utils.js에 미리 정의되어 있는 재시도(fetchWithRetry) 기능으로 안전하게 API를 호출합니다.
    const response = await fetchWithRetry(url, {
      headers: {
        Authorization: apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Pexels API 호출 실패: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // API 응답 결과에서 첫 번째 이미지 주소(중간 크기 혹은 큰 크기)를 추출합니다.
    if (data.photos && data.photos.length > 0) {
      // data.photos[0].src.large (큰 크기)
      // data.photos[0].src.medium (중간 크기)
      // 필요에 따라 크기를 선택할 수 있습니다.
      return data.photos[0].src.large; 
    }
    
    console.warn(`[Pexels API] '${query}' 검색 결과에 해당하는 이미지가 없습니다.`);
    return null;
  } catch (error) {
    console.error(`[Pexels API] 이미지 가져오기 오류:`, error);
    return null;
  }
}

/**
 * Pexels API를 통해 검색어에 맞는 이미지 여러 장의 URL 목록을 가져옵니다.
 * 
 * @param {string} query 검색어
 * @param {number} limit 가져올 이미지 개수 (기본값 5)
 * @returns {Promise<string[]>} 이미지 URL 배열 (실패 시 빈 배열)
 */
export async function getPexelsImages(query, limit = 5) {
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey || apiKey.includes('여기에_발급받은_펙셀_API_키를_입력하세요')) {
    console.error("[Pexels API] API 키가 설정되지 않았습니다.");
    return [];
  }

  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${limit}`;

  try {
    const response = await fetchWithRetry(url, {
      headers: {
        Authorization: apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Pexels API 호출 실패: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.photos && data.photos.length > 0) {
      return data.photos.map(photo => photo.src.large);
    }
    
    console.warn(`[Pexels API] '${query}' 검색 결과에 해당하는 이미지가 없습니다.`);
    return [];
  } catch (error) {
    console.error(`[Pexels API] 이미지 목록 가져오기 오류:`, error);
    return [];
  }
}

