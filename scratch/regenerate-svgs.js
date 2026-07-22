import fs from 'fs';
import path from 'path';
import { buildSvgTemplate } from '../scripts/image-generator.js';

const postsDir = path.resolve('src/content/posts');
const publicImagesDir = path.resolve('public/images');

const files = fs.readdirSync(postsDir)
  .filter(f => f.startsWith('2026-07-21'))
  .slice(-10);

console.log(`[대문 카드 3단 빅 폰트 재발행] 오늘(${files.length}개) 포스트의 대문 이미지를 안 잘리는 빅 폰트로 완벽 갱신합니다...`);

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

  // 9자 이내의 큼직하고 안 잘리는 3단 요약 키워드
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
  } else if (file.includes('kakaobank')) {
    points = [
      { title: '파업권 확보', desc1: '노조 피켓 시위', desc2: '배경 및 이슈' },
      { title: '내 돈 안전할까', desc1: '예금자보호법', desc2: '5천만원 보장' },
      { title: '사용자 대처법', desc1: '비상 계좌 준비', desc2: '금융 서비스 체크' }
    ];
  } else if (file.includes('roaming')) {
    points = [
      { title: 'KT 알뜰로밍', desc1: '동남아 전용 요금', desc2: '가성비 로밍 출시' },
      { title: '특별 할인 혜택', desc1: '그랩 10만원 쿠폰', desc2: '여행 경비 절감' },
      { title: '여행 준비 팁', desc1: '유심 이심 비교', desc2: '스마트 로밍 신청' }
    ];
  } else if (file.includes('yuri')) {
    points = [
      { title: '품절 대란 이슈', desc1: '나혼산 유리 선글', desc2: '겨우 2천원 대란' },
      { title: '갓성비 패션', desc1: '명품 같은 디자인', desc2: '초저가 유행 아이템' },
      { title: '스타일링 팁', desc1: '가성비 패션 팁', desc2: '알뜰 쇼핑 정보' }
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

console.log('[대문 카드 3단 빅 폰트 재발행 성공!] 100% 잘림 없고 큼직한 폰트로 교체되었습니다.');
