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

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, i) => {
    // We are looking for rendered internal variables and explicit english strings 
    // that might have been missed.
    
    // 1. Direct status rendering inside JSX
    if (line.match(/>\s*\{[^}]*(status|state)[^}]*\}\s*</i)) {
      console.log(`[STATUS RENDER] ${file}:${i+1} -> ${line.trim()}`);
    }
    
    // 2. Direct address rendering inside JSX (often labeled with "Address:" or similar)
    if (line.match(/Address/i) && !line.match(/t\(/) && !line.match(/className/) && !line.match(/console/) && !line.match(/interface/) && !line.match(/type /)) {
      console.log(`[ADDRESS LABEL] ${file}:${i+1} -> ${line.trim()}`);
    }

    // 3. Status strings in arrays or objects mapped to UI
    if (line.match(/(Reached|Arrived|En Route|Accepted|Completed)/i) && !line.match(/t\(/) && !line.match(/console/) && !line.match(/className/)) {
      console.log(`[KEYWORD] ${file}:${i+1} -> ${line.trim()}`);
    }

    // 4. Any other hardcoded JSX text that might have been missed by previous regex
    const jsxTextMatch = line.match(/>([^<{}]+)</g);
    if (jsxTextMatch) {
      jsxTextMatch.forEach(m => {
        const text = m.slice(1, -1).trim();
        if (text && /[a-zA-Z]{2,}/.test(text) && !text.includes('&&') && !text.includes('||') && !text.match(/^[A-Z0-9\s_\-\.\:]+$/)) { // Exclude purely uppercase/symbols which might be technical
           // Exclude known safe/medical/legal strings to reduce noise, or just print them all
           // Let's print all lowercase/mixed case to see
           console.log(`[MIXED JSX] ${file}:${i+1} -> "${text}"`);
        }
      });
    }
  });
});
