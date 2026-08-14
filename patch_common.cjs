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
  'src/components/common/HospitalPreAlertCard.tsx': (c) => {
    c = addI18n(c);
    c = c.replace(/>🚨 Incoming Emergency</, ">{t('hospital.incomingEmergency')}<");
    return c;
  },
  'src/components/common/HospitalSelectorSheet.tsx': (c) => {
    c = addI18n(c);
    c = c.replace(/label="Close hospital selector sheet"/g, "label={t('common.closeSheet')}");
    return c;
  },
  'src/components/common/MapWidget.tsx': (c) => {
    c = addI18n(c);
    c = c.replace(/>Location Coordinates Unavailable</g, ">{t('common.map.locationUnavailable')}<");
    c = c.replace(/>OpenStreetMap</g, ">{t('common.map.openStreetMap')}<");
    c = c.replace(/>Responder Active Location</g, ">{t('common.map.responderLocation')}<");
    c = c.replace(/label="Navigate via OpenStreetMap"/g, "label={t('common.map.navigateOsm')}");
    c = c.replace(/>Navigate</g, ">{t('common.map.navigate')}<");
    return c;
  },
  'src/components/common/OfflineBanner.tsx': (c) => {
    c = addI18n(c);
    c = c.replace(/>No Internet Connection</g, ">{t('common.offline.noInternet')}<");
    c = c.replace(/>Retry</g, ">{t('common.offline.retry')}<");
    return c;
  },
  'src/components/common/WhileHelpIsOnTheWayGuide.tsx': (c) => {
    c = addI18n(c);
    c = c.replace(/>GOLDEN HOUR</g, ">{t('emergency.goldenHour')}<");
    c = c.replace(/>Emergency Guidance Notice:</g, ">{t('emergency.guidanceNotice')}<");
    return c;
  },
  'src/components/layout/Navbar.tsx': (c) => {
    c = addI18n(c);
    c = c.replace(/label="Go back"/g, "label={t('nav.goBack')}");
    c = c.replace(/label="Notification Center"/g, "label={t('nav.notificationCenter')}");
    c = c.replace(/label="User Profile"/g, "label={t('nav.userProfile')}");
    c = c.replace(/alt="User Avatar"/g, "alt={t('nav.userAvatar')}");
    return c;
  },
  'src/components/ui/SOSButton.tsx': (c) => {
    c = addI18n(c);
    c = c.replace(/label="Emergency SOS Press"/g, "label={t('home.sosPress')}");
    return c;
  },
  'src/pages/LiveNavigationScreen.tsx': (c) => {
    c = addI18n(c);
    c = c.replace(/>Acquiring Emergency Location\.\.\.</g, ">{t('nav.acquiringLocation')}<");
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
console.log("Patched common components");
