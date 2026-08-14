const fs = require('fs');

let content = fs.readFileSync('src/pages/HistoryDetailsScreen.tsx', 'utf8');

// Ensure useTranslation is imported
if (!content.includes('useTranslation')) {
  content = content.replace(
    "import React, { useEffect, useState } from 'react';",
    "import React, { useEffect, useState } from 'react';\nimport { useTranslation } from 'react-i18next';"
  );
}
// Add const { t } = useTranslation();
if (!content.includes('const { t } = useTranslation();')) {
  content = content.replace(
    "const navigate = useNavigate();",
    "const navigate = useNavigate();\n  const { t } = useTranslation();"
  );
}

// Replace timeline titles
content = content.replace("title: 'Accident Reported',", "title: t('history.timeline.accidentReported'),");
content = content.replace("title: 'Volunteer Accepted',", "title: t('history.timeline.volunteerAccepted'),");
content = content.replace("title: 'Volunteer Arrived',", "title: t('history.timeline.volunteerArrived'),");
content = content.replace("title: 'Transport Started',", "title: t('history.timeline.transportStarted'),");
content = content.replace("title: 'Hospital Reached',", "title: t('history.timeline.hospitalReached'),");
content = content.replace("title: 'Completed',", "title: t('history.timeline.completed'),");

fs.writeFileSync('src/pages/HistoryDetailsScreen.tsx', content);
console.log("Patched HistoryDetailsScreen.tsx");
