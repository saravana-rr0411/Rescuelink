const fs = require('fs');

let content = fs.readFileSync('src/pages/VolunteerDashboardScreen.tsx', 'utf8');

if (!content.includes('getLocalizedStatus')) {
  // Add import
  content = content.replace(
    "import { useTranslation } from 'react-i18next';",
    "import { useTranslation } from 'react-i18next';\nimport { getLocalizedStatus } from '../../utils/statusUtils';"
  );
}

// Replace direct `{mission.status}` rendering
content = content.replace(
  /\{mission\.status\}/g,
  "{getLocalizedStatus(mission.status, t)}"
);
// NOTE: there is one case `mission.status !== 'Hospital Reached'` which is valid code logic. 
// We are only trying to replace the rendered JSX strings. The regex `\{mission\.status\}` specifically targets JSX interpolation `{mission.status}`.
// Let's verify if `accident.status` is also used here in interpolation:
content = content.replace(
  /\{accident\.status\}/g,
  "{getLocalizedStatus(accident.status, t)}"
);
// And `inc.status` if any
content = content.replace(
  /\{inc\.status\}/g,
  "{getLocalizedStatus(inc.status, t)}"
);

fs.writeFileSync('src/pages/VolunteerDashboardScreen.tsx', content);
console.log("Patched VolunteerDashboardScreen.tsx");
