const fs = require('fs');

function replaceInFile(path, search, replace) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(search, replace);
  fs.writeFileSync(path, content);
}

replaceInFile('src/pages/EmergencyStatusScreen.tsx', /t\('profile\.history'\)/g, "t('profile.history.title')");
replaceInFile('src/pages/ProfileScreen.tsx', /t\('profile\.history'\)/g, "t('profile.history.title')");
replaceInFile('src/pages/VolunteerDashboardScreen.tsx', /t\('volunteerDashboard\.history'\)/g, "t('volunteerDashboard.history.title')");
console.log("Fixed history key usage");
