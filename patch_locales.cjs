const fs = require('fs');

const dataToAddEn = {
  nav: {
    zoomIn: "Zoom in map",
    zoomOut: "Zoom out map",
    recenter: "Re-center camera on volunteer",
    acquiringLocation: "Acquiring Emergency Location...",
    goBack: "Go back",
    notificationCenter: "Notification Center",
    userProfile: "User Profile",
    userAvatar: "User Avatar"
  },
  common: {
    closeSheet: "Close hospital selector sheet",
    map: {
      locationUnavailable: "Location Coordinates Unavailable",
      openStreetMap: "OpenStreetMap",
      responderLocation: "Responder Active Location",
      navigateOsm: "Navigate via OpenStreetMap"
    },
    offline: {
      noInternet: "No Internet Connection"
    }
  },
  hospital: {
    incomingEmergency: "🚨 Incoming Emergency"
  },
  emergency: {
    goldenHour: "GOLDEN HOUR",
    guidanceNotice: "Emergency Guidance Notice:"
  },
  emergencyStatus: {
    transporting: "TRANSPORTING",
    toHospital: "TO HOSPITAL",
    callAmbulance: "Call Ambulance",
    callHospital: "Call Hospital",
    enRoute: "En Route",
    reached: "Reached",
    accident: "Accident",
    viewHistory: "View History",
    sceneEvidence: "Scene Evidence",
    callVolunteer: "Call Volunteer",
    callHotline: "Call Emergency Hotline"
  },
  profile: {
    myProfile: "My Profile",
    loadingProfile: "Loading user profile...",
    tapAvatar: "Tap photo to change avatar",
    edit: "Edit",
    editProfileDetails: "Edit Profile Details",
    profilePhoto: "Profile Photo",
    uploadPhoto: "Tap to upload new photo",
    emailReadOnly: "Email Address (Read-only)",
    fullName: "Full Name",
    enterFullName: "Enter your full name",
    phoneNumber: "Phone Number",
    phonePlaceholder: "+91 98765 43210",
    bloodGroup: "Blood Group",
    bloodUniversal: "O- (Universal)",
    knownAllergies: "Known Allergies",
    allergiesPlaceholder: "e.g. Penicillin, Peanuts (or None)",
    medicalConditions: "Medical Conditions",
    conditionsPlaceholder: "e.g. Asthma, Diabetes (or None)",
    contactName: "Contact Name",
    relation: "Relation (e.g. Spouse)",
    saveChanges: "Save Changes",
    stats: {
      myStatistics: "My Statistics",
      total: "Total",
      rescues: "Rescues",
      active: "Active",
      inProgress: "In Progress",
      completed: "Completed",
      resolved: "Resolved",
      reports: "Reports",
      totalSos: "Total SOS",
      liveStatus: "Live Status"
    },
    settings: {
      newPassword: "New Password",
      passwordMin: "Min 6 characters",
      confirmPasswordPlaceholder: "Confirm new password",
      locationPrivacy: "Location Privacy",
      locationPrivacyDesc1: "Used to accurately pinpoint emergency reports",
      locationPrivacyDesc2: "Matching nearby volunteer responders to your SOS",
      locationPrivacyDesc3: "Providing real-time live navigation when active",
      locationPrivacyDesc4: "Discovering nearby trauma and stroke hospitals",
      emergencyData: "Emergency Data",
      emergencyDataDesc1: "Your medical passport is shared during emergencies",
      emergencyDataDesc2: "Volunteer coordination utilizes contact details",
      emergencyDataDesc3: "Relevant medical history is shared with receiving hospitals",
      offlineData: "Offline Data Storage",
      offlineDataDesc1: "The following data is cached locally to work without internet:",
      offlineDataDesc2: "Last known GPS coordinates",
      offlineDataDesc3: "Emergency trauma hospital directory",
      offlineDataDesc4: "Pending/queued text-based emergency reports",
      offlineDataDesc5: "Network synchronization status",
      offlineDataDesc6: "Note: Photos are never queued or stored offline.",
      accountSecuritySub: "Encrypted session management via Supabase Auth",
      accountSecuritySub2: "Password-protected profile editing",
      accountSecuritySub3: "Secure sign-out capability"
    },
    history: {
      accidentHistory: "Accident History",
      noHistory: "No accident history yet.",
      responseDuration: "Response Duration"
    },
    historyDetails: {
      detailsTitle: "Accident History Details",
      recordNotFound: "Record Not Found",
      volunteerDetails: "Volunteer Responder Details",
      hospitalDetails: "Hospital Destination Details",
      timeline: "Incident Response Timeline"
    }
  },
  notifications: {
    title: "Notification Center",
    markAllRead: "Mark all notifications as read",
    markAllReadBtn: "Mark all read",
    enableAlerts: "Enable Desktop & System Alerts",
    loading: "Loading notifications...",
    empty: "No notifications added"
  },
  reportAccident: {
    scenePreview: "Incident Scene Preview",
    removeImage: "Remove image"
  },
  auth: {
    signup: {
      createAccount: "Create Account",
      setupPassport: "Set up your Emergency Passport & Supabase Auth",
      personalInfo: "Personal Information",
      mobileNumber: "Mobile Number",
      passwordDesc: "At least 6 characters",
      primaryContact: "Primary Emergency Contact",
      autodialedOnSos: "Autodialed on SOS",
      relationship: "Relationship (e.g. Parent)",
      creatingAccount: "Creating Account & Profile...",
      completeRegistration: "Complete Registration"
    }
  },
  volunteerDashboard: {
    history: {
      viewHistory: "View Volunteer History",
      missionHistory: "Volunteer Mission History",
      noHistory: "No rescue history yet.",
      rescueTime: "Rescue Time",
      viewRecord: "View Mission Record",
      sceneEvidence: "Scene Evidence",
      accidentEvidence: "Accident Evidence"
    },
    mapPreview: {
      loadingPreview: "Loading Accident Map Preview...",
      incidentNotFound: "Incident Not Found",
      alertResolved: "This accident alert may have been resolved or canceled.",
      backToDashboard: "Back to dashboard",
      routePreview: "Route Preview Available",
      acceptingMission: "Accepting Mission...",
      acceptMissionConfirm: "ACCEPT ACCIDENT MISSION"
    }
  }
};

const dataToAddTa = {
  nav: {
    zoomIn: "வரைபடத்தை பெரிதாக்கு",
    zoomOut: "வரைபடத்தை சிறிதாக்கு",
    recenter: "தன்னார்வலர் மீது கேமராவை மையப்படுத்து",
    acquiringLocation: "அவசரகால இருப்பிடத்தைப் பெறுகிறது...",
    goBack: "திரும்பிச் செல்",
    notificationCenter: "அறிவிப்பு மையம்",
    userProfile: "பயனர் சுயவிவரம்",
    userAvatar: "பயனர் புகைப்படம்"
  },
  common: {
    closeSheet: "மருத்துவமனை தேர்வியை மூடு",
    map: {
      locationUnavailable: "இருப்பிட ஆயத்தொலைவுகள் கிடைக்கவில்லை",
      openStreetMap: "OpenStreetMap",
      responderLocation: "மீட்பரின் நேரடி இருப்பிடம்",
      navigateOsm: "OpenStreetMap மூலம் வழிகாட்டு"
    },
    offline: {
      noInternet: "இணைய இணைப்பு இல்லை"
    }
  },
  hospital: {
    incomingEmergency: "🚨 உள்வரும் அவசரநிலை"
  },
  emergency: {
    goldenHour: "கோல்டன் ஹவர் (பொன்னான நேரம்)",
    guidanceNotice: "அவசரகால வழிகாட்டுதல் குறிப்பு:"
  },
  emergencyStatus: {
    transporting: "கொண்டு செல்லப்படுகிறது",
    toHospital: "மருத்துவமனைக்கு",
    callAmbulance: "ஆம்புலன்ஸை அழை",
    callHospital: "மருத்துவமனையை அழை",
    enRoute: "வழியில்",
    reached: "அடைந்தது",
    accident: "விபத்து",
    viewHistory: "வரலாற்றைக் காண்க",
    sceneEvidence: "சம்பவ இடத்தின் சான்று",
    callVolunteer: "தன்னார்வலரை அழை",
    callHotline: "அவசர உதவி எண்ணை அழை"
  },
  profile: {
    myProfile: "என் சுயவிவரம்",
    loadingProfile: "பயனர் சுயவிவரத்தை ஏற்றுகிறது...",
    tapAvatar: "புகைப்படத்தை மாற்ற தட்டவும்",
    edit: "திருத்து",
    editProfileDetails: "சுயவிவர விவரங்களைத் திருத்து",
    profilePhoto: "சுயவிவரப் படம்",
    uploadPhoto: "புதிய புகைப்படத்தைப் பதிவேற்ற தட்டவும்",
    emailReadOnly: "மின்னஞ்சல் முகவரி (வாசிக்க மட்டும்)",
    fullName: "முழு பெயர்",
    enterFullName: "உங்கள் முழுப் பெயரை உள்ளிடவும்",
    phoneNumber: "தொலைபேசி எண்",
    phonePlaceholder: "+91 98765 43210",
    bloodGroup: "இரத்த வகை",
    bloodUniversal: "O- (யுனிவர்சல்)",
    knownAllergies: "அறியப்பட்ட ஒவ்வாமைகள்",
    allergiesPlaceholder: "எ.கா. பென்சிலின், வேர்க்கடலை (அல்லது இல்லை)",
    medicalConditions: "மருத்துவ நிலைமைகள்",
    conditionsPlaceholder: "எ.கா. ஆஸ்துமா, நீரிழிவு (அல்லது இல்லை)",
    contactName: "தொடர்பு பெயர்",
    relation: "உறவு (எ.கா. துணைவர்)",
    saveChanges: "மாற்றங்களை சேமி",
    stats: {
      myStatistics: "என் புள்ளிவிவரங்கள்",
      total: "மொத்தம்",
      rescues: "மீட்புகள்",
      active: "செயலில்",
      inProgress: "நடைபெறுகிறது",
      completed: "முடிந்தது",
      resolved: "தீர்க்கப்பட்டது",
      reports: "புகார்கள்",
      totalSos: "மொத்த SOS",
      liveStatus: "நேரடி நிலை"
    },
    settings: {
      newPassword: "புதிய கடவுச்சொல்",
      passwordMin: "குறைந்தபட்சம் 6 எழுத்துகள்",
      confirmPasswordPlaceholder: "புதிய கடவுச்சொல்லை உறுதிப்படுத்தவும்",
      locationPrivacy: "இருப்பிட தனியுரிமை",
      locationPrivacyDesc1: "அவசரகால அறிக்கைகளைத் துல்லியமாகக் குறிக்கப் பயன்படுகிறது",
      locationPrivacyDesc2: "உங்கள் SOS-க்கு அருகிலுள்ள தன்னார்வலர்களைப் பொருத்துகிறது",
      locationPrivacyDesc3: "செயலில் இருக்கும்போது நேரடி வழிகாட்டுதலை வழங்குகிறது",
      locationPrivacyDesc4: "அருகிலுள்ள காயம் மற்றும் பக்கவாத மருத்துவமனைகளைக் கண்டறிகிறது",
      emergencyData: "அவசரகால தரவு",
      emergencyDataDesc1: "அவசர காலங்களில் உங்கள் மருத்துவ பாஸ்போர்ட் பகிரப்படுகிறது",
      emergencyDataDesc2: "தன்னார்வலர் ஒருங்கிணைப்பு தொடர்பு விவரங்களைப் பயன்படுத்துகிறது",
      emergencyDataDesc3: "தொடர்புடைய மருத்துவ வரலாறு மருத்துவமனைகளுடன் பகிரப்படுகிறது",
      offlineData: "ஆஃப்லைன் தரவு சேமிப்பு",
      offlineDataDesc1: "இணையம் இல்லாமல் செயல்பட பின்வரும் தரவு சேமிக்கப்படுகிறது:",
      offlineDataDesc2: "கடைசியாக அறியப்பட்ட GPS ஆயத்தொலைவுகள்",
      offlineDataDesc3: "அவசர சிகிச்சை மருத்துவமனை பட்டியல்",
      offlineDataDesc4: "நிலுவையில் உள்ள உரை அடிப்படையிலான அவசரகால அறிக்கைகள்",
      offlineDataDesc5: "நெட்வொர்க் ஒத்திசைவு நிலை",
      offlineDataDesc6: "குறிப்பு: புகைப்படங்கள் ஒருபோதும் ஆஃப்லைனில் சேமிக்கப்படாது.",
      accountSecuritySub: "Supabase Auth மூலம் குறியாக்கம் செய்யப்பட்ட அமர்வு நிர்வாகம்",
      accountSecuritySub2: "கடவுச்சொல் பாதுகாக்கப்பட்ட சுயவிவரத் திருத்தம்",
      accountSecuritySub3: "பாதுகாப்பான வெளியேறும் திறன்"
    },
    history: {
      accidentHistory: "விபத்து வரலாறு",
      noHistory: "இதுவரை விபத்து வரலாறு இல்லை.",
      responseDuration: "பதிலளிக்கும் காலம்"
    },
    historyDetails: {
      detailsTitle: "விபத்து வரலாறு விவரங்கள்",
      recordNotFound: "பதிவு கிடைக்கவில்லை",
      volunteerDetails: "தன்னார்வல மீட்பர் விவரங்கள்",
      hospitalDetails: "மருத்துவமனை இலக்கு விவரங்கள்",
      timeline: "நிகழ்வு மறுமொழி காலவரிசை"
    }
  },
  notifications: {
    title: "அறிவிப்பு மையம்",
    markAllRead: "அனைத்து அறிவிப்புகளையும் படித்ததாகக் குறிக்கவும்",
    markAllReadBtn: "அனைத்தையும் படித்ததாகக் குறி",
    enableAlerts: "டெஸ்க்டாப் & சிஸ்டம் விழிப்பூட்டல்களை இயக்கு",
    loading: "அறிவிப்புகளை ஏற்றுகிறது...",
    empty: "அறிவிப்புகள் சேர்க்கப்படவில்லை"
  },
  reportAccident: {
    scenePreview: "நிகழ்வு இடத்தின் முன்னோட்டம்",
    removeImage: "படத்தை அகற்று"
  },
  auth: {
    signup: {
      createAccount: "கணக்கை உருவாக்கு",
      setupPassport: "உங்கள் அவசரகால பாஸ்போர்ட் & Supabase Auth-ஐ அமைக்கவும்",
      personalInfo: "தனிப்பட்ட தகவல்",
      mobileNumber: "கைபேசி எண்",
      passwordDesc: "குறைந்தபட்சம் 6 எழுத்துகள்",
      primaryContact: "முதன்மை அவசரகால தொடர்பு",
      autodialedOnSos: "SOS-இல் தானாக டயல் செய்யப்படும்",
      relationship: "உறவு (எ.கா. பெற்றோர்)",
      creatingAccount: "கணக்கு மற்றும் சுயவிவரத்தை உருவாக்குகிறது...",
      completeRegistration: "பதிவை முடிக்கவும்"
    }
  },
  volunteerDashboard: {
    history: {
      viewHistory: "தன்னார்வலர் வரலாற்றைக் காண்க",
      missionHistory: "தன்னார்வலர் பணி வரலாறு",
      noHistory: "இதுவரை மீட்பு வரலாறு இல்லை.",
      rescueTime: "மீட்பு நேரம்",
      viewRecord: "பணிப் பதிவைக் காண்க",
      sceneEvidence: "சம்பவ இடத்தின் சான்று",
      accidentEvidence: "விபத்து சான்று"
    },
    mapPreview: {
      loadingPreview: "விபத்து வரைபட முன்னோட்டத்தை ஏற்றுகிறது...",
      incidentNotFound: "நிகழ்வு கிடைக்கவில்லை",
      alertResolved: "இந்த விபத்து எச்சரிக்கை தீர்க்கப்பட்டிருக்கலாம் அல்லது ரத்து செய்யப்பட்டிருக்கலாம்.",
      backToDashboard: "டாஷ்போர்டுக்குத் திரும்பு",
      routePreview: "பாதை முன்னோட்டம் கிடைக்கிறது",
      acceptingMission: "பணியை ஏற்கிறது...",
      acceptMissionConfirm: "விபத்து பணியை ஏற்கவும்"
    }
  }
};

const dataToAddHi = {
  nav: {
    zoomIn: "मैप ज़ूम इन करें",
    zoomOut: "मैप ज़ूम आउट करें",
    recenter: "कैमरे को स्वयंसेवक पर फिर से केंद्रित करें",
    acquiringLocation: "आपातकालीन स्थान प्राप्त कर रहा है...",
    goBack: "वापस जाएं",
    notificationCenter: "सूचना केंद्र",
    userProfile: "उपयोगकर्ता प्रोफ़ाइल",
    userAvatar: "उपयोगकर्ता अवतार"
  },
  common: {
    closeSheet: "अस्पताल चयनकर्ता शीट बंद करें",
    map: {
      locationUnavailable: "स्थान निर्देशांक उपलब्ध नहीं हैं",
      openStreetMap: "OpenStreetMap",
      responderLocation: "उत्तरदाता का लाइव स्थान",
      navigateOsm: "OpenStreetMap के माध्यम से नेविगेट करें"
    },
    offline: {
      noInternet: "कोई इंटरनेट कनेक्शन नहीं"
    }
  },
  hospital: {
    incomingEmergency: "🚨 आने वाली आपातकालीन स्थिति"
  },
  emergency: {
    goldenHour: "गोल्डन आवर (सुनहरा घंटा)",
    guidanceNotice: "आपातकालीन मार्गदर्शन सूचना:"
  },
  emergencyStatus: {
    transporting: "ले जाया जा रहा है",
    toHospital: "अस्पताल की ओर",
    callAmbulance: "एम्बुलेंस को कॉल करें",
    callHospital: "अस्पताल को कॉल करें",
    enRoute: "रास्ते में",
    reached: "पहुंच गए",
    accident: "दुर्घटना",
    viewHistory: "इतिहास देखें",
    sceneEvidence: "घटनास्थल का साक्ष्य",
    callVolunteer: "स्वयंसेवक को कॉल करें",
    callHotline: "आपातकालीन हेल्पलाइन को कॉल करें"
  },
  profile: {
    myProfile: "मेरी प्रोफ़ाइल",
    loadingProfile: "उपयोगकर्ता प्रोफ़ाइल लोड हो रही है...",
    tapAvatar: "अवतार बदलने के लिए फ़ोटो टैप करें",
    edit: "संपादित करें",
    editProfileDetails: "प्रोफ़ाइल विवरण संपादित करें",
    profilePhoto: "प्रोफ़ाइल फ़ोटो",
    uploadPhoto: "नई फ़ोटो अपलोड करने के लिए टैप करें",
    emailReadOnly: "ईमेल पता (केवल पढ़ने के लिए)",
    fullName: "पूरा नाम",
    enterFullName: "अपना पूरा नाम दर्ज करें",
    phoneNumber: "फ़ोन नंबर",
    phonePlaceholder: "+91 98765 43210",
    bloodGroup: "रक्त समूह",
    bloodUniversal: "O- (यूनिवर्सल)",
    knownAllergies: "ज्ञात एलर्जी",
    allergiesPlaceholder: "उदा. पेनिसिलिन, मूंगफली (या कोई नहीं)",
    medicalConditions: "चिकित्सीय स्थितियाँ",
    conditionsPlaceholder: "उदा. अस्थमा, मधुमेह (या कोई नहीं)",
    contactName: "संपर्क नाम",
    relation: "संबंध (उदा. जीवनसाथी)",
    saveChanges: "परिवर्तन सहेजें",
    stats: {
      myStatistics: "मेरे आँकड़े",
      total: "कुल",
      rescues: "बचाव",
      active: "सक्रिय",
      inProgress: "प्रगति पर",
      completed: "पूरा हुआ",
      resolved: "सुलझ गया",
      reports: "रिपोर्ट",
      totalSos: "कुल SOS",
      liveStatus: "लाइव स्थिति"
    },
    settings: {
      newPassword: "नया पासवर्ड",
      passwordMin: "न्यूनतम 6 अक्षर",
      confirmPasswordPlaceholder: "नए पासवर्ड की पुष्टि करें",
      locationPrivacy: "स्थान गोपनीयता",
      locationPrivacyDesc1: "आपातकालीन रिपोर्ट को सटीक रूप से इंगित करने के लिए उपयोग किया जाता है",
      locationPrivacyDesc2: "आपके SOS से आस-पास के स्वयंसेवकों का मिलान",
      locationPrivacyDesc3: "सक्रिय होने पर रीयल-टाइम लाइव नेविगेशन प्रदान करना",
      locationPrivacyDesc4: "आस-पास के ट्रॉमा और स्ट्रोक अस्पतालों की खोज करना",
      emergencyData: "आपातकालीन डेटा",
      emergencyDataDesc1: "आपका मेडिकल पासपोर्ट आपात स्थिति के दौरान साझा किया जाता है",
      emergencyDataDesc2: "स्वयंसेवक समन्वय संपर्क विवरण का उपयोग करता है",
      emergencyDataDesc3: "प्रासंगिक चिकित्सा इतिहास प्राप्तकर्ता अस्पतालों के साथ साझा किया जाता है",
      offlineData: "ऑफ़लाइन डेटा संग्रहण",
      offlineDataDesc1: "बिना इंटरनेट के काम करने के लिए निम्नलिखित डेटा स्थानीय रूप से सहेजा गया है:",
      offlineDataDesc2: "अंतिम ज्ञात GPS निर्देशांक",
      offlineDataDesc3: "आपातकालीन ट्रॉमा अस्पताल निर्देशिका",
      offlineDataDesc4: "लंबित/कतारबद्ध पाठ-आधारित आपातकालीन रिपोर्ट",
      offlineDataDesc5: "नेटवर्क सिंक्रनाइज़ेशन स्थिति",
      offlineDataDesc6: "नोट: फ़ोटो कभी भी कतारबद्ध या ऑफ़लाइन संग्रहीत नहीं किए जाते हैं।",
      accountSecuritySub: "Supabase Auth के माध्यम से एन्क्रिप्टेड सत्र प्रबंधन",
      accountSecuritySub2: "पासवर्ड-संरक्षित प्रोफ़ाइल संपादन",
      accountSecuritySub3: "सुरक्षित साइन-आउट क्षमता"
    },
    history: {
      accidentHistory: "दुर्घटना का इतिहास",
      noHistory: "अभी तक कोई दुर्घटना इतिहास नहीं।",
      responseDuration: "प्रतिक्रिया अवधि"
    },
    historyDetails: {
      detailsTitle: "दुर्घटना इतिहास विवरण",
      recordNotFound: "रिकॉर्ड नहीं मिला",
      volunteerDetails: "स्वयंसेवक उत्तरदाता विवरण",
      hospitalDetails: "अस्पताल गंतव्य विवरण",
      timeline: "घटना प्रतिक्रिया समयरेखा"
    }
  },
  notifications: {
    title: "सूचना केंद्र",
    markAllRead: "सभी सूचनाओं को पढ़ा हुआ चिह्नित करें",
    markAllReadBtn: "सभी को पढ़ा हुआ चिह्नित करें",
    enableAlerts: "डेस्कटॉप और सिस्टम अलर्ट सक्षम करें",
    loading: "सूचनाएं लोड हो रही हैं...",
    empty: "कोई सूचना नहीं जोड़ी गई"
  },
  reportAccident: {
    scenePreview: "घटनास्थल का पूर्वावलोकन",
    removeImage: "छवि हटाएं"
  },
  auth: {
    signup: {
      createAccount: "खाता बनाएं",
      setupPassport: "अपना आपातकालीन पासपोर्ट और Supabase Auth सेट करें",
      personalInfo: "व्यक्तिगत जानकारी",
      mobileNumber: "मोबाइल नंबर",
      passwordDesc: "कम से कम 6 अक्षर",
      primaryContact: "प्राथमिक आपातकालीन संपर्क",
      autodialedOnSos: "SOS पर ऑटो-डायल",
      relationship: "रिश्ता (उदा. माता-पिता)",
      creatingAccount: "खाता और प्रोफ़ाइल बना रहा है...",
      completeRegistration: "पंजीकरण पूरा करें"
    }
  },
  volunteerDashboard: {
    history: {
      viewHistory: "स्वयंसेवक इतिहास देखें",
      missionHistory: "स्वयंसेवक मिशन इतिहास",
      noHistory: "अभी तक कोई बचाव इतिहास नहीं।",
      rescueTime: "बचाव का समय",
      viewRecord: "मिशन रिकॉर्ड देखें",
      sceneEvidence: "घटनास्थल का साक्ष्य",
      accidentEvidence: "दुर्घटना का साक्ष्य"
    },
    mapPreview: {
      loadingPreview: "दुर्घटना मानचित्र पूर्वावलोकन लोड हो रहा है...",
      incidentNotFound: "घटना नहीं मिली",
      alertResolved: "यह दुर्घटना चेतावनी हल हो गई होगी या रद्द कर दी गई होगी।",
      backToDashboard: "डैशबोर्ड पर वापस जाएं",
      routePreview: "मार्ग पूर्वावलोकन उपलब्ध है",
      acceptingMission: "मिशन स्वीकार कर रहा है...",
      acceptMissionConfirm: "दुर्घटना मिशन स्वीकार करें"
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
  if (lang === 'en') toAdd = dataToAddEn;
  if (lang === 'ta') toAdd = dataToAddTa;
  if (lang === 'hi') toAdd = dataToAddHi;

  const merged = deepMerge(original, toAdd);
  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2) + '\n');
});
console.log("JSON locales patched successfully!");
