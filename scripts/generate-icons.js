const fs = require('fs');
const path = require('path');

// Lire l'icône principale et la redimensionner
const createIcon = (size) => {
  const iconPath = path.join(__dirname, '..', 'public', 'icons', 'icon.svg');
  const originalIcon = fs.readFileSync(iconPath, 'utf8');
  
  // Remplacer la taille dans le SVG original
  const resizedIcon = originalIcon
    .replace(/width="48"/g, `width="${size}"`)
    .replace(/height="48"/g, `height="${size}"`)
    .replace(/viewBox="0 0 48 48"/g, `viewBox="0 0 48 48"`);
  
  return resizedIcon;
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

