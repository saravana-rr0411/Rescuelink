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
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
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
    // Skip if it contains t( or i18n
    if (line.includes('t(') || line.includes('t (') || line.includes('i18next')) return;
    
    // Check for JSX text nodes like >Text<
    const jsxTextMatch = line.match(/>([^<{}]+)</g);
    if (jsxTextMatch) {
      jsxTextMatch.forEach(m => {
        const text = m.slice(1, -1).trim();
        if (text && /[a-zA-Z]{3,}/.test(text) && !text.includes('&&') && !text.includes('||')) {
          console.log(`[JSX-TEXT] ${file}:${i+1} -> "${text}"`);
        }
      });
    }

    // Check for common string props
    const propsMatch = line.match(/(title|placeholder|label|alt)="([^"]+)"/g);
    if (propsMatch) {
      propsMatch.forEach(m => {
        console.log(`[PROP] ${file}:${i+1} -> ${m}`);
      });
    }
  });
});
