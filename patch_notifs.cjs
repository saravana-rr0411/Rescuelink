const fs = require('fs');

let content = fs.readFileSync('src/pages/NotificationsScreen.tsx', 'utf8');

if (!content.includes('getLocalizedNotification')) {
  content = content.replace(
    "import { useTranslation } from 'react-i18next';",
    "import { useTranslation } from 'react-i18next';\nimport { getLocalizedNotification } from '../utils/statusUtils';"
  );
}

// Replace `{notification.title}` and `{notification.message}`
content = content.replace(
  /\{notification\.title\}/g,
  "{getLocalizedNotification(notification.title, t)}"
);
content = content.replace(
  /\{notification\.message\}/g,
  "{getLocalizedNotification(notification.message, t)}"
);

fs.writeFileSync('src/pages/NotificationsScreen.tsx', content);
console.log("Patched NotificationsScreen.tsx");
