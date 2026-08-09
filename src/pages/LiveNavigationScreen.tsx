import React, { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getStoredHospital, saveStoredHospital, fetchGooglePlacesDetails, type Hospital, type StoredHospital } from '../utils/routing';
import { GoogleMapsNavigationMode } from '../components/common/GoogleMapsNavigationMode';
import { HospitalSelectorSheet } from '../components/common/HospitalSelectorSheet';

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

  const [accident, setAccident] = useState<AccidentData | null>(() => {
    if (locationState?.latitude && locationState?.longitude) {
      return {
        id: activeAccidentId,
        address: locationState?.address || 'Emergency Incident Location',
        severity: locationState?.severity || 'CRITICAL',
        latitude: locationState.latitude,
        longitude: locationState.longitude,
        volunteer_latitude: locationState?.volunteerLatitude ?? null,
        volunteer_longitude: locationState?.volunteerLongitude ?? null,
        status: 'In Progress',
      };
    }
    return null;
  });

  const [showHospitalSheet, setShowHospitalSheet] = useState<boolean>(false);
  const [activeHospital, setActiveHospital] = useState<Hospital | null>(() => {
    const stored = getStoredHospital(activeAccidentId);
    if (stored && stored.latitude && stored.longitude) {
      return {
        id: stored.id || 'stored-hospital',
        name: stored.name,
        address: stored.address,
        phone: (stored.phone || stored.internationalPhone || '').trim(),
        latitude: stored.latitude,
        longitude: stored.longitude,
        distanceMeters: stored.distanceMeters || 0,
        emergencyDept: true,
        bedsAvailable: 0,
      };
    }
    return null;
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
            ...(prev || {}),
            id: data.id,
            address: data.address || prev?.address || 'Emergency Incident Location',
            severity: data.severity || prev?.severity || 'CRITICAL',
            latitude: data.latitude,
            longitude: data.longitude,
            volunteer_latitude: data.volunteer_latitude ?? prev?.volunteer_latitude,
            volunteer_longitude: data.volunteer_longitude ?? prev?.volunteer_longitude,
            status: data.status || prev?.status || 'In Progress',
            description: data.description || prev?.description,
            created_at: data.created_at || prev?.created_at,
          }));

          if (data.hospital_name && data.hospital_latitude && data.hospital_longitude) {
            setActiveHospital((prev) => ({
              id: prev?.id || 'db-hospital',
              name: data.hospital_name,
              address: data.hospital_address || prev?.address || data.address,
              phone: (data.hospital_phone || prev?.phone || '').trim(),
              latitude: data.hospital_latitude,
              longitude: data.hospital_longitude,
              distanceMeters: prev?.distanceMeters || 0,
              emergencyDept: true,
              bedsAvailable: 0,
            }));
          }

          // If current status is Volunteer Reached on load, open hospital selector automatically
          if (data.status === 'Volunteer Reached' || data.status === 'Volunteer Arrived') {
            setShowHospitalSheet(true);
          }
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
            setAccident((prev) =>
              prev
                ? {
                    ...prev,
                    status: updated.status || prev.status,
                    volunteer_latitude: updated.volunteer_latitude ?? prev.volunteer_latitude,
                    volunteer_longitude: updated.volunteer_longitude ?? prev.volunteer_longitude,
                  }
                : null
            );

            if (updated.status === 'Volunteer Reached' || updated.status === 'Volunteer Arrived') {
              setShowHospitalSheet(true);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeAccidentId]);

  if (!accident) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white p-6 text-center select-none">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <h3 className="text-sm font-black text-white">Acquiring Emergency Location...</h3>
      </div>
    );
  }

  const isHospitalTarget = !!activeHospital || accident.status === 'Transporting to Hospital';

  const handleArrival = async () => {
    if (isHospitalTarget) {
      // Volunteer reached hospital
      if (activeAccidentId && activeAccidentId !== 'default-accident') {
        console.log('[RescueLink Nav] Volunteer reached hospital destination. Updating status to Hospital Reached...');
        await supabase
          .from('accidents')
          .update({ status: 'Hospital Reached', hospital_reached_at: new Date().toISOString() })
          .eq('id', activeAccidentId);
      }
      navigate('/volunteer');
    } else {
      // Volunteer reached accident location
      if (activeAccidentId && activeAccidentId !== 'default-accident') {
        console.log('[RescueLink Nav] Volunteer confirmed arrival at accident scene. Updating status to Volunteer Reached...');
        await supabase
          .from('accidents')
          .update({ status: 'Volunteer Reached', arrived_at: new Date().toISOString() })
          .eq('id', activeAccidentId);

        setAccident((prev) => (prev ? { ...prev, status: 'Volunteer Reached' } : null));
      }
      if (mode === 'volunteer') {
        setShowHospitalSheet(true);
      }
    }
  };

  const handleSelectHospital = async (hosp: Hospital) => {
    console.log('[RescueLink Nav] Hospital selected! Fetching Google Places details for:', hosp.name);

    let phone = hosp.phone;
    let intPhone: string | undefined;
    let rating: number | undefined;
    let website: string | undefined;
    let address = hosp.address;

    const placesData = await fetchGooglePlacesDetails(hosp.name, hosp.latitude, hosp.longitude);
    if (placesData) {
      if (placesData.phone) phone = placesData.phone;
      if (placesData.internationalPhone) intPhone = placesData.internationalPhone;
      if (placesData.rating) rating = placesData.rating;
      if (placesData.website) website = placesData.website;
      if (placesData.address) address = placesData.address;
    }

    const finalPhone = (phone || intPhone || hosp.phone || '').trim();

    const hospitalToStore: StoredHospital = {
      id: hosp.id,
      name: hosp.name,
      address,
      latitude: hosp.latitude,
      longitude: hosp.longitude,
      phone: finalPhone,
      internationalPhone: intPhone,
      rating,
      website,
      distanceMeters: hosp.distanceMeters,
    };

    saveStoredHospital(activeAccidentId, hospitalToStore);
    setActiveHospital({
      id: hosp.id || 'stored-hospital',
      name: hosp.name,
      address,
      phone: finalPhone,
      latitude: hosp.latitude,
      longitude: hosp.longitude,
      distanceMeters: hosp.distanceMeters || 0,
      emergencyDept: true,
      bedsAvailable: 0,
    });
    setShowHospitalSheet(false);

    if (activeAccidentId && activeAccidentId !== 'default-accident') {
      console.log('[RescueLink Workflow] Hospital selected in Live Navigation mode for accident ID:', activeAccidentId);
      const { data, error } = await supabase
        .from('accidents')
        .update({
          status: 'Transporting to Hospital',
          hospital_name: hosp.name,
          hospital_address: address,
          hospital_phone: finalPhone || null,
          hospital_latitude: hosp.latitude,
          hospital_longitude: hosp.longitude,
          transported_at: new Date().toISOString(),
        })
        .eq('id', activeAccidentId)
        .select()
        .single();

      console.log('[RescueLink Workflow] Supabase update result in Live Navigation:', { data, error });

      setAccident((prev) =>
        prev
          ? {
              ...prev,
              status: 'Transporting to Hospital',
              hospital_name: hosp.name,
              hospital_address: address,
              hospital_phone: finalPhone || null,
              hospital_latitude: hosp.latitude,
              hospital_longitude: hosp.longitude,
            }
          : null
      );
    }
  };

  const destinationName = isHospitalTarget
    ? activeHospital?.name || 'Emergency Hospital'
    : accident.address || 'Accident Incident Location';

  const destinationAddress = isHospitalTarget
    ? activeHospital?.address || accident.address
    : accident.address;

  const destinationCoords: [number, number] = isHospitalTarget
    ? [activeHospital?.latitude || accident.latitude, activeHospital?.longitude || accident.longitude]
    : [accident.latitude, accident.longitude];

  const destinationType: 'hospital' | 'accident' = isHospitalTarget ? 'hospital' : 'accident';

  // Initial user coordinates from real GPS if available:
  let initialUserCoords: [number, number] | null = null;
  if (accident.volunteer_latitude && accident.volunteer_longitude) {
    initialUserCoords = [accident.volunteer_latitude, accident.volunteer_longitude];
  }

  const navStatus = isHospitalTarget
    ? 'Transporting to Hospital'
    : mode === 'volunteer'
      ? 'En Route to Accident Scene'
      : 'Navigating to Incident';

  return (
    <>
      <GoogleMapsNavigationMode
        destinationName={destinationName}
        destinationAddress={destinationAddress}
        destinationCoords={destinationCoords}
        destinationType={destinationType}
        initialUserCoords={initialUserCoords}
        accidentId={activeAccidentId}
        navigationStatus={navStatus}
        hospitalPhone={activeHospital?.phone}
        onArrival={handleArrival}
        onBackToHospitalSelect={mode === 'volunteer' ? () => setShowHospitalSheet(true) : undefined}
      />

      {mode === 'volunteer' && (
        <HospitalSelectorSheet
          isOpen={showHospitalSheet}
          onClose={() => setShowHospitalSheet(false)}
          accidentLatitude={accident.latitude}
          accidentLongitude={accident.longitude}
          onSelectHospital={handleSelectHospital}
        />
      )}
    </>
  );
};

export default LiveNavigationScreen;
