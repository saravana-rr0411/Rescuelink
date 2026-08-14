const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (/\.(tsx|ts|jsx|js)$/.test(file)) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');

const ignorePatterns = [
  /t\(/, /console\./, /import /, /export /, /classNames\(/, /className=/,
  /^\s*<\/?\w+/, /^\s*$/, /^import\s/, /eslint-disable/, /require\(/,
  /id="/, /type="/, /name="/, /value="/, /path="/, /key="/, /data-testid="/,
  /style=\{/, /url="/, /src="/, /href="/, /rel="/, /target="/, /xmlns="/,
  /viewBox="/, /d="/, /fill="/, /stroke="/, /xmlns=/, /width="/, /height="/,
  /Icon\s/, /lucide-react/, /from ['"]/, /require\(['"]/
];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, i) => {
    // Skip common non-UI lines
    if (ignorePatterns.some(p => p.test(line))) return;
    
    // Check for JSX text nodes like >Text<
    const jsxTextMatch = line.match(/>([^<{}]+)</g);
    if (jsxTextMatch) {
      jsxTextMatch.forEach(m => {
        const text = m.slice(1, -1).trim();
        // Look for at least one alphabetical character, not just symbols/spaces
        if (text && /[a-zA-Z]{3,}/.test(text) && !text.includes('&&') && !text.includes('||')) {
          console.log(`[JSX] ${file}:${i+1} -> "${text}"`);
        }
      });
    }

    // Check for common string props
    const propsMatch = line.match(/(title|placeholder|label|alt|aria-label|data-tooltip)="([^"]*[a-zA-Z]{2,}[^"]*)"/g);
    if (propsMatch) {
      propsMatch.forEach(m => {
        console.log(`[PROP] ${file}:${i+1} -> ${m}`);
      });
    }

    // Check for toast, alert, error
    const funcMatch = line.match(/(toast|alert|setError|toast\.error|toast\.success)\(\s*['"]([^'"]+[a-zA-Z]{2,}[^'"]+)['"]/g);
    if (funcMatch) {
      funcMatch.forEach(m => {
        console.log(`[FUNC] ${file}:${i+1} -> ${m}`);
      });
    }

    // Check for ternary strings in JSX
    const ternaryMatch = line.match(/\? ['"]([^'"]+[a-zA-Z]{2,}[^'"]+)['"] \: ['"]([^'"]+[a-zA-Z]{2,}[^'"]+)['"]/g);
    if (ternaryMatch) {
      ternaryMatch.forEach(m => {
        console.log(`[TERNARY] ${file}:${i+1} -> ${m}`);
      });
    }
  });
});
