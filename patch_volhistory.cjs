const fs = require('fs');

let content = fs.readFileSync('src/pages/VolunteerHistoryScreen.tsx', 'utf8');

content = content.replace(
  'description="You haven\'t completed any rescue missions yet. Accepted emergency alerts will appear here."',
  'description={t("volunteerDashboard.history.emptyDescription")}'
);

fs.writeFileSync('src/pages/VolunteerHistoryScreen.tsx', content);
console.log("Patched VolunteerHistoryScreen.tsx");
