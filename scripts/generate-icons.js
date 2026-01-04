const fs = require('fs');
const path = require('path');

// Create simple SVG icons and convert to PNG using Canvas API fallback
const createSVGIcon = (size, isMaskable = false) => {
  const padding = isMaskable ? size * 0.2 : 0;
  const innerSize = size - padding * 2;
  const x = padding;
  const y = padding;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${isMaskable ? '#000000' : 'transparent'}"/>
  <rect x="${x}" y="${y}" width="${innerSize}" height="${innerSize}" fill="#000000" rx="20"/>
  <text x="${size / 2}" y="${size / 2 + innerSize / 8}" font-family="Arial, sans-serif" font-size="${innerSize / 3}" font-weight="bold" fill="#ffffff" text-anchor="middle">VS</text>
</svg>`;
};

const publicDir = path.join(__dirname, '..', 'public');

// Generate SVG icons
fs.writeFileSync(path.join(publicDir, 'icon-192.svg'), createSVGIcon(192, false));
fs.writeFileSync(path.join(publicDir, 'icon-512.svg'), createSVGIcon(512, false));
fs.writeFileSync(path.join(publicDir, 'icon-192-maskable.svg'), createSVGIcon(192, true));
fs.writeFileSync(path.join(publicDir, 'icon-512-maskable.svg'), createSVGIcon(512, true));

console.log('✅ SVG icons generated successfully!');
console.log('Converting to PNG requires additional dependencies.');
console.log('For now, manifest will reference SVG files.');
