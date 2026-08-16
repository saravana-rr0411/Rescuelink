export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  bloodType: string;
  allergies: string[];
  medicalConditions: string[];
  emergencyContacts: { name: string; relation: string; phone: string }[];
  isVolunteer: boolean;
  volunteerBadge: string;
  responseRadiusKm: number;
}

export interface EmergencyIncident {
  id: string;
  type: 'medical' | 'accident' | 'fire' | 'crime' | 'hazard';
  title: string;
  location: string;
  distance: string;
  timeAgo: string;
  status: 'DISPATCHED' | 'EN_ROUTE' | 'ON_SCENE' | 'RESOLVED';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  description: string;
  respondersAssigned: number;
  etaMinutes: number;
  reporterName: string;
}

export interface FirstAidItem {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  readTime: string;
  urgency: 'HIGH' | 'CRITICAL' | 'STANDARD';
  steps: string[];
  dos: string[];
  donts: string[];
  warnings: string[];
  icon: string;
  videoId?: string;
}

export interface GoodSamaritanRight {
  id: string;
  title: string;
  actSection: string;
  summary: string;
  details: string[];
  badge: string;
}

export const mockUserProfile: UserProfile = {
  id: 'usr-90821',
  name: 'Alex Johnson',
  phone: '+1 (555) 382-9102',
  email: 'alex.johnson@rescuelink.org',
  bloodType: 'O-Negative (Universal)',
  allergies: ['Penicillin', 'Peanuts'],
  medicalConditions: ['Asthma (Mild)'],
  emergencyContacts: [
    { name: 'Sarah Johnson', relation: 'Spouse', phone: '+1 (555) 492-1049' },
    { name: 'Dr. Robert Chen', relation: 'Primary Care Physician', phone: '+1 (555) 839-2041' }
  ],
  isVolunteer: true,
  volunteerBadge: 'Certified First Responder Level II',
  responseRadiusKm: 5,
};

export const mockActiveIncidents: EmergencyIncident[] = [
  {
    id: 'inc-101',
    type: 'accident',
    title: 'Vehicle Collision near 5th Ave & Pine St',
    location: '5th Ave & Pine St, Sector 4',
    distance: '0.8 km away',
    timeAgo: '3 mins ago',
    status: 'EN_ROUTE',
    severity: 'CRITICAL',
    description: 'Two vehicles involved. Paramedic unit and local community volunteers dispatched.',
    respondersAssigned: 3,
    etaMinutes: 4,
    reporterName: 'David Miller'
  },
  {
    id: 'inc-102',
    type: 'medical',
    title: 'Cardiac Distress Reported',
    location: 'Central Plaza, West Wing',
    distance: '1.4 km away',
    timeAgo: '8 mins ago',
    status: 'ON_SCENE',
    severity: 'CRITICAL',
    description: 'AED kit retrieved by nearby volunteer. Ambulance on site.',
    respondersAssigned: 2,
    etaMinutes: 0,
    reporterName: 'Elena Rostova'
  },
  {
    id: 'inc-103',
    type: 'fire',
    title: 'Kitchen Fire - Residential Unit',
    location: 'Maple Wood Apartments, Block B',
    distance: '2.1 km away',
    timeAgo: '15 mins ago',
    status: 'DISPATCHED',
    severity: 'HIGH',
    description: 'Smoke reported on 3rd floor. Fire brigade en route.',
    respondersAssigned: 4,
    etaMinutes: 7,
    reporterName: 'Marcus Vance'
  }
];

export const mockFirstAidGuides: FirstAidItem[] = [
  {
    id: 'fa-1',
    category: 'bleeding',
    title: 'Severe Bleeding',
    subtitle: 'Pressure application and tourniquet protocol',
    readTime: '3 min guide',
    urgency: 'CRITICAL',
    icon: 'Droplet',
    videoId: 'NxO5LvgqZe0',
    steps: [
      'Call emergency services / RescueLink SOS immediately.',
      'Apply direct, firm pressure over the wound using clean cloth or sterile gauze.',
      'Keep continuous pressure for at least 10 minutes without lifting cloth.',
      'Elevate bleeding limb above heart level if no fracture is suspected.',
      'Apply a tourniquet 2-3 inches above wound if arterial bleeding continues.'
    ],
    dos: [
      'Keep victim calm and flat on back.',
      'Add extra gauze layers on top if blood soaks through.',
      'Note exact time if a tourniquet is applied.'
    ],
    donts: [
      'Do not remove embedded objects from deep wounds.',
      'Do not lift cloth to check if bleeding stopped.',
      'Do not loosen a tourniquet once applied.'
    ],
    warnings: [
      'Arterial bleeding can be fatal within minutes—apply firm pressure immediately.',
      'Never remove tourniquet once placed by non-medical personnel.'
    ]
  },
  {
    id: 'fa-2',
    category: 'heart_attack',
    title: 'Heart Attack',
    subtitle: 'Immediate cardiovascular emergency response',
    readTime: '2 min guide',
    urgency: 'CRITICAL',
    icon: 'HeartPulse',
    videoId: 'gDwt7dD3awc',
    steps: [
      'Call emergency services / RescueLink SOS immediately.',
      'Have person sit down, rest, and remain calm.',
      'Loosen tight clothing around neck and chest.',
      'Assist victim with prescribed angina medication (like Nitroglycerin) if available.',
      'Give 325mg uncoated Aspirin to chew if not allergic and conscious.',
      'Prepare to perform CPR or use an AED if person becomes unresponsive.'
    ],
    dos: [
      'Keep person seated upright in a comfortable resting position.',
      'Stay with victim and monitor breathing continuously.',
      'Fetch a nearby AED kit if available.'
    ],
    donts: [
      'Do not leave victim unattended.',
      'Do not give Aspirin if victim is unconscious or allergic.',
      'Do not allow victim to walk or exert themselves.'
    ],
    warnings: [
      'Chest pain spreading to jaw or arm requires immediate 112 dispatch.',
      'Be ready to initiate CPR if cardiac arrest occurs.'
    ]
  },
  {
    id: 'fa-3',
    category: 'stroke',
    title: 'Stroke',
    subtitle: 'FAST assessment and rapid brain protection',
    readTime: '2 min guide',
    urgency: 'CRITICAL',
    icon: 'Brain',
    videoId: 'PhH9a0kIwmk',
    steps: [
      'Call emergency services / RescueLink SOS immediately.',
      'Perform FAST check: Face drooping, Arm weakness, Speech difficulty, Time to call.',
      'Note exact time when symptoms first appeared.',
      'Help person lie down on side with head slightly elevated.',
      'Keep airway clear and reassure victim while awaiting paramedics.'
    ],
    dos: [
      'Note exact time of symptom onset for hospital treatment decisions.',
      'Position victim on side (recovery position) if vomiting occurs.',
      'Keep victim calm and warm.'
    ],
    donts: [
      'Do not give anything to eat or drink (choking risk).',
      'Do not administer Aspirin or any blood thinners.',
      'Do not allow victim to sleep or drive.'
    ],
    warnings: [
      'Time loss is brain loss—every minute matters during acute stroke.',
      'Never give water or food to a stroke victim.'
    ]
  },
  {
    id: 'fa-4',
    category: 'fracture',
    title: 'Bone Fracture',
    subtitle: 'Immobilization and limb stabilization',
    readTime: '3 min guide',
    urgency: 'HIGH',
    icon: 'Bone',
    videoId: '2v8vlXgGXwE',
    steps: [
      'Stop any severe bleeding by applying gentle pressure around wound.',
      'Immobilize injured area using splint or padded rigid support above and below joint.',
      'Apply ice packs wrapped in cloth to reduce swelling and pain.',
      'Support injured limb in comfortable elevated position.',
      'Treat for shock by keeping victim warm and lying flat.'
    ],
    dos: [
      'Support fracture in position found.',
      'Wrap ice in cloth before applying to skin.',
      'Check pulse and sensation below injury site.'
    ],
    donts: [
      'Do not attempt to realign or push back protruding bones.',
      'Do not test limb by trying to move or walk on it.',
      'Do not apply ice directly onto bare skin.'
    ],
    warnings: [
      'Compound fractures with broken skin carry high risk of severe infection.',
      'Avoid moving joints above or below the suspected fracture.'
    ]
  },
  {
    id: 'fa-5',
    category: 'burns',
    title: 'Burn Injuries',
    subtitle: 'Cooling techniques and thermal injury management',
    readTime: '2 min guide',
    urgency: 'HIGH',
    icon: 'Flame',
    videoId: 'TLr2qsEhpC8',
    steps: [
      'Remove victim from heat source and ensure personal safety.',
      'Cool burn immediately under clean running tap water for 10-20 minutes.',
      'Remove jewelry or tight items before area swells.',
      'Cover burn loosely with sterile non-stick bandage or clean cling film.',
      'Keep victim warm with dry blanket to prevent hypothermia.'
    ],
    dos: [
      'Use cool running water (not freezing water or ice).',
      'Cover burn loosely to protect from contamination.',
      'Seek immediate medical care for facial, hand, or major burns.'
    ],
    donts: [
      'Do not apply ice, butter, oil, toothpaste, or ointments to open burns.',
      'Do not break intact blisters.',
      'Do not pull away clothing stuck to burned skin.'
    ],
    warnings: [
      'Ice can cause secondary tissue damage (frostbite).',
      'Chemical or electrical burns require immediate emergency transport.'
    ]
  },
  {
    id: 'fa-6',
    category: 'electric_shock',
    title: 'Electric Shock',
    subtitle: 'Power disconnection and electrical trauma management',
    readTime: '3 min guide',
    urgency: 'CRITICAL',
    icon: 'Zap',
    videoId: 'Qld84UtmFpE',
    steps: [
      'Do not touch victim until power source is disconnected!',
      'Turn off main circuit breaker or push wire away using dry wooden or plastic pole.',
      'Call emergency medical services / RescueLink SOS immediately.',
      'Check for breathing and pulse once safely separated from power source.',
      'Begin CPR immediately if victim is unresponsive and not breathing.',
      'Treat burn marks at entry/exit points with clean dry sterile dressing.'
    ],
    dos: [
      'Verify power source is completely off before touching victim.',
      'Check entry and exit burn marks on body.',
      'Keep victim still and warm.'
    ],
    donts: [
      'Do not touch victim while connected to live electric current.',
      'Do not use metal or wet objects to push power wires.',
      'Do not move victim if spinal injury is suspected.'
    ],
    warnings: [
      'Electrical shock can cause internal cardiac arrest even if skin looks normal.',
      'Always ensure scene safety before approaching live voltage wires.'
    ]
  },
  {
    id: 'fa-7',
    category: 'snake_bite',
    title: 'Snake Bite',
    subtitle: 'Venomous bite response and limb immobilization',
    readTime: '3 min guide',
    urgency: 'CRITICAL',
    icon: 'ShieldAlert',
    videoId: '5k8nDlfaA9E',
    steps: [
      'Move victim away from snake striking distance safely.',
      'Keep victim completely calm and still to slow venom spreading.',
      'Remove tight rings, watches, or footwear before swelling occurs.',
      'Immobilize bitten limb with splint below heart level.',
      'Call emergency services / RescueLink SOS immediately for anti-venom dispatch.'
    ],
    dos: [
      'Keep bitten limb immobilized and below heart level.',
      'Mark border of swelling on skin with pen and note time.',
      'Remember snake color and pattern from a safe distance.'
    ],
    donts: [
      'Do not cut bite wound or try to suck out venom.',
      'Do not apply tourniquet, ice, or electric shock.',
      'Do not allow victim to walk or drink alcohol/caffeine.'
    ],
    warnings: [
      'Cutting or sucking bite wound increases tissue destruction and infection.',
      'Prompt hospital transport for anti-venom is critical.'
    ]
  },
  {
    id: 'fa-8',
    category: 'traffic_accident',
    title: 'Road Traffic Accident',
    subtitle: 'Scene safety, trauma triage, and spine protection',
    readTime: '3 min guide',
    urgency: 'CRITICAL',
    icon: 'Car',
    videoId: 'w3NP3iI7_fk',
    steps: [
      'Ensure scene safety: turn on hazard lights, set warning triangles, watch traffic.',
      'Call emergency services / RescueLink SOS with exact location details.',
      'Turn off vehicle ignition to eliminate fire hazards.',
      'Keep victims inside vehicle unless there is immediate fire or explosion risk.',
      'Support victim head and neck in neutral position to prevent spinal injury.',
      'Control severe external bleeding with direct pressure.'
    ],
    dos: [
      'Protect head and neck alignment at all times.',
      'Talk calmly to victims to reassure them.',
      'Keep victims warm with coats or blankets.'
    ],
    donts: [
      'Do not move injured victims unless immediate life threat exists.',
      'Do not remove helmets from motorcycle crash victims.',
      'Do not give food or liquids to trauma victims.'
    ],
    warnings: [
      'Moving crash victims without neck support can cause permanent paralysis.',
      'Watch for oncoming traffic while attending scene.'
    ]
  },
  {
    id: 'fa-9',
    category: 'choking',
    title: 'Choking',
    subtitle: 'Airway obstruction clearing (Heimlich Maneuver)',
    readTime: '2 min guide',
    urgency: 'CRITICAL',
    icon: 'Wind',
    videoId: 'HGBBu4zr8sM',
    steps: [
      'Ask "Are you choking?" If victim cannot speak or cough, act immediately.',
      'Stand behind victim and wrap arms around their waist.',
      'Make a fist with one hand above navel and below ribcage.',
      'Grasp fist with other hand and deliver quick, inward and upward abdominal thrusts.',
      'Repeat thrusts until object is dislodged or victim becomes unconscious.',
      'If victim becomes unconscious, lower to ground gently and start CPR.'
    ],
    dos: [
      'Encourage coughing if victim can still breathe or speak.',
      'Deliver sharp upward abdominal thrusts.',
      'Call emergency services immediately if object does not clear.'
    ],
    donts: [
      'Do not perform blind finger sweeps in mouth.',
      'Do not slap victim on back while standing upright.',
      'Do not give water to drink.'
    ],
    warnings: [
      'If victim loses consciousness, lower gently to ground and begin CPR immediately.',
      'Always seek medical evaluation after abdominal thrusts.'
    ]
  },
  {
    id: 'fa-10',
    category: 'drowning',
    title: 'Drowning',
    subtitle: 'Water rescue and resuscitation protocol',
    readTime: '3 min guide',
    urgency: 'CRITICAL',
    icon: 'Waves',
    videoId: 'v1YrU55ACbE',
    steps: [
      'Rescue safely: throw lifebuoy or rope; do not endanger yourself in water.',
      'Call emergency services / RescueLink SOS immediately once victim is on land.',
      'Place victim flat on back on firm ground and check for response and breathing.',
      'If not breathing, give 5 initial rescue breaths followed by 30 chest compressions.',
      'Continue cycles of 2 rescue breaths and 30 compressions until help arrives.',
      'Remove wet clothes and cover victim with dry blankets to prevent hypothermia.'
    ],
    dos: [
      'Give rescue breaths immediately for drowning victims.',
      'Keep victim warm after rescue.',
      'Place in recovery position on side if breathing normally.'
    ],
    donts: [
      'Do not jump into dangerous water unless trained.',
      'Do not waste time trying to drain water from lungs.',
      'Do not leave victim unattended even if they seem recovered.'
    ],
    warnings: [
      'Secondary drowning symptoms (respiratory distress) can develop hours later.',
      'Always start CPR with rescue breaths in drowning victims.'
    ]
  }
];

export const mockGoodSamaritanRights: GoodSamaritanRight[] = [
  {
    id: 'gs-1',
    title: 'Protection from Civil Liability',
    actSection: 'Good Samaritan Protection Clause § 102',
    summary: 'Bystanders offering assistance in good faith are legally protected against civil damages.',
    details: [
      'Applies to any citizen providing emergency medical care or assistance at the scene of an accident.',
      'Protects responders acting without compensation or expectation of financial reward.',
      'Coverage remains valid as long as actions do not constitute gross negligence or deliberate harm.'
    ],
    badge: 'Full Immunity'
  },
  {
    id: 'gs-2',
    title: 'Right to Anonymity & Refusal of Harassment',
    actSection: 'Police Conduct Code § 408',
    summary: 'Helpless responders cannot be detained, harassed, or forced to reveal personal details.',
    details: [
      'You are not required to disclose personal identity or remain at police stations.',
      'Hospital personnel cannot withhold treatment pending payment by the Samaritan.',
      'Witness statement collection must respect Samaritan preference and privacy.'
    ],
    badge: 'Legal Right'
  },
  {
    id: 'gs-3',
    title: 'Hospital Emergency Admission Mandate',
    actSection: 'Emergency Medical Care Act § 55',
    summary: 'Hospitals must admit emergency cases immediately without demanding upfront deposit.',
    details: [
      'No hospital (public or private) can deny emergency treatment.',
      'The Samaritan who brings an injured person is not liable for hospital expenses.'
    ],
    badge: 'Mandatory Care'
  }
];
