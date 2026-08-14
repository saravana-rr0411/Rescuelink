const fs = require('fs');

function addI18n(content) {
  if (!content.includes('useTranslation')) {
    if (content.includes("from 'react'")) {
      content = content.replace(/import ([^;]+) from 'react';/, "import $1 from 'react';\nimport { useTranslation } from 'react-i18next';");
    } else {
      content = "import { useTranslation } from 'react-i18next';\n" + content;
    }
    // inject hook
    content = content.replace(/(const \w+(?:<[^>]+>)?:\s*React\.FC(?:<[^>]+>)?\s*=\s*\([^)]*\)\s*=>\s*{)/, "$1\n  const { t } = useTranslation();");
  }
  return content;
}

const files = {
  'src/pages/CitizenHistoryScreen.tsx': (c) => {
    c = addI18n(c);
    c = c.replace(/title="Accident History"/g, "title={t('profile.history.accidentHistory')}");
    c = c.replace(/>Retry</g, ">{t('profile.history.retry')}<");
    c = c.replace(/title="No accident history yet."/g, "title={t('profile.history.noHistory')}");
    c = c.replace(/>Response Duration</g, ">{t('profile.history.responseDuration')}<");
    c = c.replace(/>View Details</g, ">{t('profile.history.viewDetails')}<");
    return c;
  },
  'src/pages/VolunteerHistoryScreen.tsx': (c) => {
    c = addI18n(c);
    c = c.replace(/title="Volunteer Mission History"/g, "title={t('volunteerDashboard.history.missionHistory')}");
    c = c.replace(/>Retry</g, ">{t('volunteerDashboard.history.retry')}<");
    c = c.replace(/title="No rescue history yet."/g, "title={t('volunteerDashboard.history.noHistory')}");
    c = c.replace(/>Rescue Time</g, ">{t('volunteerDashboard.history.rescueTime')}<");
    c = c.replace(/>View Mission Record</g, ">{t('volunteerDashboard.history.viewRecord')}<");
    return c;
  },
  'src/pages/EmergencyActionScreen.tsx': (c) => {
    c = addI18n(c);
    c = c.replace(/label="Back"/g, "label={t('common.back')}");
    return c;
  },
  'src/pages/EmergencyStatusScreen.tsx': (c) => {
    c = addI18n(c);
    c = c.replace(/label="View History"/g, "label={t('emergencyStatus.viewHistory')}");
    c = c.replace(/alt="Scene Evidence"/g, "alt={t('emergencyStatus.sceneEvidence')}");
    c = c.replace(/label="Call Volunteer"/g, "label={t('emergencyStatus.callVolunteer')}");
    c = c.replace(/label="Call Emergency Hotline"/g, "label={t('emergencyStatus.callHotline')}");
    return c;
  },
  'src/pages/HistoryDetailsScreen.tsx': (c) => {
    c = addI18n(c);
    c = c.replace(/title="Accident History Details"/g, "title={t('profile.historyDetails.detailsTitle')}");
    c = c.replace(/>Retry</g, ">{t('profile.history.retry')}<");
    c = c.replace(/title="Record Not Found"/g, "title={t('profile.historyDetails.recordNotFound')}");
    c = c.replace(/>Volunteer Responder Details</g, ">{t('profile.historyDetails.volunteerDetails')}<");
    c = c.replace(/label="Call Volunteer"/g, "label={t('emergencyStatus.callVolunteer')}");
    c = c.replace(/>Hospital Destination Details</g, ">{t('profile.historyDetails.hospitalDetails')}<");
    c = c.replace(/>Incident Response Timeline</g, ">{t('profile.historyDetails.timeline')}<");
    return c;
  }
};

for (const [path, patcher] of Object.entries(files)) {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    content = patcher(content);
    fs.writeFileSync(path, content);
  }
}
console.log("Patched history/status screens");
