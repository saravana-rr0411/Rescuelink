const fs = require('fs');

let content = fs.readFileSync('src/components/common/WhileHelpIsOnTheWayGuide.tsx', 'utf8');

// Ensure useTranslation is imported
if (!content.includes('useTranslation')) {
  content = content.replace(
    "import React, { useState } from 'react';",
    "import React, { useState } from 'react';\nimport { useTranslation } from 'react-i18next';"
  );
}
// Add const { t } = useTranslation();
if (!content.includes('const { t } = useTranslation();')) {
  content = content.replace(
    "const [isExpanded, setIsExpanded] = useState(true);",
    "const [isExpanded, setIsExpanded] = useState(true);\n  const { t } = useTranslation();"
  );
}

// Replace the helper return strings
content = content.replace(
  "return 'Responder is En Route to Your Location';",
  "return t('emergency.responderEnRoute');"
);
content = content.replace(
  "return 'Responder Has Arrived on Scene';",
  "return t('emergency.responderArrivedOnScene');"
);
content = content.replace(
  "return 'Safely Arrived at Hospital';",
  "return t('emergency.safelyArrivedAtHospital');"
);
content = content.replace(
  "return 'Emergency Medical Transport Completed';",
  "return t('emergency.medicalTransportCompleted');"
);

fs.writeFileSync('src/components/common/WhileHelpIsOnTheWayGuide.tsx', content);
console.log("Patched WhileHelpIsOnTheWayGuide.tsx");
