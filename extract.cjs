const fs = require('fs');

const results = JSON.parse(fs.readFileSync('audit_results.json', 'utf-8'));
let out = '';

out += `### 1. Missing Tamil translation keys\n`;
const missing = results.missingKeys.filter(k => k.type === 'Missing in Tamil');
missing.forEach(m => {
  out += `- Key: \`${m.key}\`\n`;
});

out += `\n### 2. Tamil values identical to English\n`;
const identical = results.missingKeys.filter(k => k.type === 'Identical to English');
identical.forEach(m => {
  out += `- Key: \`${m.key}\` (Value: "${m.value}")\n`;
});

out += `\n### 3. Hardcoded English JSX/component content\n`;
const hardcoded = results.findings.filter(f => !f.file.includes('mockData.ts') && !f.file.includes('Training') && !f.file.includes('GoodSamaritan') && !f.text.includes('=>') && !f.text.includes('}'));
// To avoid dumping 300+ items, I'll format them nicely.
hardcoded.forEach(f => {
  if (f.text.length < 50 && /[a-zA-Z]/.test(f.text)) {
    out += `- Screen/Component: \`${f.file}\`\n  - Text: "${f.text}"\n  - Source type: ${f.type}\n  - Reason: Not wrapped in useTranslation\n  - Fix: Add to en.json/ta.json and use \`t()\`\n\n`;
  }
});

out += `\n### 4. Large English content blocks\n`;
out += `- Screen/Component: \`src/pages/EmergencyTrainingScreen.tsx\`\n  - Content: Multiple long instructions (e.g., "Recognising a possible cardiac emergency", "Learn Hands-Only CPR")\n  - Reason: Entire sections hardcoded in JSX\n  - Fix: Move to translation file as object or map\n\n`;
out += `- Screen/Component: \`src/pages/GoodSamaritanScreen.tsx\`\n  - Content: Legal texts (e.g., "Helping an injured person should not begin with fear.")\n  - Reason: Hardcoded in JSX\n  - Fix: Move to translation file\n\n`;
out += `- Screen/Component: \`src/data/mockData.ts\`\n  - Content: Accident titles and descriptions\n  - Reason: Static data array\n  - Fix: Use translation keys instead of hardcoded strings\n\n`;

out += `\n### 5. Dynamic/backend status values\n`;
out += `- Statuses: \`Volunteer En Route\`, \`Emergency Completed\`, \`Hospital Reached\`, etc.\n  - Source: Supabase / \`statusUtils.ts\`\n  - Reason: Backend strings rendered directly\n  - Fix: Use a mapper like \`getLocalizedStatus(status, t)\`\n\n`;

out += `\n### 6. Address/geocoding content\n`;
out += `- Addresses: Google Maps reverse geocoding outputs, hospital addresses\n  - Source: Google Places API / Database\n  - Reason: External API only returns English, or database stores English.\n  - Fix: Hard to translate perfectly, but labels surrounding it (e.g. "Address: ") should be translated.\n\n`;

out += `\n### 7. Any other user-visible English content\n`;
out += `- Notifications: "A volunteer has accepted your emergency request."\n  - Source: \`notificationTypes.ts\`\n  - Reason: Hardcoded config\n  - Fix: Use \`t()\` at render time or translate before sending.\n\n`;

fs.writeFileSync('extracted_findings.txt', out);
