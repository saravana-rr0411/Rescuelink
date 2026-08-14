import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Car, Stethoscope, Flame, ShieldAlert, MapPin, Camera, AlertTriangle, Send, Navigation, AlertCircle, CheckCircle, X, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { isValidGpsCoordinate, formatSupabaseError } from '../utils/locationGuard';
import { useNetworkSync } from '../hooks/useNetworkSync';
import { GoogleMap } from '../components/maps/GoogleMap';

export const ReportAccidentScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOnline } = useNetworkSync();
  const locationState = useLocation().state as { category?: string } | undefined;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [incidentType, setIncidentType] = useState(locationState?.category || 'accident');
  const [address, setAddress] = useState('Detecting GPS location...');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM'>('CRITICAL');
  const [bloodGroup, setBloodGroup] = useState<string>('Unknown');
  
  // Image Upload States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form States
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Fetch device GPS location on load if available
  useEffect(() => {
    fetchDeviceLocation();
  }, []);

  const fetchDeviceLocation = () => {
    setErrorMessage('');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          if (!isValidGpsCoordinate(lat, lng)) {
            setLatitude(null);
            setLongitude(null);
            setAddress('Unable to determine location');
            setErrorMessage('Unable to determine your current location. Please enable GPS and try again.');
            return;
          }

          setLatitude(lat);
          setLongitude(lng);

          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
              { headers: { 'User-Agent': 'RescueLink/1.0' } }
            );
            if (res.ok) {
              const data = await res.json();
              if (data && data.display_name) {
                setAddress(data.display_name);
                return;
              }
            }
          } catch (err) {
            console.warn('Reverse geocoding error:', err);
          }
          setAddress(`GPS Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
        },
        (err) => {
          console.warn('Geolocation access declined or unavailable:', err.message);
          setLatitude(null);
          setLongitude(null);
          setAddress('GPS location unavailable');
          setErrorMessage('Location permission denied. Please enable GPS to continue.');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLatitude(null);
      setLongitude(null);
      setAddress('GPS not supported');
      setErrorMessage('Geolocation API is not supported by your browser.');
    }
  };

  const handleRefetchGPS = () => {
    setAddress('Detecting live GPS location...');
    fetchDeviceLocation();
  };

  // Handle Image File Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate mime type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Please select a valid image file (JPG, PNG, or WEBP).');
      return;
    }

    setErrorMessage('');
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // 1. Comprehensive Validation
    if (!isValidGpsCoordinate(latitude, longitude)) {
      setErrorMessage('Unable to determine your current location. Please enable GPS to continue.');
      return;
    }

    if (!address || address.trim() === '' || address === 'GPS location unavailable' || address === 'GPS not supported' || address === 'Unable to determine location') {
      setErrorMessage('Location address is required to submit an emergency report.');
      return;
    }

    if (!description || description.trim().length < 3) {
      setErrorMessage('Please provide a brief description of the incident (at least 3 characters).');
      return;
    }

    if (!severity) {
      setErrorMessage('Please select an emergency severity level.');
      return;
    }

    if (!user) {
      setErrorMessage('You must be logged in to report an accident.');
      return;
    }

    setSubmitting(true);
    let uploadedPhotoUrl: string | null = null;

    if (!isOnline) {
      if (selectedFile) {
        // Discard photo visually and logically but keep the rest
        alert('Photos cannot be uploaded while offline. Submitting essential details only.');
      }
      
      const offlineReport = {
        id: crypto.randomUUID(),
        reporter_id: user.id,
        latitude: latitude,
        longitude: longitude,
        address: address.trim(),
        severity: severity,
        description: description.trim(),
        blood_group: bloodGroup,
        timestamp: new Date().toISOString()
      };
      
      const existing = localStorage.getItem('rescuelink_pending_reports');
      const pendingQueue = existing ? JSON.parse(existing) : [];
      pendingQueue.push(offlineReport);
      localStorage.setItem('rescuelink_pending_reports', JSON.stringify(pendingQueue));
      
      setSuccessMessage('Emergency report saved on this device. It will be sent when connectivity is restored.');
      setSubmitting(false);
      
      setTimeout(() => {
        navigate('/home');
      }, 3500);
      return;
    }

    try {
      // 2. Upload Image to Supabase Storage if selected
      if (selectedFile) {
        setUploadingImage(true);
        const fileExt = selectedFile.name.split('.').pop() || 'jpg';
        const uniqueFileName = `${user.id}/${Date.now()}_${crypto.randomUUID()}.${fileExt}`;

        console.log('[RescueLink Storage] Uploading image file to accident-images bucket:', uniqueFileName);

        const { error: uploadError } = await supabase.storage
          .from('accident-images')
          .upload(uniqueFileName, selectedFile, {
            cacheControl: '3600',
            upsert: false,
          });

        setUploadingImage(false);

        if (uploadError) {
          console.error('[RescueLink Storage] Supabase Storage upload failed. Exact error:', uploadError);
          setErrorMessage(`Image upload failed: ${uploadError.message || 'Storage error occurred'}`);
          setSubmitting(false);
          return;
        }

        // Get Public URL
        const { data: publicUrlData } = supabase.storage
          .from('accident-images')
          .getPublicUrl(uniqueFileName);

        uploadedPhotoUrl = publicUrlData.publicUrl;
        console.log('[RescueLink Storage] Image upload successful. Public URL:', uploadedPhotoUrl);
      }

      // 3. Insert row into public.accidents table
      const { data, error } = await supabase
        .from('accidents')
        .insert([
          {
            reporter_id: user.id,
            latitude: latitude,
            longitude: longitude,
            address: address.trim(),
            severity: severity,
            description: description.trim(),
            blood_group: bloodGroup,
            status: 'SOS Sent',
            photo_url: uploadedPhotoUrl,
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('[RescueLink Database] Supabase accident insert failed. Exact error:', error);
        setErrorMessage(formatSupabaseError(error, 'Failed to save emergency report. Please try again.'));
        setSubmitting(false);
        return;
      }

      console.log('Successfully inserted accident report into public.accidents:', data);
      setSuccessMessage('Accident reported successfully.');
      setSubmitting(false);

      // 4. Navigate automatically to SOS Status screen
      setTimeout(() => {
        navigate('/status', { state: { accidentId: data?.id } });
      }, 1000);
    } catch (err: any) {
      console.error('Unexpected error submitting accident report:', err);
      setErrorMessage('An unexpected error occurred while dispatching the report.');
      setSubmitting(false);
      setUploadingImage(false);
    }
  };

  const types = [
    { id: 'accident', title: 'Vehicle Accident', icon: Car, color: 'border-blue-500 bg-blue-50 text-blue-800' },
    { id: 'medical', title: 'Medical Crisis', icon: Stethoscope, color: 'border-red-500 bg-red-50 text-red-800' },
    { id: 'fire', title: 'Fire & Outbreak', icon: Flame, color: 'border-amber-500 bg-amber-50 text-amber-800' },
    { id: 'crime', title: 'Safety Hazard', icon: ShieldAlert, color: 'border-purple-500 bg-purple-50 text-purple-800' },
  ];

  return (
    <div className="flex flex-col min-h-full">
      <Navbar title="Report Incident" showBack />

      {/* Hidden File Picker Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
      />

      <main className="flex-1 px-4 py-4 space-y-5">
        {/* Header Alert */}
        <div className="bg-primary/10 border border-primary/30 p-3.5 rounded-2xl flex items-center gap-3 text-xs font-semibold text-primary">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>Emergency services and nearby volunteer responders will be alerted automatically upon submission.</span>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-100 text-red-800 text-xs font-semibold rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-100 text-emerald-900 text-xs font-semibold rounded-xl flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Incident Type Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-on-surface uppercase tracking-wider">1. Select Emergency Type</label>
            <div className="grid grid-cols-2 gap-2.5">
              {types.map((type) => {
                const Icon = type.icon;
                const selected = incidentType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setIncidentType(type.id)}
                    className={`p-3 rounded-2xl border-2 flex items-center gap-2.5 text-left transition-all ${
                      selected ? `${type.color} font-bold shadow-xs scale-[1.02]` : 'bg-surface-container-lowest border-outline-variant/50 text-on-surface-variant'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="text-xs">{type.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* GPS Location Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-on-surface uppercase tracking-wider">2. Emergency Location</label>
              <button 
                type="button" 
                onClick={handleRefetchGPS}
                className="text-[11px] font-bold text-secondary flex items-center gap-1 hover:underline"
              >
                <Navigation className="w-3.5 h-3.5" />
                Refetch GPS
              </button>
            </div>
            <div className="relative">
              <MapPin className="w-4 h-4 text-primary absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Interactive Google Map Location Picker */}
            {latitude !== null && longitude !== null && (
              <div className="w-full h-44 rounded-2xl overflow-hidden border border-outline-variant/60 shadow-xs mt-2">
                <GoogleMap
                  center={{ lat: latitude, lng: longitude }}
                  zoom={15}
                  markers={[
                    {
                      id: 'report-accident-loc-marker',
                      lat: latitude,
                      lng: longitude,
                      title: address || 'Emergency Location',
                      type: 'accident' as const,
                    },
                  ]}
                  onMapClick={async ({ lat, lng }) => {
                    setLatitude(lat);
                    setLongitude(lng);
                    try {
                      const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
                        { headers: { 'User-Agent': 'RescueLink/1.0' } }
                      );
                      if (res.ok) {
                        const data = await res.json();
                        if (data && data.display_name) {
                          setAddress(data.display_name);
                          return;
                        }
                      }
                    } catch (err) {
                      console.warn('Reverse geocoding error:', err);
                    }
                    setAddress(`GPS Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
                  }}
                  className="w-full h-full"
                />
              </div>
            )}
          </div>

          {/* Severity Radio Group */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-on-surface uppercase tracking-wider">3. Severity Level</label>
            <div className="grid grid-cols-3 gap-2">
              {(['CRITICAL', 'HIGH', 'MEDIUM'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSeverity(lvl)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    severity === lvl
                      ? lvl === 'CRITICAL'
                        ? 'bg-primary text-white border-primary'
                        : lvl === 'HIGH'
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-secondary text-white border-secondary'
                      : 'bg-surface-container-lowest border-outline-variant/60 text-on-surface-variant'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-on-surface uppercase tracking-wider">4. Additional Incident Details</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe injuries, trapped persons, or fire scale..."
              className="w-full p-3.5 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Attach Photo / Media */}
          <div className="bg-surface-container-lowest p-3.5 rounded-2xl border border-dashed border-outline-variant space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-xs text-on-surface-variant">
                <Camera className="w-5 h-5 text-secondary shrink-0" />
                <div>
                  <p className="font-semibold text-on-surface">Attach Scene Photo (Optional)</p>
                  <p className="text-[10px] text-on-surface-variant/80">JPG, PNG, or WEBP (Max 10MB)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedFile ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                }`}
              >
                {selectedFile ? 'Change Photo' : 'Upload Image'}
              </button>
            </div>

            {/* Selected Image Thumbnail Preview */}
            {previewUrl && (
              <div className="relative rounded-xl overflow-hidden border border-outline-variant/60 bg-black/5 max-h-40 flex items-center justify-center">
                <img src={previewUrl} alt="Incident Scene Preview" className="w-full h-36 object-cover" />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                  aria-label="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full truncate max-w-[80%]">
                  {selectedFile?.name}
                </div>
              </div>
            )}
          </div>

          {/* Patient Blood Group Dropdown */}
          <div className="space-y-2">
            <label htmlFor="patient-blood-group-select" className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
              <span>🩸 Patient Blood Group</span>
            </label>
            <div className="relative">
              <select
                id="patient-blood-group-select"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full p-3.5 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
              >
                <option value="Unknown">Select Blood Group ▼</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="Unknown">Unknown</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-on-surface-variant font-bold text-xs">
                ▼
              </div>
            </div>
          </div>

          {/* Submit SOS Dispatch Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-gradient-to-r from-primary to-primary-container text-white font-extrabold text-sm rounded-2xl shadow-level-2 hover:opacity-95 transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            {submitting ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{uploadingImage ? 'Uploading Scene Image...' : 'Dispatching Emergency Units...'}</span>
              </div>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>CONFIRM & DISPATCH EMERGENCY SOS</span>
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
};
