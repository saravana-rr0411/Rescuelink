const fs = require('fs');

function replaceInFile(path, patcher) {
  let content = fs.readFileSync(path, 'utf8');
  content = patcher(content);
  fs.writeFileSync(path, content);
}

replaceInFile('src/components/common/GoogleMapsNavigationMode.tsx', (c) => {
  c = c.replace(/'🏥 Hospital Navigation'/g, "t('nav.hospitalNavigation')");
  c = c.replace(/'🚨 Live Scene Navigation'/g, "t('nav.liveSceneNavigation')");
  c = c.replace(/'Navigation Mode ON'/g, "t('nav.modeOn')");
  c = c.replace(/'Navigation Mode OFF'/g, "t('nav.modeOff')");
  return c;
});

replaceInFile('src/components/common/WhileHelpIsOnTheWayGuide.tsx', (c) => {
  c = c.replace(/'Collapse Golden Hour Guide'/g, "t('emergency.collapseGuide')");
  c = c.replace(/'Expand Golden Hour Guide'/g, "t('emergency.expandGuide')");
  return c;
});

replaceInFile('src/pages/ProfileScreen.tsx', (c) => {
  c = c.replace(/'Volunteer Responder'/g, "t('profile.volunteerResponder')");
  c = c.replace(/'Citizen Responder'/g, "t('profile.citizenResponder')");
  c = c.replace(/'\+ Edit'/g, "t('profile.editAdd')");
  c = c.replace(/'\+ Add'/g, "t('profile.addOption')");
  return c;
});

replaceInFile('src/pages/SignUpScreen.tsx', (c) => {
  c = c.replace(/'Please provide a valid email and password\.'/g, "t('auth.signup.errorInvalidEmail')");
  c = c.replace(/'Password must be at least 6 characters long\.'/g, "t('auth.signup.errorPasswordShort')");
  return c;
});

replaceInFile('src/pages/VolunteerDashboardScreen.tsx', (c) => {
  c = c.replace(/'minute'/g, "t('common.min')");
  c = c.replace(/'minutes'/g, "t('common.mins')");
  c = c.replace(/'hour'/g, "t('common.hour')");
  c = c.replace(/'hours'/g, "t('common.hours')");
  return c;
});

console.log("Patched final tsx files");
