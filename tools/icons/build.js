// Erzeugt alle App-Icons und das Startbild aus design/icon/politikometer-quadratisch.svg.
//
// Aufruf (aus dem Projektordner):
//   npm install --prefix tools/icons @resvg/resvg-js@2.6.2
//   node tools/icons/build.js
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const root = path.resolve(__dirname, '..', '..');
const svg = fs.readFileSync(path.join(root, 'design/icon/politikometer-quadratisch.svg'), 'utf8');
const appImages = path.join(root, 'app/assets/images');
const designDir = path.join(root, 'design/icon');
const NAVY = '#1B2E52';

const defs = svg.match(/<defs>[\s\S]*?<\/defs>/)[0];
const bgRect = svg.match(/<rect width="1024" height="1024"[^>]*\/>/)[0];
const inner = svg.match(/<g transform="translate\(0,-46\)">([\s\S]*?)<\/g>/)[1];

// Mitte des Motivs in Rohkoordinaten (vor translate(0,-46)): x 196–828, y 257–818
const CX = 512;
const CY = 537.5;
const place = (scale, body) =>
  `<g transform="translate(512,512) scale(${scale}) translate(${-CX},${-CY})">${body}</g>`;
const wrap = (body, extraDefs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${defs}${extraDefs}${body}</svg>`;

// Monochrom: alles weiß, dunkle Details als Aussparung (Maske)
const maskBody = inner
  .replace(new RegExp(`fill="${NAVY}"`, 'g'), 'fill="#000000"')
  .replace(/fill="#(?!000000)[0-9A-Fa-f]{6}"/g, 'fill="#FFFFFF"')
  .replace(/stroke="#[0-9A-Fa-f]{6}"/g, 'stroke="#FFFFFF"')
  .replace(/stroke-opacity="[0-9.]+"/g, '');

// Android: sicherer Bereich ist ein Kreis mit 66/108 des Durchmessers → Skalierung 0,72
const outputs = [
  [path.join(appImages, 'icon.png'), svg, 1024],
  [path.join(appImages, 'favicon.png'), svg, 192],
  [path.join(designDir, 'playstore-512.png'), svg, 512],
  [path.join(appImages, 'android-icon-foreground.png'), wrap(place(0.72, inner)), 1024],
  [path.join(appImages, 'android-icon-background.png'), wrap(bgRect), 1024],
  [
    path.join(appImages, 'android-icon-monochrome.png'),
    wrap(
      '<rect width="1024" height="1024" fill="#FFFFFF" mask="url(#m)"/>',
      `<mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024"><rect width="1024" height="1024" fill="#000000"/>${place(0.72, maskBody)}</mask>`,
    ),
    1024,
  ],
  [path.join(appImages, 'splash-icon.png'), wrap(place(1.5, inner)), 1024],
];

for (const [file, source, size] of outputs) {
  const png = new Resvg(source, { fitTo: { mode: 'width', value: size } }).render().asPng();
  fs.writeFileSync(file, png);
  console.log(path.relative(root, file), size, png.length);
}
