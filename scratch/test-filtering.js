// 필터링 차단 키워드 검증 테스트 스크립트
import fs from 'fs';
import path from 'path';

const testItems = [
  { name: '경기도 산후조리비 지원금 50만 원 신청', title: '산후조리 혜택', summary: '지역화폐 사용 가능' },
  { name: '공영도매시장 시설현대화 지원금 대상', title: '현대화 시설', summary: '유통 시설 낙후 해결' },
  { name: '귀농귀촌 교육비 지원 혜택 및 신청 방법', title: '귀농 교육', summary: '귀농 준비생 대상' },
  { name: '경기도 청년기본소득 연간 100만원', title: '청년수당', summary: '만 24세 청년 대상' },
  { name: '충청북도교육청 학생 현장체험학습비 지원', title: '수학여행비 지원', summary: '학부모 수학여행비 부담 경감' },
  { name: '전국 로또 1등 당첨 번호 안내', title: '로또 1230회', summary: '이번주 당첨 번호 결과' }, // 통과되어야 하는 정상 글
  { name: '김연아 반려견 산책 사진 화제', title: '연예인 이슈', summary: '소셜 미디어 소식' } // 통과되어야 하는 정상 글
];

const scriptPath = path.resolve('scripts/generate-blog-post.js');
let scriptContent = fs.readFileSync(scriptPath, 'utf-8');

// BLOCK_KEYWORDS를 정밀하게 추출해서 로컬 배열로 바인딩
const startIdx = scriptContent.indexOf('const BLOCK_KEYWORDS = [');
const endIdx = scriptContent.indexOf('];', startIdx);
const arrayContentStr = scriptContent.substring(startIdx + 24, endIdx).trim();

// 문자열을 배열로 파싱
const BLOCK_KEYWORDS = arrayContentStr
  .split(',')
  .map(s => s.trim().replace(/['"\s]/g, ''))
  .filter(Boolean);

function localIsBlocked(item) {
  const text = (
    (item.name || '') + ' ' + 
    (item.title || '') + ' ' + 
    (item.summary || '') + ' ' + 
    (item.target || '') + ' ' + 
    (item.agency || '') + ' ' + 
    (item.location || '') + ' ' + 
    (item.소관기관명 || '')
  ).toLowerCase();
  
  if (BLOCK_KEYWORDS.some(kw => text.includes(kw))) {
    return true;
  }
  return false;
}

console.log('=== [필터링 차단 테스트 검증 시작] ===');
testItems.forEach((item, idx) => {
  const blocked = localIsBlocked(item);
  console.log(`[테스트 ${idx + 1}] 제목: "${item.name}"`);
  console.log(`  => 결과: ${blocked ? '❌ 차단됨 (성공)' : '✅ 통과됨 (정상)'}`);
  
  // 차단 여부가 올바른지 검증
  if (idx < 5 && !blocked) {
    console.error('  !! 에러: 차단되어야 하는 비인기글이 통과되었습니다!');
    process.exit(1);
  }
  if (idx >= 5 && blocked) {
    console.error('  !! 에러: 통과되어야 하는 인기글이 차단되었습니다!');
    process.exit(1);
  }
});
console.log('=== [테스트 통과! 필터링이 의도한 대로 정확히 작동합니다.] ===');
