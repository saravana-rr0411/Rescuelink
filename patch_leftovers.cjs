const fs = require('fs');

const dataToAddEn = {
  nav: {
    acquiringResponderLocation: "Acquiring Live Responder GPS Location...",
    calculatingRoute: "Calculating route...",
    phone: "☎ Phone:"
  },
  actionCenter: {
    back: "Back",
    closeSheet: "Close Emergency Action Center",
    dispatch: "Emergency Dispatch",
    erCenters: "ER Trauma Centers",
    cprSteps: "CPR & Trauma steps",
    sendGps: "Send GPS link",
    photoSos: "Photo SOS report",
    patrol100: "100 / 112 Patrol",
    callFire: "🚒 Call Fire Service",
    fireDesc: "Direct line to fire & rescue squads",
    yourLocation: "Your Location",
    discoveringHospitals: "Discovering Nearby Emergency Hospitals...",
    searchingRadius: "Searching facilities within 5 km radius",
    noHospitalsFound: "No hospitals found nearby.",
    tryEnablingGps: "Try enabling high-accuracy GPS or checking connection.",
    routeError: "Route error",
    call: "Call",
    phoneUnavailable: "Phone unavailable",
    navigate: "Navigate",
    currentLocation: "Current Location",
    destination: "Destination",
    distance: "Distance",
    liveEta: "Live ETA",
    arrival: "Arrival",
    activeNavigation: "Active In-App Live Navigation Route Guidance",
    cancelNavigation: "Cancel Navigation"
  },
  auth: {
    verifyingAuth: "Verifying RescueLink Authentication..."
  }
};

const dataToAddTa = {
  nav: {
    acquiringResponderLocation: "நேரடி மீட்பர் இருப்பிடத்தைப் பெறுகிறது...",
    calculatingRoute: "வழியை கணக்கிடுகிறது...",
    phone: "☎ தொலைபேசி:"
  },
  actionCenter: {
    back: "திரும்பிச் செல்",
    closeSheet: "அவசரகால செயல் மையத்தை மூடு",
    dispatch: "அவசரகால உதவிக்குழு",
    erCenters: "ER விபத்து மையங்கள்",
    cprSteps: "CPR மற்றும் முதலுதவி படிகள்",
    sendGps: "GPS இணைப்பை அனுப்பு",
    photoSos: "புகைப்பட SOS அறிக்கை",
    patrol100: "100 / 112 ரோந்து",
    callFire: "🚒 தீயணைப்பு சேவையை அழை",
    fireDesc: "தீயணைப்பு மற்றும் மீட்புக் குழுக்களுக்கான நேரடி இணைப்பு",
    yourLocation: "உங்கள் இருப்பிடம்",
    discoveringHospitals: "அருகிலுள்ள அவசரகால மருத்துவமனைகளைக் கண்டறிகிறது...",
    searchingRadius: "5 கி.மீ சுற்றளவில் தேடப்படுகிறது",
    noHospitalsFound: "அருகில் மருத்துவமனைகள் எதுவும் காணப்படவில்லை.",
    tryEnablingGps: "உயர் துல்லிய GPS ஐ இயக்கவும் அல்லது இணைப்பை சரிபார்க்கவும்.",
    routeError: "வழிப் பிழை",
    call: "அழை",
    phoneUnavailable: "தொலைபேசி கிடைக்கவில்லை",
    navigate: "வழிகாட்டு",
    currentLocation: "தற்போதைய இருப்பிடம்",
    destination: "இலக்கு",
    distance: "தூரம்",
    liveEta: "நேரடி ETA",
    arrival: "வருகை",
    activeNavigation: "செயலில் உள்ள நேரடி வழிகாட்டுதல்",
    cancelNavigation: "வழிகாட்டுதலை ரத்துசெய்"
  },
  auth: {
    verifyingAuth: "RescueLink அங்கீகாரத்தை சரிபார்க்கிறது..."
  }
};

const dataToAddHi = {
  nav: {
    acquiringResponderLocation: "लाइव उत्तरदाता GPS स्थान प्राप्त कर रहा है...",
    calculatingRoute: "मार्ग की गणना कर रहा है...",
    phone: "☎ फ़ोन:"
  },
  actionCenter: {
    back: "वापस जाएं",
    closeSheet: "आपातकालीन कार्रवाई केंद्र बंद करें",
    dispatch: "आपातकालीन प्रेषण",
    erCenters: "ER ट्रॉमा सेंटर",
    cprSteps: "CPR और ट्रॉमा कदम",
    sendGps: "GPS लिंक भेजें",
    photoSos: "फोटो SOS रिपोर्ट",
    patrol100: "100 / 112 गश्त",
    callFire: "🚒 फायर सर्विस को कॉल करें",
    fireDesc: "आग और बचाव दस्तों के लिए सीधी लाइन",
    yourLocation: "आपका स्थान",
    discoveringHospitals: "आस-पास के आपातकालीन अस्पतालों की खोज कर रहा है...",
    searchingRadius: "5 किमी के दायरे में सुविधाओं की खोज",
    noHospitalsFound: "आस-पास कोई अस्पताल नहीं मिला।",
    tryEnablingGps: "उच्च-सटीकता GPS सक्षम करने या कनेक्शन की जांच करने का प्रयास करें।",
    routeError: "मार्ग त्रुटि",
    call: "कॉल करें",
    phoneUnavailable: "फोन उपलब्ध नहीं है",
    navigate: "नेविगेट करें",
    currentLocation: "वर्तमान स्थान",
    destination: "गंतव्य",
    distance: "दूरी",
    liveEta: "लाइव ETA",
    arrival: "आगमन",
    activeNavigation: "सक्रिय इन-ऐप लाइव नेविगेशन रूट मार्गदर्शन",
    cancelNavigation: "नेविगेशन रद्द करें"
  },
  auth: {
    verifyingAuth: "RescueLink प्रमाणीकरण सत्यापित कर रहा है..."
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
  if (lang === 'en') toAdd = dataToAddEn;
  if (lang === 'ta') toAdd = dataToAddTa;
  if (lang === 'hi') toAdd = dataToAddHi;

  const merged = deepMerge(original, toAdd);
  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2) + '\n');
});

function addI18n(content) {
  if (!content.includes('useTranslation')) {
    if (content.includes("from 'react'")) {
      content = content.replace(/import ([^;]+) from 'react';/, "import $1 from 'react';\nimport { useTranslation } from 'react-i18next';");
    } else {
      content = "import { useTranslation } from 'react-i18next';\n" + content;
    }
    // inject hook
    content = content.replace(/(const \w+(?:<[^>]+>)?:\s*React\.FC(?:<[^>]+>)?\s*=\s*\([^)]*\)\s*=>\s*{)/, "$1\n  const { t } = useTranslation();");
  }
  return content;
}

const files = {
  'src/components/auth/ProtectedRoute.tsx': (c) => {
    c = addI18n(c);
    c = c.replace(/>Verifying RescueLink Authentication\.\.\.</g, ">{t('auth.verifyingAuth')}<");
    return c;
  },
  'src/components/common/GoogleMapsNavigationMode.tsx': (c) => {
    c = addI18n(c);
    c = c.replace(/>Acquiring Live Responder GPS Location\.\.\.</g, ">{t('nav.acquiringResponderLocation')}<");
    c = c.replace(/>Calculating route\.\.\.</g, ">{t('nav.calculatingRoute')}<");
    c = c.replace(/label="Back"/g, "label={t('actionCenter.back')}");
    c = c.replace(/>☎ Phone:</g, ">{t('nav.phone')}<");
    return c;
  },
  'src/components/common/EmergencyActionCenterSheet.tsx': (c) => {
    c = addI18n(c);
    c = c.replace(/label="Back"/g, "label={t('actionCenter.back')}");
    c = c.replace(/label="Close Emergency Action Center"/g, "label={t('actionCenter.closeSheet')}");
    c = c.replace(/>Emergency Dispatch</g, ">{t('actionCenter.dispatch')}<");
    c = c.replace(/>ER Trauma Centers</g, ">{t('actionCenter.erCenters')}<");
    c = c.replace(/>CPR & Trauma steps</g, ">{t('actionCenter.cprSteps')}<");
    c = c.replace(/>Send GPS link</g, ">{t('actionCenter.sendGps')}<");
    c = c.replace(/>Photo SOS report</g, ">{t('actionCenter.photoSos')}<");
    c = c.replace(/>100 \/ 112 Patrol</g, ">{t('actionCenter.patrol100')}<");
    c = c.replace(/>🚒 Call Fire Service</g, ">{t('actionCenter.callFire')}<");
    c = c.replace(/>Direct line to fire & rescue squads</g, ">{t('actionCenter.fireDesc')}<");
    c = c.replace(/>Your Location</g, ">{t('actionCenter.yourLocation')}<");
    c = c.replace(/>Discovering Nearby Emergency Hospitals\.\.\.</g, ">{t('actionCenter.discoveringHospitals')}<");
    c = c.replace(/>Searching facilities within 5 km radius</g, ">{t('actionCenter.searchingRadius')}<");
    c = c.replace(/>No hospitals found nearby\.</g, ">{t('actionCenter.noHospitalsFound')}<");
    c = c.replace(/>Try enabling high-accuracy GPS or checking connection\.</g, ">{t('actionCenter.tryEnablingGps')}<");
    c = c.replace(/>Route error</g, ">{t('actionCenter.routeError')}<");
    c = c.replace(/>Call</g, ">{t('actionCenter.call')}<");
    c = c.replace(/>Phone unavailable</g, ">{t('actionCenter.phoneUnavailable')}<");
    c = c.replace(/>Navigate</g, ">{t('actionCenter.navigate')}<");
    c = c.replace(/>Current Location</g, ">{t('actionCenter.currentLocation')}<");
    c = c.replace(/>Destination</g, ">{t('actionCenter.destination')}<");
    c = c.replace(/>Distance</g, ">{t('actionCenter.distance')}<");
    c = c.replace(/>Live ETA</g, ">{t('actionCenter.liveEta')}<");
    c = c.replace(/>Arrival</g, ">{t('actionCenter.arrival')}<");
    c = c.replace(/>Active In-App Live Navigation Route Guidance</g, ">{t('actionCenter.activeNavigation')}<");
    c = c.replace(/>Cancel Navigation</g, ">{t('actionCenter.cancelNavigation')}<");
    return c;
  },
  'src/pages/ProfileScreen.tsx': (c) => {
    c = c.replace(/placeholder="Confirm new password"/g, "placeholder={t('profile.settings.confirmPasswordPlaceholder')}");
    return c;
  }
};

for (const [path, patcher] of Object.entries(files)) {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    content = patcher(content);
    fs.writeFileSync(path, content);
  }
}
console.log("Patched leftovers successfully!");
