// Notification Type Specifications & Status Mapping Utility

export interface NotificationPayloadConfig {
  statusType: string;
  type: 'emergency' | 'volunteer' | 'hospital' | 'system' | 'resolved';
  title: string;
  message: string;
}

// Maps volunteer/accident status updates to required Citizen Push Notifications
export const CITIZEN_STATUS_NOTIFICATIONS: Record<string, NotificationPayloadConfig> = {
  // 1. Volunteer Accepted
  'Volunteer Assigned': {
    statusType: 'volunteer_accepted',
    type: 'volunteer',
    title: 'A volunteer has accepted your emergency request.',
    message: 'A volunteer has accepted your emergency request.',
  },
  'Responder Dispatched': {
    statusType: 'volunteer_accepted',
    type: 'volunteer',
    title: 'A volunteer has accepted your emergency request.',
    message: 'A volunteer has accepted your emergency request.',
  },
  'Accepted': {
    statusType: 'volunteer_accepted',
    type: 'volunteer',
    title: 'A volunteer has accepted your emergency request.',
    message: 'A volunteer has accepted your emergency request.',
  },

  // 2. Volunteer Started
  'En Route': {
    statusType: 'volunteer_started',
    type: 'volunteer',
    title: 'Volunteer Started',
    message: 'The volunteer is now on the way to your location.',
  },
  'En Route to Scene': {
    statusType: 'volunteer_started',
    type: 'volunteer',
    title: 'Volunteer Started',
    message: 'The volunteer is now on the way to your location.',
  },
  'Arrived at Scene': {
    statusType: 'volunteer_started',
    type: 'volunteer',
    title: 'Volunteer Started',
    message: 'The volunteer is now on the way to your location.',
  },

  // 3. Patient Picked
  'Transporting to Hospital': {
    statusType: 'patient_picked',
    type: 'hospital',
    title: 'Patient Picked',
    message: 'The patient has been picked up and is being transported.',
  },
  'Patient Picked': {
    statusType: 'patient_picked',
    type: 'hospital',
    title: 'Patient Picked',
    message: 'The patient has been picked up and is being transported.',
  },

  // 4. Hospital Reached
  'Hospital Reached': {
    statusType: 'hospital_reached',
    type: 'hospital',
    title: 'Hospital Reached',
    message: 'The volunteer has reached the hospital.',
  },

  // 5. Case Completed
  'Emergency Resolved': {
    statusType: 'case_completed',
    type: 'resolved',
    title: 'Case Completed',
    message: 'Your emergency case has been successfully completed.',
  },
  'Completed': {
    statusType: 'case_completed',
    type: 'resolved',
    title: 'Case Completed',
    message: 'Your emergency case has been successfully completed.',
  },
  'Emergency Completed': {
    statusType: 'case_completed',
    type: 'resolved',
    title: 'Case Completed',
    message: 'Your emergency case has been successfully completed.',
  },
};
