import fs from 'fs';
import path from 'path';
import { buildSvgTemplate } from '../scripts/image-generator.js';

const postsDir = path.resolve('src/content/posts');
const publicImagesDir = path.resolve('public/images');

// 7월 21일과 22일 포스트 대상
const files = fs.readdirSync(postsDir)
  .filter(f => f.startsWith('2026-07-21') || f.startsWith('2026-07-22'));

console.log(`[대문 카드 일괄 재발행] 7월 21일~22일 (${files.length}개) 포스트의 대문 이미지를 최신 에러 패치된 빅 폰트로 재생성합니다...`);

for (const file of files) {
  const filePath = path.join(postsDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');

  const titleMatch = content.match(/title:\s*"?([^"\r\n]+)"?/);
  const summaryMatch = content.match(/summary:\s*"?([^"\r\n]+)"?/);

  if (!titleMatch) continue;

  const title = titleMatch[1];
  const summary = summaryMatch ? summaryMatch[1] : '';

  let bgImgPath = `/images/card-bg-${file.replace('.md', '')}.jpg`;
  if (!fs.existsSync(path.join(publicImagesDir, `card-bg-${file.replace('.md', '')}.jpg`))) {
    bgImgPath = '/images/card-bg-2026-07-21-holiday-hospital-pharmacy.jpg';
  }

  // 예쁜 인포그래픽 3단 포인트 생성
  let points = [];
  if (file.includes('hospital') || file.includes('pharmacy')) {
    points = [
      { title: '병원·약국 조회', desc1: '연휴 문 여는 곳', desc2: '간편 실시간 검색' },
      { title: '응급 대처 요령', desc1: '증상별 대처 숙지', desc2: '위급할 땐 119' },
      { title: '유용한 비상 안내', desc1: '응급포털 이용', desc2: '120 콜센터 활용' }
    ];
  } else if (file.includes('vet-clinic')) {
    points = [
      { title: '24시 동물병원', desc1: '야간·공휴일 진료', desc2: '인근 수의사 상주' },
      { title: '응급 처치 수칙', desc1: '이물질 섭취 대응', desc2: '체온 유지 이동' },
      { title: '방문 체크리스트', desc1: '전화 사전 확인', desc2: '야간 진료비 안내' }
    ];
  } else if (file.includes('usd-krw') || file.includes('exchange')) {
    points = [
      { title: '환율 트렌드', desc1: '1500원 하락 배경', desc2: '외국인 매도 완화' },
      { title: '환전 타이밍', desc1: '분할 환전 전략', desc2: '목표 환율 설정' },
      { title: '자산 관리 팁', desc1: '외화예금 활용', desc2: '환차익 재테크' }
    ];
  } else if (file.includes('wedding')) {
    points = [
      { title: '가격비교 포털', desc1: '전국 예식장 정보', desc2: '스드메 비용 공개' },
      { title: '스마트 비용 절감', desc1: '결혼 거품 제거', desc2: '알뜰 패키지 선택' },
      { title: '소비자원 포털', desc1: '참가격 사이트', desc2: '스마트 예산 관리' }
    ];
  } else if (file.includes('ko-so-young') || file.includes('yuri')) {
    points = [
      { title: '대란 이슈 정보', desc1: '실시간 핫이슈 정보', desc2: '인기 관심사 집중분석' },
      { title: '갓성비 스타일', desc1: '주목할 만한 트렌드', desc2: '화제의 비하인드' },
      { title: '놓치면 아쉬운 팁', desc1: '가성비 꿀팁 대방출', desc2: '추천 정보 총정리' }
    ];
  } else if (file.includes('mrbeast')) {
    points = [
      { title: '세계1위 유튜버', desc1: '미스터비스트 이슈', desc2: '바람 피우면 73억' },
      { title: '독특한 계약 조건', desc1: '혼전 계약서 작성', desc2: '화제의 부부 스토리' },
      { title: '비하인드 분석', desc1: '글로벌 핫이슈 정리', desc2: '흥미진진한 뒷이야기' }
    ];
  } else if (file.includes('kim-bujang') || file.includes('netflix')) {
    points = [
      { title: '넷플릭스 1위', desc1: '김부장 신드롬 돌풍', desc2: '비영어권 3주 연속' },
      { title: '인기 K콘텐츠', desc1: '동궁 아파트 후속작', desc2: '흥행 몰이 비결분석' },
      { title: '정주행 꿀팁 안내', desc1: '놓치면 아쉬운 추천', desc2: '넷플릭스 강력 추천' }
    ];
  } else if (file.includes('shinsegae')) {
    points = [
      { title: '쇼핑지원금 혜택', desc1: '신세계 면세점 할인', desc2: '스마트한 쇼핑 찬스' },
      { title: '알뜰한 쇼핑 가이드', desc1: '쿠폰 및 적립 혜택', desc2: '인기 면세 아이템' },
      { title: '이용 팁 총정리', desc1: '놓치면 아쉬운 꿀팁', desc2: '출국 전 필수 코스' }
    ];
  } else {
    points = [
      { title: '핵심 혜택 안내', desc1: '주요 정보 한눈에', desc2: '상세 가이드' },
      { title: '알뜰 이용 팁', desc1: '놓치면 손해보는', desc2: '실시간 꿀팁' },
      { title: '스마트 활용법', desc1: '쉽고 빠른 이용', desc2: '핵심 정리' }
    ];
  }

  const svgContent = buildSvgTemplate(title, summary, bgImgPath, points);
  const svgFilename = `card-${file.replace('.md', '')}.svg`;
  const svgOutputPath = path.join(publicImagesDir, svgFilename);

  fs.writeFileSync(svgOutputPath, svgContent, 'utf-8');
  console.log(`[빅 폰트 재생성 완료] ${svgFilename}`);
}

console.log('[7월 21~22일 대문 카드 전원 빅 폰트 재발행 성공!]');
