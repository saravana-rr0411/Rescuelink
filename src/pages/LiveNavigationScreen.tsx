import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getStoredHospital } from '../utils/routing';
import { GoogleMapsNavigationMode } from '../components/common/GoogleMapsNavigationMode';

interface AccidentData {
  id: string;
  address: string;
  severity: string;
  latitude: number;
  longitude: number;
  volunteer_latitude?: number | null;
  volunteer_longitude?: number | null;
  status: string;
  description?: string;
  created_at?: string;
  volunteer_id?: string | null;
}

export const LiveNavigationScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as any;
  const { accidentId: routeAccidentId } = useParams<{ accidentId?: string }>();
  const activeAccidentId = routeAccidentId || locationState?.accidentId || 'default-accident';

  const mode: 'citizen' | 'volunteer' = locationState?.mode || 'citizen';

  const [accident, setAccident] = useState<AccidentData>({
    id: activeAccidentId,
    address: locationState?.address || 'Emergency Incident Location',
    severity: locationState?.severity || 'CRITICAL',
    latitude: locationState?.latitude ?? 12.9716,
    longitude: locationState?.longitude ?? 77.5946,
    volunteer_latitude: locationState?.volunteerLatitude ?? null,
    volunteer_longitude: locationState?.volunteerLongitude ?? null,
    status: 'In Progress',
  });

  // Fetch real accident record if available
  useEffect(() => {
    const fetchAccidentDetails = async () => {
      if (activeAccidentId && activeAccidentId !== 'default-accident') {
        const { data, error } = await supabase
          .from('accidents')
          .select('*')
          .eq('id', activeAccidentId)
          .single();

        if (data && !error) {
          setAccident((prev) => ({
            ...prev,
            id: data.id,
            address: data.address || prev.address,
            severity: data.severity || prev.severity,
            latitude: data.latitude || prev.latitude,
            longitude: data.longitude || prev.longitude,
            volunteer_latitude: data.volunteer_latitude ?? prev.volunteer_latitude,
            volunteer_longitude: data.volunteer_longitude ?? prev.volunteer_longitude,
            status: data.status || prev.status,
            description: data.description || prev.description,
            created_at: data.created_at || prev.created_at,
          }));
        }
      }
    };
    fetchAccidentDetails();
  }, [activeAccidentId]);

  // Realtime subscription for accident updates
  useEffect(() => {
    if (!activeAccidentId || activeAccidentId === 'default-accident') return;

    const channel = supabase
      .channel(`live_nav_${activeAccidentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'accidents',
          filter: `id=eq.${activeAccidentId}`,
        },
        (payload) => {
          if (payload.new) {
            const updated = payload.new as any;
            setAccident((prev) => ({
              ...prev,
              status: updated.status || prev.status,
              volunteer_latitude: updated.volunteer_latitude ?? prev.volunteer_latitude,
              volunteer_longitude: updated.volunteer_longitude ?? prev.volunteer_longitude,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeAccidentId]);

  const storedHosp = getStoredHospital(activeAccidentId);

  // Determine Destination:
  // If hospital assigned / selected -> destination is the Hospital!
  // Else -> destination is the Accident Location!
  const isHospitalTarget = !!storedHosp || accident.status === 'Transporting to Hospital';

  const destinationName = isHospitalTarget
    ? storedHosp?.name || 'Emergency Hospital'
    : accident.address || 'Accident Incident Location';

  const destinationAddress = isHospitalTarget
    ? storedHosp?.address || accident.address
    : accident.address;

  const destinationCoords: [number, number] = isHospitalTarget
    ? [storedHosp?.latitude || accident.latitude + 0.008, storedHosp?.longitude || accident.longitude - 0.006]
    : [accident.latitude, accident.longitude];

  const destinationType: 'hospital' | 'accident' = isHospitalTarget ? 'hospital' : 'accident';

  // Initial user coordinates:
  let initialUserCoords: [number, number] | null = null;
  if (mode === 'volunteer') {
    if (accident.volunteer_latitude && accident.volunteer_longitude) {
      initialUserCoords = [accident.volunteer_latitude, accident.volunteer_longitude];
    } else {
      initialUserCoords = [accident.latitude + 0.006, accident.longitude + 0.006];
    }
  } else {
    // Citizen user
    initialUserCoords = [accident.latitude - 0.005, accident.longitude - 0.005];
  }

  const navStatus = isHospitalTarget
    ? 'Transporting to Hospital'
    : mode === 'volunteer'
      ? 'En Route to Accident Scene'
      : 'Navigating to Incident';

  const handleStopNavigation = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(mode === 'volunteer' ? '/volunteer' : '/status');
    }
  };

  return (
    <GoogleMapsNavigationMode
      destinationName={destinationName}
      destinationAddress={destinationAddress}
      destinationCoords={destinationCoords}
      destinationType={destinationType}
      initialUserCoords={initialUserCoords}
      accidentId={activeAccidentId}
      navigationStatus={navStatus}
      onStopNavigation={handleStopNavigation}
    />
  );
};

export default LiveNavigationScreen;
