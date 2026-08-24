import fs from 'fs';
import path from 'path';

const keys = [
  '2026-08-24-katseye-billboard-first-place',
  '2026-08-24-japan-earthquake',
  '2026-08-24-woo-ji-won-daughter-miss-korea',
  '2026-08-24-seo-in-young-waterbomb'
];

for (const k of keys) {
  const bgPath = path.join('public/images', `card-bg-${k}.jpg`);
  const svgPath = path.join('public/images', `card-${k}.svg`);
  if (fs.existsSync(bgPath) && fs.existsSync(svgPath)) {
    const bgBytes = fs.readFileSync(bgPath);
    const b64 = bgBytes.toString('base64');
    let svg = fs.readFileSync(svgPath, 'utf8');
    
    // Replace data:image uri in SVG
    svg = svg.replace(/data:image\/[^;]+;base64,[^"'\s)]+/g, `data:image/jpeg;base64,${b64}`);
    fs.writeFileSync(svgPath, svg, 'utf8');
    console.log('Updated SVG card for:', k);
  }
}
