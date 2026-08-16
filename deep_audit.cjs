const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, 'src');
const EN_JSON = path.join(ROOT_DIR, 'locales', 'en.json');
const TA_JSON = path.join(ROOT_DIR, 'locales', 'ta.json');

const findings = [];
const missingKeys = [];
let totalVisibleItems = 0;
let alreadyTranslated = 0;
let stillEnglish = 0;
let missingTranslations = 0;

// 1. Analyze locales
const enObj = JSON.parse(fs.readFileSync(EN_JSON, 'utf-8'));
const taObj = JSON.parse(fs.readFileSync(TA_JSON, 'utf-8'));

function flattenObj(obj, prefix = '') {
  let res = {};
  for (let key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      Object.assign(res, flattenObj(obj[key], prefix + key + '.'));
    } else {
      res[prefix + key] = obj[key];
    }
  }
  return res;
}

const enFlat = flattenObj(enObj);
const taFlat = flattenObj(taObj);

for (const key in enFlat) {
  const enVal = enFlat[key];
  const taVal = taFlat[key];
  if (!taVal) {
    missingKeys.push({ key, type: 'Missing in Tamil' });
    missingTranslations++;
  } else if (taVal === enVal && /[a-zA-Z]/.test(enVal) && enVal.length > 2) {
    missingKeys.push({ key, type: 'Identical to English', value: enVal });
    missingTranslations++;
  } else {
    alreadyTranslated++;
  }
}

// 2. Scan for hardcoded strings
function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      scanFile(fullPath);
    }
  }
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relPath = path.relative(__dirname, filePath);
  
  // Exclude some common non-UI things if needed, but we want EVERYTHING user-visible.
  // JSX Text
  const jsxTextRegex = />\s*([^<\{]+?)\s*</g;
  let match;
  while ((match = jsxTextRegex.exec(content)) !== null) {
    const text = match[1].trim();
    if (/[a-zA-Z]{3,}/.test(text) && !text.includes('=>') && !text.includes('import ') && !text.startsWith('function')) {
      findings.push({ file: relPath, text, type: 'JSX Text' });
      stillEnglish++;
    }
  }

  // Properties like placeholder, label, title, alt
  const propRegex = /(placeholder|label|title|alt)=["']([^"']*[a-zA-Z]{3,}[^"']*)["']/g;
  while ((match = propRegex.exec(content)) !== null) {
    findings.push({ file: relPath, text: match[2], type: `${match[1]} prop` });
    stillEnglish++;
  }

  // Hardcoded strings in arrays or objects often used for mock/training data
  // Look for title: '...', description: '...', name: '...', text: '...'
  const objPropRegex = /(title|description|name|text|message|label):\s*["']([^"']*[a-zA-Z]{3,}[^"']*)["']/g;
  while ((match = objPropRegex.exec(content)) !== null) {
    findings.push({ file: relPath, text: match[2], type: `Object property (${match[1]})` });
    stillEnglish++;
  }
  
  // Variables explicitly set to English strings that look user-facing
  const constStrRegex = /(errorMessage|successMessage|message)\s*=\s*["']([^"']*[a-zA-Z]{3,}[^"']*)["']/g;
  while ((match = constStrRegex.exec(content)) !== null) {
    findings.push({ file: relPath, text: match[2], type: `Variable (${match[1]})` });
    stillEnglish++;
  }
}

scanDir(ROOT_DIR);

totalVisibleItems = alreadyTranslated + stillEnglish + missingTranslations;

fs.writeFileSync('audit_results.json', JSON.stringify({
  missingKeys,
  findings,
  stats: {
    totalVisibleItems,
    alreadyTranslated,
    stillEnglish,
    missingTranslations
  }
}, null, 2));

console.log('Audit complete, saved to audit_results.json');
