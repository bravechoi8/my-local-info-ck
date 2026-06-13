import { fetchWithRetry } from './utils.js';

/**
 * 픽사베이(Pixabay) API를 사용하여 검색어에 맞는 이미지 한 장의 인터넷 주소(URL)를 가져옵니다.
 * 
 * @param {string} query 검색어 (예: 'saving money', 'elderly care')
 * @returns {Promise<string|null>} 이미지 주소 (성공 시) 또는 null (실패 시)
 */
export async function getPixabayImage(query, index = 0) {
  // .env.local 파일에 적어둔 픽사베이 API 키를 가져옵니다.
  const apiKey = process.env.PIXABAY_API_KEY;

  // API 키가 없거나 기본 플레이스홀더 텍스트 그대로일 때 경고를 띄웁니다.
  if (!apiKey || apiKey.includes('여기에_발급받은_픽사베이_API_키를_입력하세요')) {
    console.warn("[Pixabay API] API 키가 설정되지 않았습니다. .env.local 파일에서 PIXABAY_API_KEY 값을 설정해주세요. 이미지는 AI가 그리는 모드(Fallback)로 대체 작동합니다.");
    return null;
  }

  // 픽사베이 검색 API 호출 주소
  // q: 검색어
  // image_type: 사진(photo) 형태만 가져옴
  // per_page: 검색결과 중 가장 연관성 높은 3개만 가져옴
  const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&image_type=photo&per_page=5`;

  try {
    // utils.js의 재시도 기능(fetchWithRetry)을 이용해 안정적으로 호출합니다.
    const response = await fetchWithRetry(url);

    if (!response.ok) {
      throw new Error(`Pixabay API 호출 실패: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // 검색된 이미지 목록(hits)이 있고, 지정된 index 번호의 이미지가 존재한다면
    if (data.hits && data.hits.length > index) {
      // 대형 이미지 주소(largeImageURL)를 반환합니다.
      return data.hits[index].largeImageURL || data.hits[index].webformatURL;
    }
    
    console.warn(`[Pixabay API] '${query}' 검색 결과에 해당하는 ${index + 1}번째 이미지가 없습니다.`);
    return null;
  } catch (error) {
    console.error(`[Pixabay API] 이미지 검색 중 오류 발생:`, error);
    return null;
  }
}
