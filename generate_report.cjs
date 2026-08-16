const fs = require('fs');
const path = require('path');

const results = JSON.parse(fs.readFileSync('audit_results.json', 'utf-8'));
const artifactPath = '/Users/saravanarajaram0411/.gemini/antigravity-ide/brain/7b7e6c57-708a-4fd0-ba34-e99e154c93cd/translation_audit_report.md';

let md = `# Translation Audit Report\n\n`;

md += `### 6. Total coverage\n\n`;
md += `Total user-visible English items found (estimated): ${results.stats.totalVisibleItems}\n\n`;
md += `Already correctly translated: ${results.stats.alreadyTranslated}\n\n`;
md += `Still English (Hardcoded): ${results.stats.stillEnglish}\n\n`;
md += `Missing Tamil translations: ${results.stats.missingTranslations}\n\n`;
md += `External/uncontrollable: Map tiles, Third-party integrations (not counted here)\n\n`;

md += `==================================================\n\n`;

md += `### 1. Remaining English UI/content\n\n`;
md += `| Screen/Component | English text/content | Source file | Source type | Translation status |\n`;
md += `|---|---|---|---|---|\n`;

// Group findings by file
const groupedFindings = {};
results.findings.forEach(f => {
  if (!groupedFindings[f.file]) groupedFindings[f.file] = [];
  groupedFindings[f.file].push(f);
});

for (const [file, items] of Object.entries(groupedFindings)) {
  const compName = path.basename(file, path.extname(file));
  // Limit max items per file in table to avoid explosion, or just show all
  items.slice(0, 50).forEach(f => {
    let cleanText = f.text.replace(/\n/g, ' ').substring(0, 100);
    if (f.text.length > 100) cleanText += '...';
    md += `| ${compName} | \`${cleanText}\` | \`${f.file}\` | ${f.type} | Hardcoded |\n`;
  });
}

md += `\n### 2. Missing translation keys (in ta.json)\n\n`;
if (results.missingKeys.length > 0) {
  results.missingKeys.slice(0, 100).forEach(m => {
    if (m.type === 'Missing in Tamil') {
      md += `- \`${m.key}\` (Missing entirely in \`ta.json\`)\n`;
    }
  });
} else {
  md += `No missing keys found.\n`;
}

md += `\n### 3. Hardcoded English (Already in translations but value is identical in ta.json)\n\n`;
const identical = results.missingKeys.filter(m => m.type === 'Identical to English');
if (identical.length > 0) {
  identical.slice(0, 100).forEach(m => {
    md += `- \`${m.key}\`: "${m.value}"\n`;
  });
} else {
  md += `No identical keys found.\n`;
}

md += `\n### 4. Content blocks\n\n`;
md += `Large content blocks found based on the audit:\n`;
md += `- **EmergencyTrainingScreen.tsx**: Contains large chunks of training data like "Recognising a possible cardiac emergency", "Learn Hands-Only CPR", "Basic CPR awareness".\n`;
md += `- **GoodSamaritanScreen.tsx**: Contains blocks like "Helping an injured person should not begin with fear.", "24/7 Samaritan Attorney Network".\n`;
md += `- **mockData.ts**: Contains descriptive content like "Smoke reported on 3rd floor".\n`;

md += `\n### 5. Dynamic content\n\n`;
md += `English content identified coming from:\n`;
md += `- **Database/API (Addresses)**: Real-time locations, hospital addresses, GPS coordinates generated dynamically (e.g. \`destinationAddress\`, \`accident.address\`, Google Maps Geocoding).\n`;
md += `- **Status Updates**: Accident statuses like "Assigned", "Volunteer En Route", "Emergency Completed", "Completed".\n`;
md += `- **Notifications**: System notifications like "A volunteer has accepted your emergency request".\n`;

fs.writeFileSync(artifactPath, md);
console.log('Report generated at ' + artifactPath);
