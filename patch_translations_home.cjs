const fs = require('fs');

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && key in target) {
      Object.assign(source[key], deepMerge(target[key], source[key]));
    }
  }
  Object.assign(target || {}, source);
  return target;
}

const dataEn = { status: { volunteerAssigned: "Volunteer Assigned", volunteerReached: "Volunteer Reached" } };
const dataTa = { status: { volunteerAssigned: "தன்னார்வலர் நியமிக்கப்பட்டார்", volunteerReached: "தன்னார்வலர் வந்து சேர்ந்தார்" } };
const dataHi = { status: { volunteerAssigned: "स्वयंसेवक नियुक्त किया गया", volunteerReached: "स्वयंसेवகர் पहुँच गए" } };

['en', 'ta', 'hi'].forEach(lang => {
  const filePath = `./src/locales/${lang}.json`;
  let original = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  let toAdd;
  if (lang === 'en') toAdd = dataEn;
  if (lang === 'ta') toAdd = dataTa;
  if (lang === 'hi') toAdd = dataHi;

  const merged = deepMerge(original, toAdd);
  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2) + '\n');
});

console.log("Patched translation files for home screen statuses");
