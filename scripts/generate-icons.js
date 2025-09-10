const fs = require('fs');
const path = require('path');

// Créer un canvas simple pour générer les icônes PNG
const createIcon = (size) => {
  const canvas = `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="64" fill="#000000"/>
  <rect x="64" y="64" width="384" height="384" rx="32" fill="#ffffff"/>
  <circle cx="256" cy="200" r="40" fill="#000000"/>
  <rect x="216" y="240" width="80" height="120" rx="8" fill="#000000"/>
  <rect x="180" y="360" width="40" height="40" rx="4" fill="#000000"/>
  <rect x="292" y="360" width="40" height="40" rx="4" fill="#000000"/>
  <text x="256" y="450" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#000000">PADEL</text>
</svg>`;
  
  return canvas;
};

// Tailles d'icônes nécessaires
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Créer le dossier icons s'il n'existe pas
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Générer les icônes SVG pour chaque taille
sizes.forEach(size => {
  const iconContent = createIcon(size);
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(iconsDir, filename);
  
  fs.writeFileSync(filepath, iconContent);
  console.log(`Généré: ${filename}`);
});

console.log('Toutes les icônes SVG ont été générées !');
console.log('Note: Pour une production, convertissez ces SVG en PNG avec un outil comme ImageMagick ou un service en ligne.');

