import React, { useEffect, useState, useRef } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { mockUserProfile } from '../data/mockData';
import { HeartPulse, PhoneCall, Settings, LogOut, Award, Mail, Loader2, Edit2, Save, X, CheckCircle, AlertCircle, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface ProfileRecord {
  id?: string;
  auth_user_id?: string;
  full_name: string;
  phone_number: string;
  blood_group: string;
  role: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  allergies?: string;
  medical_conditions?: string;
  avatar_url?: string | null;
}

export const ProfileScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states for editing
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O-');
  const [role, setRole] = useState('Citizen');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRelation, setContactRelation] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');

  useEffect(() => {
    async function fetchProfile() {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        console.log('[RescueLink Profile] Fetching profile from Supabase for user ID:', user.id);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.warn('[RescueLink Profile] Query error:', error.message);
        }

        if (data) {
          console.log('[RescueLink Profile] Existing profile loaded from public.profiles:', data);
          setProfile(data);
          populateForm(data);
        } else {
          console.log('[RescueLink Profile] No existing profile row found for user. Auto-creating profile row in public.profiles...');
          const fallback: ProfileRecord = {
            auth_user_id: user.id,
            full_name: user.email ? user.email.split('@')[0] : mockUserProfile.name,
            phone_number: mockUserProfile.phone,
            blood_group: 'O-',
            role: 'Volunteer',
            emergency_contact_name: mockUserProfile.emergencyContacts[0].name,
            emergency_contact_phone: mockUserProfile.emergencyContacts[0].phone,
            emergency_contact_relation: mockUserProfile.emergencyContacts[0].relation,
            allergies: '',
            medical_conditions: '',
            avatar_url: null,
          };

          const { data: insertedData, error: insertError } = await supabase
            .from('profiles')
            .upsert([fallback], { onConflict: 'auth_user_id' })
            .select()
            .single();

          if (insertError) {
            console.error('[RescueLink Profile] Failed to auto-create profile row in public.profiles. Exact error:', insertError);
            setProfile(fallback);
            populateForm(fallback);
          } else {
            console.log('[RescueLink Profile] Successfully auto-created profile row in public.profiles:', insertedData);
            setProfile(insertedData || fallback);
            populateForm(insertedData || fallback);
          }
        }
      } catch (err) {
        console.error('[RescueLink Profile] Unexpected error loading profile:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [user]);

  const populateForm = (data: ProfileRecord) => {
    setFullName(data.full_name || '');
    setPhoneNumber(data.phone_number || '');
    setBloodGroup(data.blood_group || 'O-');
    setRole(data.role || 'Citizen');
    setContactName(data.emergency_contact_name || '');
    setContactPhone(data.emergency_contact_phone || '');
    setContactRelation(data.emergency_contact_relation || '');
    setAllergies(data.allergies || '');
    setMedicalConditions(data.medical_conditions || '');
  };

  // Avatar Selection and Upload Handler
  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Please select a valid image file (JPG, PNG, or WEBP).' });
      return;
    }

    setUploadingAvatar(true);
    setMessage(null);

    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const filePath = `${user.id}/avatar.${fileExt}`;

      console.log('[RescueLink Avatar] Uploading profile picture to profile-images bucket:', filePath);

      // Upload file to Supabase Storage (upsert = true to replace previous avatar)
      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('[RescueLink Avatar] Supabase Storage avatar upload failed. Exact error:', uploadError);
        setMessage({ type: 'error', text: `Avatar upload failed: ${uploadError.message}` });
        setUploadingAvatar(false);
        return;
      }

      // Get Public URL
      const { data: publicUrlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      // Append timestamp query parameter to bypass browser caching when updated
      const avatarPublicUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

      console.log('[RescueLink Avatar] Avatar upload succeeded. Public URL:', avatarPublicUrl);

      // Save avatar_url into profiles table
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .upsert(
          {
            auth_user_id: user.id,
            full_name: fullName || profile?.full_name || mockUserProfile.name,
            phone_number: phoneNumber || profile?.phone_number || mockUserProfile.phone,
            blood_group: bloodGroup || profile?.blood_group || 'O-',
            role: role || profile?.role || 'Citizen',
            emergency_contact_name: contactName || profile?.emergency_contact_name || '',
            emergency_contact_phone: contactPhone || profile?.emergency_contact_phone || '',
            emergency_contact_relation: contactRelation || profile?.emergency_contact_relation || '',
            allergies: allergies,
            medical_conditions: medicalConditions,
            avatar_url: avatarPublicUrl,
          },
          { onConflict: 'auth_user_id' }
        );

      setUploadingAvatar(false);

      if (profileUpdateError) {
        console.error('[RescueLink Avatar] Failed to update profiles.avatar_url:', profileUpdateError);
        setMessage({ type: 'error', text: `Failed to save avatar URL: ${profileUpdateError.message}` });
      } else {
        setProfile((prev) => (prev ? { ...prev, avatar_url: avatarPublicUrl } : null));
        setMessage({ type: 'success', text: 'Profile picture updated successfully!' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err: any) {
      console.error('[RescueLink Avatar] Unexpected error during avatar upload:', err);
      setMessage({ type: 'error', text: 'An error occurred while uploading profile picture.' });
      setUploadingAvatar(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setMessage(null);

    const updatedData: ProfileRecord = {
      auth_user_id: user.id,
      full_name: fullName,
      phone_number: phoneNumber,
      blood_group: bloodGroup,
      role: role,
      emergency_contact_name: contactName,
      emergency_contact_phone: contactPhone,
      emergency_contact_relation: contactRelation,
      allergies: allergies,
      medical_conditions: medicalConditions,
      avatar_url: profile?.avatar_url || null,
    };

    console.log('[RescueLink Profile] Executing profile update for user:', user.id, updatedData);

    const { data: savedData, error } = await supabase
      .from('profiles')
      .upsert(updatedData, { onConflict: 'auth_user_id' })
      .select()
      .single();

    setSaving(false);

    if (error) {
      console.error('[RescueLink Profile] Upsert error in public.profiles:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update profile.' });
    } else {
      console.log('[RescueLink Profile] Upsert succeeded in public.profiles:', savedData);
      setProfile(savedData || updatedData);
      setIsEditing(false);
      setMessage({ type: 'success', text: 'Profile updated in Supabase successfully!' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const displayName = profile?.full_name || (user?.email ? user.email.split('@')[0] : mockUserProfile.name);
  const displayPhone = profile?.phone_number || mockUserProfile.phone;
  const displayBlood = profile?.blood_group || 'O-';
  const displayRole = profile?.role ? `${profile.role} Responder` : 'Citizen Responder';
  const emergencyContactName = profile?.emergency_contact_name || mockUserProfile.emergencyContacts[0].name;
  const emergencyContactPhone = profile?.emergency_contact_phone || mockUserProfile.emergencyContacts[0].phone;
  const emergencyContactRelation = profile?.emergency_contact_relation || mockUserProfile.emergencyContacts[0].relation;

  const displayAllergies = profile?.allergies && profile.allergies.trim() !== '' ? profile.allergies : 'Not Provided';
  const displayMedicalConditions = profile?.medical_conditions && profile.medical_conditions.trim() !== '' ? profile.medical_conditions : 'Not Provided';

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar title="Medical Passport & Profile" showBack />

      {/* Hidden File Picker Input for Avatar Upload */}
      <input
        type="file"
        ref={avatarInputRef}
        onChange={handleAvatarSelect}
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
      />

      <main className="flex-1 px-4 py-4 space-y-5">
        {loading && (
          <div className="p-3 bg-secondary/10 text-secondary text-xs font-semibold rounded-2xl flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Fetching live Supabase profile data...</span>
          </div>
        )}

        {message && (
          <div className={`p-3 text-xs font-semibold rounded-2xl flex items-center gap-2 ${
            message.type === 'success' ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-800'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* User Card */}
        <div className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/50 shadow-level-1 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            {/* Interactive Clickable Avatar */}
            <div
              onClick={() => avatarInputRef.current?.click()}
              className="relative w-16 h-16 rounded-full border-2 border-primary/20 shrink-0 cursor-pointer group flex items-center justify-center overflow-hidden bg-primary-fixed text-primary font-extrabold text-xl uppercase shadow-xs hover:border-primary transition-colors"
              title="Tap to change profile picture"
            >
              {uploadingAvatar ? (
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              ) : profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span>{displayName.slice(0, 2)}</span>
              )}

              {/* Camera Icon Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Camera className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-0.5 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-on-surface">{displayName}</h2>
                <span className="text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-full">
                  {displayBlood.split(' ')[0]}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant flex items-center gap-1">
                <Mail className="w-3 h-3 text-secondary" />
                <span>{user?.email || displayPhone}</span>
              </p>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-tertiary pt-0.5">
                <Award className="w-3.5 h-3.5" />
                <span>{displayRole}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-2.5 rounded-2xl bg-surface-container-high hover:bg-surface-container text-secondary transition-colors"
            aria-label="Edit Profile"
          >
            {isEditing ? <X className="w-5 h-5 text-red-600" /> : <Edit2 className="w-5 h-5" />}
          </button>
        </div>

        {/* Edit Form or View Profile */}
        {isEditing ? (
          <form onSubmit={handleUpdateProfile} className="bg-surface-container-lowest p-4 rounded-3xl border border-secondary/40 shadow-level-2 space-y-4">
            <div className="flex items-center justify-between border-b border-surface-container-high pb-2">
              <h3 className="text-xs font-bold text-secondary uppercase tracking-wider">Update Profile Information</h3>
              <span className="text-[10px] bg-secondary-fixed text-secondary font-bold px-2 py-0.5 rounded-full">Supabase Live DB</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-on-surface">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs text-on-surface"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-on-surface">Phone Number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs text-on-surface"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-on-surface">Blood Group</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs font-bold text-primary"
                >
                  <option value="O-">O- (Universal)</option>
                  <option value="O+">O+</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-on-surface">Known Allergies</label>
              <input
                type="text"
                placeholder="e.g. Penicillin, Peanuts (or leave empty)"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs text-on-surface"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-on-surface">Medical Conditions</label>
              <input
                type="text"
                placeholder="e.g. Asthma, Diabetes (or leave empty)"
                value={medicalConditions}
                onChange={(e) => setMedicalConditions(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs text-on-surface"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-on-surface">Responder Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs font-bold text-tertiary"
              >
                <option value="Volunteer">Volunteer Responder</option>
                <option value="Citizen">Citizen</option>
              </select>
            </div>

            <div className="space-y-2 pt-2 border-t border-surface-container-high">
              <label className="text-xs font-bold text-secondary uppercase tracking-wider block">Primary Emergency Contact</label>
              <input
                type="text"
                placeholder="Contact Name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs text-on-surface mb-2"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="tel"
                  placeholder="Phone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs text-on-surface"
                />
                <input
                  type="text"
                  placeholder="Relation"
                  value={contactRelation}
                  onChange={(e) => setContactRelation(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs text-on-surface"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 bg-secondary text-white font-bold text-xs rounded-xl shadow-level-1 hover:bg-secondary/90 transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Supabase Profile</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-3 bg-surface-container-high text-on-surface font-bold text-xs rounded-xl hover:bg-surface-container-highest transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Emergency Medical Passport */}
            <div className="bg-surface-container-lowest p-4 rounded-3xl border border-outline-variant/50 shadow-level-1 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <HeartPulse className="w-4 h-4" />
                  <span>Medical Emergency Passport</span>
                </h3>
                <span className="text-[10px] text-on-surface-variant font-medium">Live Supabase Record</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div className="bg-surface-container-low p-3 rounded-2xl">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase">Blood Type</p>
                  <p className="text-sm font-extrabold text-primary">{displayBlood}</p>
                </div>
                <div className="bg-surface-container-low p-3 rounded-2xl">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase">Known Allergies</p>
                  <p className="text-xs font-bold text-on-surface">{displayAllergies}</p>
                </div>
              </div>

              <div className="bg-surface-container-low p-3 rounded-2xl">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase">Medical Conditions</p>
                <p className="text-xs font-bold text-on-surface">{displayMedicalConditions}</p>
              </div>
            </div>

            {/* Emergency Contacts List */}
            <div className="bg-surface-container-lowest p-4 rounded-3xl border border-outline-variant/50 shadow-level-1 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <PhoneCall className="w-4 h-4" />
                  <span>Emergency Contacts</span>
                </h3>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="text-xs font-bold text-secondary hover:underline"
                >
                  + Edit
                </button>
              </div>

              <div className="space-y-2">
                <div className="bg-surface-container-low p-3 rounded-2xl flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-on-surface">{emergencyContactName}</h4>
                    <p className="text-[11px] text-on-surface-variant">{emergencyContactRelation} • {emergencyContactPhone}</p>
                  </div>
                  <a
                    href={`tel:${emergencyContactPhone}`}
                    className="p-2 bg-secondary text-white rounded-xl shadow-xs hover:bg-secondary/90 transition-colors"
                    aria-label={`Call ${emergencyContactName}`}
                  >
                    <PhoneCall className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Preferences & Settings */}
        <div className="bg-surface-container-lowest p-4 rounded-3xl border border-outline-variant/50 shadow-level-1 space-y-2">
          <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <Settings className="w-4 h-4" />
            <span>App Preferences</span>
          </h3>

          <div className="flex items-center justify-between py-2 border-b border-surface-container-high text-xs">
            <span className="font-semibold text-on-surface">Emergency Siren Sound</span>
            <input type="checkbox" defaultChecked className="w-4 h-4 text-primary rounded" />
          </div>

          <div className="flex items-center justify-between py-2 border-b border-surface-container-high text-xs">
            <span className="font-semibold text-on-surface">Auto-Share Live GPS Location</span>
            <input type="checkbox" defaultChecked className="w-4 h-4 text-primary rounded" />
          </div>

          <div className="flex items-center justify-between py-2 text-xs">
            <span className="font-semibold text-on-surface">Volunteer Push Notifications</span>
            <input type="checkbox" defaultChecked className="w-4 h-4 text-tertiary rounded" />
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleSignOut}
          className="w-full py-3 bg-red-50 text-red-700 font-bold text-xs rounded-2xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2 border border-red-200"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of RescueLink</span>
        </button>
      </main>
    </div>
  );
};
