/**
 * API 호출 시 실패(네트워크 오류, 429 할당량 초과, 5xx 서버 오류 등)할 경우
 * 지수 백업(Exponential Backoff) 방식으로 재시도하는 헬퍼 함수입니다.
 */
export async function fetchWithRetry(url, options = {}, maxRetries = 3, initialDelay = 2000) {
  let retries = 0;
  while (true) {
    try {
      const response = await fetch(url, options);
      
      // 429(Too Many Requests) 또는 5xx(서버 오류) 일 때 재시도 진행
      if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
        if (retries < maxRetries) {
          retries++;
          const delay = initialDelay * Math.pow(2, retries - 1);
          console.warn(`[API 오류] 상태 코드 ${response.status}. ${delay}ms 후 재시도합니다... (시도 ${retries}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      return response;
    } catch (err) {
      if (retries < maxRetries) {
        retries++;
        const delay = initialDelay * Math.pow(2, retries - 1);
        console.warn(`[네트워크 오류] ${err.message}. ${delay}ms 후 재시도합니다... (시도 ${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
}
