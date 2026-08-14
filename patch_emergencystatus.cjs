const fs = require('fs');

let content = fs.readFileSync('src/pages/EmergencyStatusScreen.tsx', 'utf8');

if (!content.includes('getLocalizedStatus')) {
  content = content.replace(
    "import { useTranslation } from 'react-i18next';",
    "import { useTranslation } from 'react-i18next';\nimport { getLocalizedStatus } from '../utils/statusUtils';"
  );
}

// Replace direct `{accident.status}` rendering. Let's make sure it's the exact JSX rendering
content = content.replace(
  />\{accident\.status\}</g,
  ">{getLocalizedStatus(accident.status, t)}<"
);
content = content.replace(
  />\{accident\?\.status\}</g,
  ">{getLocalizedStatus(accident?.status || '', t)}<"
);

fs.writeFileSync('src/pages/EmergencyStatusScreen.tsx', content);
console.log("Patched EmergencyStatusScreen.tsx");
