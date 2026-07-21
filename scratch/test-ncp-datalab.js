import pkg from '@next/env';
const { loadEnvConfig } = pkg;
import filePath from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = filePath.dirname(__filename);
loadEnvConfig(filePath.join(__dirname, '..'));

const ID = process.env.NAVER_CLIENT_ID;
const SECRET = process.env.NAVER_CLIENT_SECRET;

const urlDataLab = 'https://naverapihub.apigw.ntruss.com/search-trend/v1/search';

const today = new Date();
const startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const endDate = today.toISOString().split('T')[0];

const body = {
  startDate,
  endDate,
  timeUnit: 'date',
  keywordGroups: [
    {
      groupName: '지원금',
      keywords: ['지원금']
    }
  ]
};

const res = await fetch(urlDataLab, {
  method: 'POST',
  headers: {
    'X-NCP-APIGW-API-KEY-ID': ID,
    'X-NCP-APIGW-API-KEY': SECRET,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(body)
});

console.log('DataLab Status:', res.status);
const text = await res.text();
console.log('DataLab Body:', text.slice(0, 400));
