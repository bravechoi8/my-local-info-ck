import fs from 'fs';
import path from 'path';

const localInfoPath = path.resolve('public/data/local-info.json');

if (!fs.existsSync(localInfoPath)) {
  console.log('[에러] local-info.json 파일이 존재하지 않습니다.');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(localInfoPath, 'utf-8'));
console.log(`[정제 전] 총 데이터 개수: ${data.length}개`);

const FORBIDDEN_WORDS = [
  '장애', '산재', '장해', '요양', '한부모', '금연', '약값', '보훈', '유공자',
  '어선', '어업', '농업', '귀농', '임업', '수산', '보일러', '연탄',
  '승강기', '엘리베이터', '환경오염', '폐기물', '인권', '군 생활', '군인',
  '직업훈련', '기술자', '출산', '임신', '육아휴직', '취약계층', '소외', '저소득'
];

const sanitizedData = data.filter(item => {
  const text = (
    (item.name || '') + ' ' +
    (item.summary || '') + ' ' +
    (item.target || '')
  ).toLowerCase();

  const isForbidden = FORBIDDEN_WORDS.some(word => text.includes(word));
  if (isForbidden) {
    console.log(`[필터링 소거 완료] 혜택명: ${item.name}`);
  }
  return !isForbidden;
});

fs.writeFileSync(localInfoPath, JSON.stringify(sanitizedData, null, 2), 'utf-8');
console.log(`[정제 완료] 정제 후 데이터 개수: ${sanitizedData.length}개 (원치 않는 비인기 정부 혜택 전면 소거 성공!)`);
