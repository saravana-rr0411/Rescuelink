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
  category: 'cpr' | 'bleeding' | 'burns' | 'fractures' | 'choking' | 'seizures';
  title: string;
  subtitle: string;
  readTime: string;
  urgency: 'HIGH' | 'CRITICAL' | 'STANDARD';
  steps: string[];
  warnings: string[];
  icon: string;
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
    category: 'cpr',
    title: 'Adult CPR (Cardiopulmonary Resuscitation)',
    subtitle: 'Hands-only compressions for unassisted victims',
    readTime: '2 min guide',
    urgency: 'CRITICAL',
    icon: 'HeartPulse',
    steps: [
      'Call 911 or activate RescueLink SOS immediately.',
      'Place victim on back on a hard, flat surface.',
      'Place heel of one hand in center of chest, other hand on top.',
      'Push hard and fast at 100-120 compressions per minute (to the beat of "Stayin Alive").',
      'Continue until AED or emergency services arrive.'
    ],
    warnings: [
      'Do not stop compressions unless victim revives or help takes over.',
      'Ensure chest fully recoils between compressions.'
    ]
  },
  {
    id: 'fa-2',
    category: 'bleeding',
    title: 'Severe Bleeding Control',
    subtitle: 'Pressure application and tourniquet protocol',
    readTime: '3 min guide',
    urgency: 'CRITICAL',
    icon: 'Droplet',
    steps: [
      'Apply direct, firm pressure over wound using clean cloth or sterile gauze.',
      'Keep continuous pressure for at least 10 minutes without lifting.',
      'If bleeding persists through cloth, add more layers—do not remove bottom layer.',
      'Elevate limb above heart level if no fracture suspected.',
      'Apply tourniquet 2-3 inches above wound if arterial bleeding continues.'
    ],
    warnings: [
      'Never remove embedded objects from deep wounds.',
      'Note exact time if tourniquet is applied.'
    ]
  },
  {
    id: 'fa-3',
    category: 'burns',
    title: 'Thermal & Chemical Burns',
    subtitle: 'Cooling techniques and dressing procedures',
    readTime: '2 min guide',
    urgency: 'HIGH',
    icon: 'Flame',
    steps: [
      'Cool burn immediately under clean running water for 10-20 minutes.',
      'Remove jewelry or tight items before area swells.',
      'Cover loosely with sterile non-stick bandage or clean cling wrap.',
      'Keep victim warm with blanket to prevent shock.'
    ],
    warnings: [
      'Do not apply ice, butter, oil, or ointments to open burn wounds.',
      'Do not break intact blisters.'
    ]
  },
  {
    id: 'fa-4',
    category: 'choking',
    title: 'Heimlich Maneuver (Abdominal Thrusts)',
    subtitle: 'Airway obstruction clearing for conscious victims',
    readTime: '2 min guide',
    urgency: 'CRITICAL',
    icon: 'Wind',
    steps: [
      'Stand behind victim and wrap arms around waist.',
      'Make a fist with one hand and place above navel, below ribcage.',
      'Grasp fist with other hand and press inward and upward forcefully.',
      'Repeat quick upward thrusts until object is dislodged.'
    ],
    warnings: [
      'If victim loses consciousness, lower gently to ground and begin CPR.'
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
