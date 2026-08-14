const fs = require('fs');

const dataEn = {
  nav: {
    hospitalNavigation: "🏥 Hospital Navigation",
    liveSceneNavigation: "🚨 Live Scene Navigation",
    modeOn: "Navigation Mode ON",
    modeOff: "Navigation Mode OFF"
  },
  emergency: {
    collapseGuide: "Collapse Golden Hour Guide",
    expandGuide: "Expand Golden Hour Guide"
  },
  profile: {
    volunteerResponder: "Volunteer Responder",
    citizenResponder: "Citizen Responder",
    editAdd: "+ Edit",
    addOption: "+ Add"
  },
  auth: {
    signup: {
      errorInvalidEmail: "Please provide a valid email and password.",
      errorPasswordShort: "Password must be at least 6 characters long."
    }
  }
};

const dataTa = {
  nav: {
    hospitalNavigation: "🏥 மருத்துவமனை வழிகாட்டி",
    liveSceneNavigation: "🚨 நேரடி விபத்து இட வழிகாட்டி",
    modeOn: "வழிகாட்டி பயன்முறை ஆன்",
    modeOff: "வழிகாட்டி பயன்முறை ஆஃப்"
  },
  emergency: {
    collapseGuide: "தங்க நேர வழிகாட்டியைச் சுருக்கு",
    expandGuide: "தங்க நேர வழிகாட்டியை விரிவுபடுத்து"
  },
  profile: {
    volunteerResponder: "தன்னார்வ மீட்பர்",
    citizenResponder: "குடிமக்கள் மீட்பர்",
    editAdd: "+ திருத்து",
    addOption: "+ சேர்"
  },
  auth: {
    signup: {
      errorInvalidEmail: "சரியான மின்னஞ்சல் மற்றும் கடவுச்சொல்லை வழங்கவும்.",
      errorPasswordShort: "கடவுச்சொல் குறைந்தது 6 எழுத்துகள் கொண்டிருக்க வேண்டும்."
    }
  }
};

const dataHi = {
  nav: {
    hospitalNavigation: "🏥 अस्पताल नेविगेशन",
    liveSceneNavigation: "🚨 लाइव दृश्य नेविगेशन",
    modeOn: "नेविगेशन मोड ऑन",
    modeOff: "नेविगेशन मोड ऑफ"
  },
  emergency: {
    collapseGuide: "गोल्डन आवर गाइड को छोटा करें",
    expandGuide: "गोल्डन आवर गाइड का विस्तार करें"
  },
  profile: {
    volunteerResponder: "स्वयंसेवक उत्तरदाता",
    citizenResponder: "नागरिक उत्तरदाता",
    editAdd: "+ संपादित करें",
    addOption: "+ जोड़ें"
  },
  auth: {
    signup: {
      errorInvalidEmail: "कृपया एक मान्य ईमेल और पासवर्ड प्रदान करें।",
      errorPasswordShort: "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।"
    }
  }
};

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && key in target) {
      Object.assign(source[key], deepMerge(target[key], source[key]));
    }
  }
  Object.assign(target || {}, source);
  return target;
}

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

console.log("Patched final locales");
