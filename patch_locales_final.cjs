const fs = require('fs');

const dataEn = {
  status: {
    volunteerAssigned: "Volunteer Assigned",
    volunteerAccepted: "Volunteer Accepted",
    responderDispatched: "Responder Dispatched",
    accepted: "Accepted",
    enRoute: "En Route",
    enRouteToScene: "En Route to Scene",
    arrivedAtScene: "Arrived at Scene",
    volunteerArrived: "Volunteer Arrived",
    transportingToHospital: "Transporting to Hospital",
    patientPicked: "Patient Picked",
    hospitalReached: "Hospital Reached",
    emergencyCompleted: "Emergency Completed",
    completed: "Completed",
    emergencyResolved: "Emergency Resolved",
    resolved: "Resolved",
    ambulanceEnRoute: "Ambulance En Route",
    responderOnScene: "Responder On Scene",
    dispatchingHelp: "Dispatching Help"
  },
  notifications: {
    volunteerAcceptedTitle: "A volunteer has accepted your emergency request.",
    volunteerAcceptedMsg: "A volunteer has accepted your emergency request.",
    volunteerStartedTitle: "Volunteer Started",
    volunteerStartedMsg: "The volunteer is now on the way to your location.",
    patientPickedTitle: "Patient Picked",
    patientPickedMsg: "The patient has been picked up and is being transported.",
    hospitalReachedTitle: "Hospital Reached",
    hospitalReachedMsg: "The volunteer has reached the hospital.",
    caseCompletedTitle: "Case Completed",
    caseCompletedMsg: "Your emergency case has been successfully completed."
  },
  history: {
    timeline: {
      accidentReported: "Accident Reported",
      volunteerAccepted: "Volunteer Accepted",
      volunteerArrived: "Volunteer Arrived",
      transportStarted: "Transport Started",
      hospitalReached: "Hospital Reached",
      completed: "Completed"
    }
  },
  volunteerDashboard: {
    history: {
      emptyDescription: "You haven't completed any rescue missions yet. Accepted emergency alerts will appear here."
    }
  },
  emergency: {
    responderEnRoute: "Responder is En Route to Your Location",
    responderArrivedOnScene: "Responder Has Arrived on Scene",
    safelyArrivedAtHospital: "Safely Arrived at Hospital",
    medicalTransportCompleted: "Emergency Medical Transport Completed"
  },
  common: {
    map: {
      gpsLocation: "GPS Location ({{lat}}, {{lng}})"
    }
  }
};

const dataTa = {
  status: {
    volunteerAssigned: "தன்னார்வலர் நியமிக்கப்பட்டுள்ளார்",
    volunteerAccepted: "தன்னார்வலர் ஏற்றுக்கொண்டார்",
    responderDispatched: "மீட்பர் அனுப்பப்பட்டுள்ளார்",
    accepted: "ஏற்றுக்கொள்ளப்பட்டது",
    enRoute: "வழியில்",
    enRouteToScene: "சம்பவ இடத்திற்கு வழியில்",
    arrivedAtScene: "சம்பவ இடத்தை அடைந்தார்",
    volunteerArrived: "தன்னார்வலர் வந்துவிட்டார்",
    transportingToHospital: "மருத்துவமனைக்கு கொண்டு செல்லப்படுகிறது",
    patientPicked: "நோயாளி ஏற்றப்பட்டார்",
    hospitalReached: "மருத்துவமனை சென்றடைந்தது",
    emergencyCompleted: "அவசரநிலை முடிந்தது",
    completed: "முடிந்தது",
    emergencyResolved: "அவசரநிலை தீர்க்கப்பட்டது",
    resolved: "தீர்க்கப்பட்டது",
    ambulanceEnRoute: "ஆம்புலன்ஸ் வழியில்",
    responderOnScene: "மீட்பர் சம்பவ இடத்தில்",
    dispatchingHelp: "உதவி அனுப்பப்படுகிறது"
  },
  notifications: {
    volunteerAcceptedTitle: "ஒரு தன்னார்வலர் உங்கள் அவசர கோரிக்கையை ஏற்றுக்கொண்டார்.",
    volunteerAcceptedMsg: "ஒரு தன்னார்வலர் உங்கள் அவசர கோரிக்கையை ஏற்றுக்கொண்டார்.",
    volunteerStartedTitle: "தன்னார்வலர் புறப்பட்டார்",
    volunteerStartedMsg: "தன்னார்வலர் இப்போது உங்கள் இருப்பிடத்திற்கு வந்து கொண்டிருக்கிறார்.",
    patientPickedTitle: "நோயாளி ஏற்றப்பட்டார்",
    patientPickedMsg: "நோயாளி ஏற்றப்பட்டு மருத்துவமனைக்கு கொண்டு செல்லப்படுகிறார்.",
    hospitalReachedTitle: "மருத்துவமனை சென்றடைந்தது",
    hospitalReachedMsg: "தன்னார்வலர் மருத்துவமனையை அடைந்துவிட்டார்.",
    caseCompletedTitle: "வழக்கு முடிந்தது",
    caseCompletedMsg: "உங்கள் அவசர வழக்கு வெற்றிகரமாக முடிக்கப்பட்டது."
  },
  history: {
    timeline: {
      accidentReported: "விபத்து அறிவிக்கப்பட்டது",
      volunteerAccepted: "தன்னார்வலர் ஏற்றுக்கொண்டார்",
      volunteerArrived: "தன்னார்வலர் வந்துவிட்டார்",
      transportStarted: "பயணம் தொடங்கியது",
      hospitalReached: "மருத்துவமனை சென்றடைந்தது",
      completed: "முடிந்தது"
    }
  },
  volunteerDashboard: {
    history: {
      emptyDescription: "நீங்கள் இன்னும் எந்த மீட்புப் பணிகளையும் முடிக்கவில்லை. ஏற்றுக்கொள்ளப்பட்ட அவசர அறிவிப்புகள் இங்கே தோன்றும்."
    }
  },
  emergency: {
    responderEnRoute: "மீட்பர் உங்கள் இருப்பிடத்திற்கு வந்து கொண்டிருக்கிறார்",
    responderArrivedOnScene: "மீட்பர் சம்பவ இடத்தை அடைந்துவிட்டார்",
    safelyArrivedAtHospital: "மருத்துவமனையை பாதுகாப்பாக அடைந்துவிட்டது",
    medicalTransportCompleted: "அவசர மருத்துவ போக்குவரத்து முடிந்தது"
  },
  common: {
    map: {
      gpsLocation: "GPS இருப்பிடம் ({{lat}}, {{lng}})"
    }
  }
};

const dataHi = {
  status: {
    volunteerAssigned: "स्वयंसेवक सौंपा गया",
    volunteerAccepted: "स्वयंसेवक ने स्वीकार किया",
    responderDispatched: "उत्तरदाता भेजा गया",
    accepted: "स्वीकार किया गया",
    enRoute: "रास्ते में",
    enRouteToScene: "घटनास्थल के रास्ते में",
    arrivedAtScene: "घटनास्थल पर पहुँच गए",
    volunteerArrived: "स्वयंसेवक पहुँच गया",
    transportingToHospital: "अस्पताल ले जाया जा रहा है",
    patientPicked: "मरीज को ले लिया गया",
    hospitalReached: "अस्पताल पहुँच गए",
    emergencyCompleted: "आपातकाल पूरा हुआ",
    completed: "पूरा हुआ",
    emergencyResolved: "आपातकाल हल हो गया",
    resolved: "हल हो गया",
    ambulanceEnRoute: "एम्बुलेंस रास्ते में",
    responderOnScene: "उत्तरदाता घटनास्थल पर",
    dispatchingHelp: "मदद भेजी जा रही है"
  },
  notifications: {
    volunteerAcceptedTitle: "एक स्वयंसेवक ने आपके आपातकालीन अनुरोध को स्वीकार कर लिया है।",
    volunteerAcceptedMsg: "एक स्वयंसेवक ने आपके आपातकालीन अनुरोध को स्वीकार कर लिया है।",
    volunteerStartedTitle: "स्वयंसेवक रवाना हुआ",
    volunteerStartedMsg: "स्वयंसेवक अब आपके स्थान की ओर आ रहा है।",
    patientPickedTitle: "मरीज को ले लिया गया",
    patientPickedMsg: "मरीज को ले लिया गया है और ले जाया जा रहा है।",
    hospitalReachedTitle: "अस्पताल पहुँच गए",
    hospitalReachedMsg: "स्वयंसेवक अस्पताल पहुँच गया है।",
    caseCompletedTitle: "मामला पूरा हुआ",
    caseCompletedMsg: "आपका आपातकालीन मामला सफलतापूर्वक पूरा हो गया है।"
  },
  history: {
    timeline: {
      accidentReported: "दुर्घटना की रिपोर्ट की गई",
      volunteerAccepted: "स्वयंसेवक ने स्वीकार किया",
      volunteerArrived: "स्वयंसेवक पहुँच गया",
      transportStarted: "परिवहन शुरू हुआ",
      hospitalReached: "अस्पताल पहुँच गए",
      completed: "पूरा हुआ"
    }
  },
  volunteerDashboard: {
    history: {
      emptyDescription: "आपने अभी तक कोई बचाव अभियान पूरा नहीं किया है। स्वीकृत आपातकालीन अलर्ट यहाँ दिखाई देंगे।"
    }
  },
  emergency: {
    responderEnRoute: "उत्तरदाता आपके स्थान के रास्ते में है",
    responderArrivedOnScene: "उत्तरदाता घटनास्थल पर पहुँच गया है",
    safelyArrivedAtHospital: "सुरक्षित रूप से अस्पताल पहुँच गए",
    medicalTransportCompleted: "आपातकालीन चिकित्सा परिवहन पूरा हुआ"
  },
  common: {
    map: {
      gpsLocation: "जीपीएस स्थान ({{lat}}, {{lng}})"
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

console.log("Patched final UI locales");
