const fs = require('fs');

let content = fs.readFileSync('src/pages/HomeScreen.tsx', 'utf8');

if (!content.includes('getLocalizedStatus')) {
  content = content.replace(
    "import { useTranslation } from 'react-i18next';",
    "import { useTranslation } from 'react-i18next';\nimport { getLocalizedStatus } from '../utils/statusUtils';"
  );
}

content = content.replace(
  "{incident.status === 'Reported' || !incident.volunteer_id ? t('home.waitingVolunteer') : incident.status}",
  "{incident.status === 'Reported' || !incident.volunteer_id ? t('home.waitingVolunteer') : getLocalizedStatus(incident.status, t)}"
);

fs.writeFileSync('src/pages/HomeScreen.tsx', content);
console.log("Patched HomeScreen.tsx");
