import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const OUT = 'assets/images';
await mkdir(OUT, { recursive: true });

const INK = '#14180F';
const INK_SOFT = '#2C361E';
const LIME = '#C9F25B';

/** The Splitie mark: a coin split into two offset halves. */
function mark({ size = 1024, color = INK, colorSoft = INK_SOFT, background = 'transparent', pad = 0 }) {
  const s = 1024;
  const scale = (s - pad * 2) / s;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${s} ${s}">
    <rect width="${s}" height="${s}" fill="${background}"/>
    <g transform="translate(${pad} ${pad}) scale(${scale})">
      <g transform="rotate(-22 512 512)">
        <path d="M192 512 A320 320 0 0 1 832 512 Z" fill="${color}"/>
        <g transform="translate(0 40)">
          <path d="M192 512 A320 320 0 0 0 832 512 Z" fill="${colorSoft}"/>
        </g>
      </g>
    </g>
  </svg>`;
}

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${LIME}"/>
  <g transform="translate(512 512) scale(0.92) translate(-512 -512)">
    ${mark({ color: INK, colorSoft: INK_SOFT }).replace(/<\/?svg[^>]*>/g, '')}
  </g>
</svg>`;

const splashSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <g transform="translate(300 300) scale(0.5) translate(-512 -512)">
    ${mark({ color: INK, colorSoft: INK_SOFT }).replace(/<\/?svg[^>]*>/g, '')}
  </g>
</svg>`;

const foregroundSvg = mark({ size: 1024, color: INK, colorSoft: INK_SOFT, pad: 170 });
const monochromeSvg = mark({ size: 1024, color: '#FFFFFF', colorSoft: '#FFFFFF', pad: 170 });
const notificationSvg = mark({ size: 96, color: '#FFFFFF', colorSoft: '#FFFFFF', pad: 8 });

const solid = (size, color) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${color}"/></svg>`;

await Promise.all([
  sharp(Buffer.from(iconSvg)).png().resize(1024, 1024).toFile(`${OUT}/icon.png`),
  sharp(Buffer.from(iconSvg)).png().resize(512, 512).toFile(`${OUT}/splash-icon.png`),
  sharp(Buffer.from(foregroundSvg)).png().resize(1024, 1024).toFile(`${OUT}/android-icon-foreground.png`),
  sharp(Buffer.from(solid(1024, LIME))).png().toFile(`${OUT}/android-icon-background.png`),
  sharp(Buffer.from(monochromeSvg)).png().resize(1024, 1024).toFile(`${OUT}/android-icon-monochrome.png`),
  sharp(Buffer.from(iconSvg)).png().resize(64, 64).toFile(`${OUT}/favicon.png`),
  sharp(Buffer.from(notificationSvg)).png().resize(96, 96).toFile(`${OUT}/notification-icon.png`),
  sharp(Buffer.from(splashSvg)).png().resize(600, 600).toFile(`${OUT}/splash-wordmark.png`),
]);

console.log('Generated Splitie brand assets.');
