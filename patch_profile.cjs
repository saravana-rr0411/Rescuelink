const fs = require('fs');
const path = 'src/pages/ProfileScreen.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(/title="My Profile"/g, "title={t('profile.myProfile')}");
c = c.replace(/>Loading user profile\.\.\.</g, ">{t('profile.loadingProfile')}<");
c = c.replace(/title="Tap photo to change avatar"/g, "title={t('profile.tapAvatar')}");
c = c.replace(/title="Edit Profile"/g, "title={t('profile.editProfile')}");
c = c.replace(/>Edit</g, ">{t('profile.edit')}<");
c = c.replace(/>Edit Profile Details</g, ">{t('profile.editProfileDetails')}<");
c = c.replace(/>Profile Photo</g, ">{t('profile.profilePhoto')}<");
c = c.replace(/>Tap to upload new photo</g, ">{t('profile.uploadPhoto')}<");
c = c.replace(/>Email Address \(Read-only\)</g, ">{t('profile.emailReadOnly')}<");
c = c.replace(/>Full Name</g, ">{t('profile.fullName')}<");
c = c.replace(/placeholder="Enter your full name"/g, "placeholder={t('profile.enterFullName')}");
c = c.replace(/>Phone Number</g, ">{t('profile.phoneNumber')}<");
c = c.replace(/placeholder="\+91 98765 43210"/g, "placeholder={t('profile.phonePlaceholder')}");
c = c.replace(/>Blood Group</g, ">{t('profile.bloodGroup')}<");
c = c.replace(/>O- \(Universal\)</g, ">{t('profile.bloodUniversal')}<");
c = c.replace(/>Known Allergies</g, ">{t('profile.knownAllergies')}<");
c = c.replace(/placeholder="e\.g\. Penicillin, Peanuts \(or None\)"/g, "placeholder={t('profile.allergiesPlaceholder')}");
c = c.replace(/>Medical Conditions</g, ">{t('profile.medicalConditions')}<");
c = c.replace(/placeholder="e\.g\. Asthma, Diabetes \(or None\)"/g, "placeholder={t('profile.conditionsPlaceholder')}");
c = c.replace(/placeholder="Contact Name"/g, "placeholder={t('profile.contactName')}");
c = c.replace(/placeholder="Phone Number"/g, "placeholder={t('profile.phoneNumber')}");
c = c.replace(/placeholder="Relation \(e\.g\. Spouse\)"/g, "placeholder={t('profile.relation')}");
c = c.replace(/>Save Changes</g, ">{t('profile.saveChanges')}<");
c = c.replace(/>My Statistics</g, ">{t('profile.stats.myStatistics')}<");
c = c.replace(/>Total</g, ">{t('profile.stats.total')}<");
c = c.replace(/>Rescues</g, ">{t('profile.stats.rescues')}<");
c = c.replace(/>Active</g, ">{t('profile.stats.active')}<");
c = c.replace(/>In Progress</g, ">{t('profile.stats.inProgress')}<");
c = c.replace(/>Completed</g, ">{t('profile.stats.completed')}<");
c = c.replace(/>Resolved</g, ">{t('profile.stats.resolved')}<");
c = c.replace(/>Reports</g, ">{t('profile.stats.reports')}<");
c = c.replace(/>Total SOS</g, ">{t('profile.stats.totalSos')}<");
c = c.replace(/>Live Status</g, ">{t('profile.stats.liveStatus')}<");
c = c.replace(/>Logout</g, ">{t('profile.signOut')}<");
c = c.replace(/>Change Password</g, ">{t('profile.settings.changePassword')}<");
c = c.replace(/>New Password</g, ">{t('profile.settings.newPassword')}<");
c = c.replace(/placeholder="Min 6 characters"/g, "placeholder={t('profile.settings.passwordMin')}");
c = c.replace(/>Confirm Password</g, ">{t('profile.settings.confirmPassword')}<"); // Already have auth.signup.confirmPassword but let's see. Wait, "Confirm Password" wasn't added to settings. Let me check if I added it. Actually, en.json has it somewhere else maybe. Let's add it if missing or just replace text.
// Wait, I missed Confirm Password in the script for Profile. Let me check my patch_locales.cjs
// No, I added confirmPasswordPlaceholder, but not the title "Confirm Password". 
// I will just add "confirmPassword: 'Confirm Password'" to settings dynamically.

c = c.replace(/>Privacy & Security</g, ">{t('profile.settings.privacySecurity')}<");
c = c.replace(/>Location Privacy</g, ">{t('profile.settings.locationPrivacy')}<");
c = c.replace(/>Used to accurately pinpoint emergency reports</g, ">{t('profile.settings.locationPrivacyDesc1')}<");
c = c.replace(/>Matching nearby volunteer responders to your SOS</g, ">{t('profile.settings.locationPrivacyDesc2')}<");
c = c.replace(/>Providing real-time live navigation when active</g, ">{t('profile.settings.locationPrivacyDesc3')}<");
c = c.replace(/>Discovering nearby trauma and stroke hospitals</g, ">{t('profile.settings.locationPrivacyDesc4')}<");
c = c.replace(/>Emergency Data</g, ">{t('profile.settings.emergencyData')}<");
c = c.replace(/>Your medical passport is shared during emergencies</g, ">{t('profile.settings.emergencyDataDesc1')}<");
c = c.replace(/>Volunteer coordination utilizes contact details</g, ">{t('profile.settings.emergencyDataDesc2')}<");
c = c.replace(/>Relevant medical history is shared with receiving hospitals</g, ">{t('profile.settings.emergencyDataDesc3')}<");
c = c.replace(/>Offline Data Storage</g, ">{t('profile.settings.offlineData')}<");
c = c.replace(/>The following data is cached locally to work without internet:</g, ">{t('profile.settings.offlineDataDesc1')}<");
c = c.replace(/>Last known GPS coordinates</g, ">{t('profile.settings.offlineDataDesc2')}<");
c = c.replace(/>Emergency trauma hospital directory</g, ">{t('profile.settings.offlineDataDesc3')}<");
c = c.replace(/>Pending\/queued text-based emergency reports</g, ">{t('profile.settings.offlineDataDesc4')}<");
c = c.replace(/>Network synchronization status</g, ">{t('profile.settings.offlineDataDesc5')}<");
c = c.replace(/>Note: Photos are never queued or stored offline\.</g, ">{t('profile.settings.offlineDataDesc6')}<");
c = c.replace(/>Account Security</g, ">{t('profile.accountSecurity')}<"); // Already have profile.accountSecurity
c = c.replace(/>Encrypted session management via Supabase Auth</g, ">{t('profile.settings.accountSecuritySub')}<");
c = c.replace(/>Password-protected profile editing</g, ">{t('profile.settings.accountSecuritySub2')}<");
c = c.replace(/>Secure sign-out capability</g, ">{t('profile.settings.accountSecuritySub3')}<");

fs.writeFileSync(path, c);

// Also need to patch locales for Confirm Password
const langs = ['en', 'ta', 'hi'];
langs.forEach(lang => {
  const p = `./src/locales/${lang}.json`;
  let d = JSON.parse(fs.readFileSync(p, 'utf8'));
  d.profile.settings.confirmPassword = lang === 'en' ? 'Confirm Password' : (lang === 'ta' ? 'கடவுச்சொல்லை உறுதிப்படுத்துக' : 'पासवर्ड की पुष्टि करें');
  fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n');
});

console.log("Patched ProfileScreen and locales");
