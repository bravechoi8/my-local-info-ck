/**
 * API 호출 시 실패(네트워크 오류, 429 할당량 초과, 5xx 서버 오류 등)할 경우
 * 지수 백업(Exponential Backoff) 방식으로 재시도하는 헬퍼 함수입니다.
 */
export async function fetchWithRetry(url, options = {}, maxRetries = 3, initialDelay = 2000, timeoutMs = 15000) {
  let retries = 0;
  while (true) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const fetchOptions = { ...options, signal: controller.signal };
    
    try {
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);
      
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
      clearTimeout(timeoutId);
      const isTimeout = err.name === 'AbortError';
      const errMsg = isTimeout ? '요청 시간 초과(Timeout)' : err.message;
      
      if (retries < maxRetries) {
        retries++;
        const delay = initialDelay * Math.pow(2, retries - 1);
        console.warn(`[네트워크 오류] ${errMsg}. ${delay}ms 후 재시도합니다... (시도 ${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw new Error(errMsg);
    }
  }
}
