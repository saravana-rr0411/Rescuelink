const fs = require('fs');

let content = fs.readFileSync('src/pages/ReportAccidentScreen.tsx', 'utf8');

// The original line is: setAddress(`GPS Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
// Need to replace it with: setAddress(t('common.map.gpsLocation', { lat: lat.toFixed(5), lng: lng.toFixed(5) }));

content = content.replace(
  /setAddress\(`GPS Location \(\$\{lat\.toFixed\(5\)\}, \$\{lng\.toFixed\(5\)\}\)`\);/g,
  "setAddress(t('common.map.gpsLocation', { lat: lat.toFixed(5), lng: lng.toFixed(5) }));"
);

fs.writeFileSync('src/pages/ReportAccidentScreen.tsx', content);
console.log("Patched ReportAccidentScreen.tsx");
