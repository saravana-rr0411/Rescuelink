export const getLocalizedStatus = (status: string, t: any): string => {
  if (!status) return status;

  const statusMap: Record<string, string> = {
    'Volunteer Assigned': 'status.volunteerAssigned',
    'Volunteer Accepted': 'status.volunteerAccepted',
    'Responder Dispatched': 'status.responderDispatched',
    'Accepted': 'status.accepted',
    'En Route': 'status.enRoute',
    'En Route to Scene': 'status.enRouteToScene',
    'Arrived at Scene': 'status.arrivedAtScene',
    'Volunteer Arrived': 'status.volunteerArrived',
    'Volunteer Reached': 'status.volunteerReached',
    'Transporting to Hospital': 'status.transportingToHospital',
    'Patient Picked': 'status.patientPicked',
    'Hospital Reached': 'status.hospitalReached',
    'Emergency Completed': 'status.emergencyCompleted',
    'Completed': 'status.completed',
    'Emergency Resolved': 'status.emergencyResolved',
    'Resolved': 'status.resolved',
    
    // StatusBadge explicitly mapped ones
    'EN_ROUTE': 'status.ambulanceEnRoute',
    'ON_SCENE': 'status.responderOnScene',
    'DISPATCHED': 'status.dispatchingHelp',
    'RESOLVED': 'status.resolved',
  };

  const key = statusMap[status];
  return key ? t(key) : status;
};

// Notification display mapper (Translates known exact legacy/current English strings, returns original if unknown)
export const getLocalizedNotification = (text: string, t: any): string => {
  if (!text) return text;
  
  const notifMap: Record<string, string> = {
    'A volunteer has accepted your emergency request.': 'notifications.volunteerAcceptedMsg',
    'Volunteer Started': 'notifications.volunteerStartedTitle',
    'The volunteer is now on the way to your location.': 'notifications.volunteerStartedMsg',
    'Patient Picked': 'notifications.patientPickedTitle',
    'The patient has been picked up and is being transported.': 'notifications.patientPickedMsg',
    'Hospital Reached': 'notifications.hospitalReachedTitle',
    'The volunteer has reached the hospital.': 'notifications.hospitalReachedMsg',
    'Case Completed': 'notifications.caseCompletedTitle',
    'Your emergency case has been successfully completed.': 'notifications.caseCompletedMsg',
  };

  const key = notifMap[text];
  return key ? t(key) : text;
};
