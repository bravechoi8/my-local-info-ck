import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pngPath = path.join(__dirname, '..', 'public', 'images', 'card-bg-2026-07-13-jangyoonki-court-confession.png');
const svgPath = path.join(__dirname, '..', 'public', 'images', 'card-2026-07-13-jangyoonki-court-confession.svg');

try {
  // Read png file and convert to base64
  const pngBuffer = fs.readFileSync(pngPath);
  const base64Image = pngBuffer.toString('base64');
  const dataUri = `data:image/png;base64,${base64Image}`;

  // Read svg file and replace the href
  let svgContent = fs.readFileSync(svgPath, 'utf8');
  svgContent = svgContent.replace(
    'href="/images/card-bg-2026-07-13-jangyoonki-court-confession.png"',
    `href="${dataUri}"`
  );

  fs.writeFileSync(svgPath, svgContent, 'utf8');
  console.log('SVG Image Embedded successfully!');
} catch (err) {
  console.error('Error embedding image into SVG:', err.message);
}
