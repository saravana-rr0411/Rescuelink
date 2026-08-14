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
  'src/pages/ProfileScreen.tsx': (c) => {
    c = c.replace(/>Blood Type</g, ">{t('profile.bloodGroup')}<");
    return c;
  },
  'src/pages/NotificationsScreen.tsx': (c) => {
    c = addI18n(c);
    c = c.replace(/label="Go back"/g, "label={t('nav.goBack')}");
    c = c.replace(/>Notification Center</g, ">{t('notifications.title')}<");
    c = c.replace(/title="Mark all notifications as read"/g, "title={t('notifications.markAllRead')}");
    c = c.replace(/>Mark all read</g, ">{t('notifications.markAllReadBtn')}<");
    c = c.replace(/>Enable Desktop & System Alerts</g, ">{t('notifications.enableAlerts')}<");
    c = c.replace(/>Loading notifications\.\.\.</g, ">{t('notifications.loading')}<");
    c = c.replace(/>No notifications added</g, ">{t('notifications.empty')}<");
    return c;
  },
  'src/pages/ReportAccidentScreen.tsx': (c) => {
    c = addI18n(c);
    c = c.replace(/alt="Incident Scene Preview"/g, "alt={t('reportAccident.scenePreview')}");
    c = c.replace(/label="Remove image"/g, "label={t('reportAccident.removeImage')}");
    return c;
  },
  'src/pages/SignUpScreen.tsx': (c) => {
    c = addI18n(c);
    c = c.replace(/>Create Account</g, ">{t('auth.signup.createAccount')}<");
    c = c.replace(/>Set up your Emergency Passport & Supabase Auth</g, ">{t('auth.signup.setupPassport')}<");
    c = c.replace(/>Personal Information</g, ">{t('auth.signup.personalInfo')}<");
    c = c.replace(/>Full Name</g, ">{t('profile.fullName')}<");
    c = c.replace(/>Mobile Number</g, ">{t('auth.signup.mobileNumber')}<");
    c = c.replace(/>Blood Group</g, ">{t('profile.bloodGroup')}<");
    c = c.replace(/>O- \(Universal\)</g, ">{t('profile.bloodUniversal')}<");
    c = c.replace(/>Email Address \(Supabase Login\)</g, ">{t('auth.emailLabel')}<");
    c = c.replace(/placeholder="name@example.com"/g, "placeholder={t('auth.emailPlaceholder')}");
    c = c.replace(/>Password</g, ">{t('auth.passwordLabel')}<");
    c = c.replace(/placeholder="At least 6 characters"/g, "placeholder={t('auth.signup.passwordDesc')}");
    c = c.replace(/>Primary Emergency Contact</g, ">{t('auth.signup.primaryContact')}<");
    c = c.replace(/>Autodialed on SOS</g, ">{t('auth.signup.autodialedOnSos')}<");
    c = c.replace(/placeholder="Contact Name"/g, "placeholder={t('profile.contactName')}");
    c = c.replace(/placeholder="Phone Number"/g, "placeholder={t('profile.phoneNumber')}");
    c = c.replace(/placeholder="Relationship \(e\.g\. Parent\)"/g, "placeholder={t('auth.signup.relationship')}");
    c = c.replace(/>Creating Account & Profile\.\.\.</g, ">{t('auth.signup.creatingAccount')}<");
    c = c.replace(/>Complete Registration</g, ">{t('auth.signup.completeRegistration')}<");
    return c;
  },
  'src/pages/VolunteerDashboardScreen.tsx': (c) => {
    c = addI18n(c);
    c = c.replace(/label="View Volunteer History"/g, "label={t('volunteerDashboard.history.viewHistory')}");
    c = c.replace(/alt="Scene Evidence"/g, "alt={t('volunteerDashboard.history.sceneEvidence')}");
    c = c.replace(/alt="Accident Evidence"/g, "alt={t('volunteerDashboard.history.accidentEvidence')}");
    return c;
  },
  'src/pages/VolunteerMapPreviewScreen.tsx': (c) => {
    c = addI18n(c);
    c = c.replace(/>Loading Accident Map Preview\.\.\.</g, ">{t('volunteerDashboard.mapPreview.loadingPreview')}<");
    c = c.replace(/>Incident Not Found</g, ">{t('volunteerDashboard.mapPreview.incidentNotFound')}<");
    c = c.replace(/>This accident alert may have been resolved or canceled\.</g, ">{t('volunteerDashboard.mapPreview.alertResolved')}<");
    c = c.replace(/label="Back to dashboard"/g, "label={t('volunteerDashboard.mapPreview.backToDashboard')}");
    c = c.replace(/>Route Preview Available</g, ">{t('volunteerDashboard.mapPreview.routePreview')}<");
    c = c.replace(/>Accepting Mission\.\.\.</g, ">{t('volunteerDashboard.mapPreview.acceptingMission')}<");
    c = c.replace(/>ACCEPT ACCIDENT MISSION</g, ">{t('volunteerDashboard.mapPreview.acceptMissionConfirm')}<");
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
console.log("Patched other remaining files");
