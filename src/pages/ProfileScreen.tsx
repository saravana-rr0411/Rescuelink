import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import {
  HeartPulse,
  PhoneCall,
  LogOut,
  Mail,
  Loader2,
  Save,
  CheckCircle2,
  AlertCircle,
  Camera,
  ShieldCheck,
  FileText,
  Activity,
  History,
  Bell,
  BookOpen,
  Scale,
  Key,
  Lock,
  ChevronRight,
  User,
  Sparkles,
  Phone,
  Ambulance,
  X,
  Eye,
  EyeOff,
  MapPin,
  WifiOff,
  Globe,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import type { UserProfile } from '../context/ProfileContext';
import { useNotifications } from '../context/NotificationContext';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '../components/common/LanguageSelector';
import { createRipple } from '../utils/ripple';

export const ProfileScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, updatePassword } = useAuth();
  const { profile: globalProfile, refreshProfile } = useProfile();
  const { unreadCount } = useNotifications();
  const { t } = useTranslation();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const profileCardRef = useRef<HTMLDivElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(globalProfile);
  const [loading, setLoading] = useState(!globalProfile);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Dialog & Modal States
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showPrivacySecurity, setShowPrivacySecurity] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  
  // Password State
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Statistics State
  const [stats, setStats] = useState({
    totalReports: 0,
    activeCases: 0,
    completedCases: 0,
    totalRescues: 0,
    activeRescues: 0,
    completedRescues: 0,
    avgResponseTime: '3.8 mins',
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Form states for editing
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O-');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRelation, setContactRelation] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');

  // Auto-open edit mode if navigated with state.edit === true
  useEffect(() => {
    if (location.state && (location.state as any).edit) {
      setIsEditing(true);
    }
  }, [location.state]);

  const populateForm = useCallback((data: UserProfile) => {
    setFullName(data.full_name || '');
    setPhoneNumber(data.phone_number || '');
    setBloodGroup(data.blood_group || 'O-');
    setContactName(data.emergency_contact_name || '');
    setContactPhone(data.emergency_contact_phone || '');
    setContactRelation(data.emergency_contact_relation || '');
    setAllergies(data.allergies || '');
    setMedicalConditions(data.medical_conditions || '');
  }, []);

  // Fetch profile & statistics from Supabase
  useEffect(() => {
    async function loadProfileAndStats() {
      if (!user) {
        setLoading(false);
        setLoadingStats(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch Profile
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_user_id', user.id)
          .single();

        if (data && !error) {
          setProfile(data);
          populateForm(data);
        } else {
          const fallback: UserProfile = {
            auth_user_id: user.id,
            full_name: user.email ? user.email.split('@')[0] : 'RescueLink User',
            phone_number: '',
            blood_group: 'O-',
            emergency_contact_name: '',
            emergency_contact_phone: '',
            emergency_contact_relation: '',
            allergies: '',
            medical_conditions: '',
            avatar_url: null,
          };
          setProfile(fallback);
          populateForm(fallback);
        }

        // Fetch User Statistics (Citizen reports & Volunteer rescues)
        const { data: userAccidents } = await supabase
          .from('accidents')
          .select('*')
          .or(`reporter_id.eq.${user.id},volunteer_id.eq.${user.id}`);

        if (userAccidents) {
          const reports = userAccidents.filter((a) => a.reporter_id === user.id);
          const rescues = userAccidents.filter((a) => a.volunteer_id === user.id);

          const inactiveStatuses = [
            'Emergency Completed',
            'Emergency Resolved',
            'Completed',
            'Problem Resolved',
            'Resolved',
          ];

          const activeReports = reports.filter((a) => !inactiveStatuses.includes(a.status));
          const completedReports = reports.filter((a) => inactiveStatuses.includes(a.status));

          const activeRescuesList = rescues.filter((a) => !inactiveStatuses.includes(a.status));
          const completedRescuesList = rescues.filter((a) => inactiveStatuses.includes(a.status));

          setStats({
            totalReports: reports.length,
            activeCases: activeReports.length,
            completedCases: completedReports.length,
            totalRescues: rescues.length,
            activeRescues: activeRescuesList.length,
            completedRescues: completedRescuesList.length,
            avgResponseTime: rescues.length > 0 ? '2.5 mins' : '3.8 mins',
          });
        }
      } catch (err) {
        console.error('[RescueLink Profile] Error loading profile/stats:', err);
      } finally {
        setLoading(false);
        setLoadingStats(false);
      }
    }

    loadProfileAndStats();
  }, [user, populateForm]);

  const showToast = (msg: string) => {
    setSnackbarMessage(msg);
    setTimeout(() => {
      setSnackbarMessage(null);
    }, 3000);
  };

  // Avatar Upload Handler
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

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) {
        setMessage({ type: 'error', text: `Avatar upload failed: ${uploadError.message}` });
        setUploadingAvatar(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      const avatarPublicUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .upsert(
          {
            auth_user_id: user.id,
            full_name: fullName || profile?.full_name || (user?.email ? user.email.split('@')[0] : 'User'),
            phone_number: phoneNumber || profile?.phone_number || '',
            blood_group: bloodGroup || profile?.blood_group || 'O-',
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
        setMessage({ type: 'error', text: `Failed to save avatar URL: ${profileUpdateError.message}` });
      } else {
        setProfile((prev) => (prev ? { ...prev, avatar_url: avatarPublicUrl } : null));
        await refreshProfile();
        showToast('Profile photo updated successfully!');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'An error occurred while uploading profile picture.' });
      setUploadingAvatar(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!fullName.trim()) {
      setMessage({ type: 'error', text: 'Full Name cannot be empty.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    const updatedData: UserProfile = {
      auth_user_id: user.id,
      full_name: fullName.trim(),
      phone_number: phoneNumber.trim(),
      blood_group: bloodGroup,
      emergency_contact_name: contactName.trim(),
      emergency_contact_phone: contactPhone.trim(),
      emergency_contact_relation: contactRelation.trim(),
      allergies: allergies.trim(),
      medical_conditions: medicalConditions.trim(),
      avatar_url: profile?.avatar_url || null,
    };

    const { data: savedData, error } = await supabase
      .from('profiles')
      .upsert(updatedData, { onConflict: 'auth_user_id' })
      .select()
      .single();

    setSaving(false);

    if (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile.' });
    } else {
      setProfile(savedData || updatedData);
      await refreshProfile();
      setIsEditing(false);
      showToast('Profile updated successfully!');
    }
  };

  const handleCancelEdit = () => {
    if (profile) {
      populateForm(profile);
    }
    setIsEditing(false);
  };

  const handleTriggerEditMode = () => {
    setIsEditing(true);
    if (profileCardRef.current) {
      profileCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleConfirmSignOut = async () => {
    setShowLogoutConfirm(false);
    await signOut();
    navigate('/login');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      showToast('Please fill in all password fields.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('Passwords do not match.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      showToast('Password must be at least 6 characters.');
      return;
    }

    setIsUpdatingPassword(true);
    const { error } = await updatePassword(passwordForm.newPassword);
    setIsUpdatingPassword(false);

    if (error) {
      showToast(error.message || 'Failed to update password.');
    } else {
      showToast('Password updated successfully.');
      setShowChangePassword(false);
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    }
  };

  const displayName = profile?.full_name || (user?.email ? user.email.split('@')[0] : 'RescueLink User');
  const displayPhone = profile?.phone_number || 'No Phone Added';
  const displayBlood = profile?.blood_group || 'O-';
  const isVolunteer = stats.totalRescues > 0;
  const userRoleText = isVolunteer ? t('profile.volunteerResponder') : t('profile.citizenResponder');

  const hasEmergencyContact = Boolean(
    profile?.emergency_contact_name?.trim() && profile?.emergency_contact_phone?.trim()
  );
  const emergencyContactName = profile?.emergency_contact_name?.trim() || '';
  const emergencyContactPhone = profile?.emergency_contact_phone?.trim() || '';
  const emergencyContactRelation = profile?.emergency_contact_relation?.trim() || '';

  const displayAllergies = profile?.allergies && profile.allergies.trim() !== '' ? profile.allergies : 'None Reported';
  const displayMedicalConditions = profile?.medical_conditions && profile.medical_conditions.trim() !== '' ? profile.medical_conditions : 'None Reported';

  return (
    <div className="flex flex-col min-h-full bg-surface select-none">
      <Navbar title={t('profile.myProfile')} showBack />

      {/* Hidden File Input for Avatar Upload */}
      <input
        type="file"
        ref={avatarInputRef}
        onChange={handleAvatarSelect}
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
      />

      <main className="flex-1 px-4 py-4 space-y-4 max-w-md mx-auto w-full">
        {loading && (
          <div className="p-3 bg-primary/10 text-primary text-xs font-semibold rounded-2xl flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>{t('profile.loadingProfile')}</span>
          </div>
        )}

        {/* Floating Toast Snackbar Notification */}
        {snackbarMessage && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-4 py-2.5 rounded-full text-xs font-bold shadow-2xl border border-slate-700/80 flex items-center gap-2 animate-in fade-in zoom-in duration-200">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{snackbarMessage}</span>
          </div>
        )}

        {message && (
          <div
            className={`p-3 text-xs font-semibold rounded-2xl flex items-center gap-2 ${
              message.type === 'success' ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 1. PROFILE HEADER CARD (Inline Expanding Edit Mode) */}
        {/* ========================================================================= */}
        <div
          ref={profileCardRef}
          className={`bg-surface-container-lowest rounded-3xl border shadow-level-1 relative overflow-hidden transition-all duration-300 ease-in-out ${
            isEditing
              ? 'border-primary/50 ring-2 ring-primary/20 p-5'
              : 'border-outline-variant/60 p-5'
          }`}
        >
          {!isEditing ? (
            /* READ-ONLY VIEW MODE */
            <div className="flex items-center gap-4">
              {/* Circular Profile Photo */}
              <div
                onClick={(e) => {
                  createRipple(e);
                  avatarInputRef.current?.click();
                }}
                className="relative w-18 h-18 rounded-full ring-4 ring-primary/20 shrink-0 cursor-pointer group flex items-center justify-center overflow-hidden bg-gradient-to-br from-red-600 to-rose-700 text-white font-black text-2xl uppercase shadow-md hover:ring-primary transition-all aspect-square"
                title={t('profile.tapAvatar')}
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-6 h-6 animate-spin text-white shrink-0" />
                ) : profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={displayName}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover shrink-0 rounded-full aspect-square"
                  />
                ) : (
                  <span>{displayName.slice(0, 2)}</span>
                )}

                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white rounded-full">
                  <Camera className="w-5 h-5 shrink-0" />
                </div>
              </div>

              {/* Info & Edit trigger button */}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <h2 className="text-base sm:text-lg font-black text-on-surface truncate leading-tight">
                      {displayName}
                    </h2>
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full shrink-0">
                      <ShieldCheck className="w-3 h-3 text-emerald-700" />
                      Verified
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      createRipple(e);
                      handleTriggerEditMode();
                    }}
                    className="px-2.5 py-1 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-colors shrink-0 flex items-center gap-1 active:scale-95"
                    title={t('profile.editProfile')}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>{t('profile.edit')}</span>
                  </button>
                </div>

                <p className="text-xs text-on-surface-variant font-medium flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">{user?.email || 'Registered User'}</span>
                </p>

                <p className="text-xs text-on-surface-variant font-medium flex items-center gap-1.5 truncate">
                  <Phone className="w-3.5 h-3.5 text-secondary shrink-0" />
                  <span className="truncate">{displayPhone}</span>
                </p>

                <div className="pt-1 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-extrabold bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full uppercase">
                    {userRoleText}
                  </span>
                  <span className="text-[10px] font-extrabold bg-rose-100 text-rose-900 border border-rose-200 px-2 py-0.5 rounded-full">
                    Blood: {displayBlood}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* EDITABLE INLINE EXPANDED FORM */
            <form
              onSubmit={handleUpdateProfile}
              className="space-y-4 animate-in fade-in duration-300"
            >
              <div className="flex items-center justify-between border-b border-surface-container-high pb-2">
                <h3 className="text-xs font-black text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-primary" />
                  <span>{t('profile.editProfileDetails')}</span>
                </h3>
                <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                  Editing Mode
                </span>
              </div>

              {/* Avatar Change Row */}
              <div className="flex items-center gap-4 bg-surface-container-low p-3 rounded-2xl border border-outline-variant/40">
                <div
                  onClick={(e) => {
                    createRipple(e);
                    avatarInputRef.current?.click();
                  }}
                  className="relative w-14 h-14 rounded-full ring-2 ring-primary shrink-0 cursor-pointer group flex items-center justify-center overflow-hidden bg-gradient-to-br from-red-600 to-rose-700 text-white font-black text-xl uppercase shadow-xs aspect-square"
                  title={t('profile.tapAvatar')}
                >
                  {uploadingAvatar ? (
                    <Loader2 className="w-5 h-5 animate-spin text-white shrink-0" />
                  ) : profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={displayName}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover shrink-0 rounded-full aspect-square"
                    />
                  ) : (
                    <span>{displayName.slice(0, 2)}</span>
                  )}

                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white rounded-full">
                    <Camera className="w-4 h-4 shrink-0" />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-on-surface">{t('profile.profilePhoto')}</p>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="text-[11px] font-extrabold text-primary hover:underline flex items-center gap-1"
                  >
                    <Camera className="w-3 h-3" />
                    <span>{t('profile.uploadPhoto')}</span>
                  </button>
                </div>
              </div>

              {/* Read-Only Email Field */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-on-surface-variant flex items-center gap-1">
                  <Mail className="w-3 h-3 text-outline" />
                  <span>{t('profile.emailReadOnly')}</span>
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  readOnly
                  disabled
                  className="w-full px-3 py-2 bg-surface-container-high/60 border border-outline-variant/40 rounded-xl text-xs text-on-surface-variant font-medium cursor-not-allowed"
                />
              </div>

              {/* Editable Full Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-on-surface flex items-center gap-1">
                  <User className="w-3 h-3 text-primary" />
                  <span>{t('profile.fullName')}</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder={t('profile.enterFullName')}
                  className="w-full px-3 py-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs text-on-surface font-medium focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>

              {/* Editable Phone Number & Blood Group */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-on-surface flex items-center gap-1">
                    <Phone className="w-3 h-3 text-secondary" />
                    <span>{t('profile.phoneNumber')}</span>
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    placeholder={t('profile.phonePlaceholder')}
                    className="w-full px-3 py-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs text-on-surface font-medium focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-on-surface">{t('profile.bloodGroup')}</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs font-bold text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  >
                    <option value="O-">{t('profile.bloodUniversal')}</option>
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

              {/* Medical Passport Details */}
              <div className="space-y-2 pt-2 border-t border-surface-container-high">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-on-surface">{t('profile.knownAllergies')}</label>
                  <input
                    type="text"
                    placeholder={t('profile.allergiesPlaceholder')}
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs text-on-surface font-medium focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-on-surface">{t('profile.medicalConditions')}</label>
                  <input
                    type="text"
                    placeholder={t('profile.conditionsPlaceholder')}
                    value={medicalConditions}
                    onChange={(e) => setMedicalConditions(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs text-on-surface font-medium focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>
              </div>

              {/* Primary Emergency Contact */}
              <div className="space-y-2 pt-2 border-t border-surface-container-high">
                <label className="text-[11px] font-black text-secondary uppercase tracking-wider block">
                  Primary Emergency Contact
                </label>
                <input
                  type="text"
                  placeholder={t('profile.contactName')}
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs text-on-surface font-medium mb-1.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="tel"
                    placeholder={t('profile.phoneNumber')}
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs text-on-surface font-medium focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                  <input
                    type="text"
                    placeholder={t('profile.relation')}
                    value={contactRelation}
                    onChange={(e) => setContactRelation(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs text-on-surface font-medium focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>
              </div>

              {/* TWO BOTTOM ACTION BUTTONS: CANCEL & SAVE CHANGES */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-surface-container-high">
                <button
                  type="button"
                  onClick={(e) => {
                    createRipple(e);
                    handleCancelEdit();
                  }}
                  className="py-2.5 px-4 bg-surface-container-high hover:bg-surface-container text-on-surface font-bold text-xs rounded-xl transition-colors text-center btn-press active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  onClick={(e) => createRipple(e)}
                  className="py-2.5 px-4 bg-primary hover:bg-primary/90 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{t('profile.saveChanges')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 2. MY STATISTICS SECTION */}
        {/* ========================================================================= */}
        <div className="space-y-2">
          <h3 className="text-xs font-black text-on-surface uppercase tracking-wider px-1 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-primary" />
            <span>{t('profile.stats.myStatistics')}</span>
          </h3>

          {loadingStats ? (
            <div className="grid grid-cols-3 gap-2.5">
              <div className="h-20 bg-surface-container-low rounded-2xl animate-pulse"></div>
              <div className="h-20 bg-surface-container-low rounded-2xl animate-pulse"></div>
              <div className="h-20 bg-surface-container-low rounded-2xl animate-pulse"></div>
            </div>
          ) : isVolunteer ? (
            <div className="grid grid-cols-3 gap-2.5">
              {/* Volunteer Stat 1: Total Rescues */}
              <div className="bg-surface-container-lowest p-3 rounded-2xl border border-outline-variant/60 shadow-xs flex flex-col justify-between space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase">{t('profile.stats.total')}</span>
                  <Ambulance className="w-4 h-4 text-primary" />
                </div>
                <p className="text-lg font-black text-on-surface">{stats.totalRescues}</p>
                <p className="text-[10px] text-on-surface-variant font-medium">{t('profile.stats.rescues')}</p>
              </div>

              {/* Volunteer Stat 2: Active Rescues */}
              <div className="bg-surface-container-lowest p-3 rounded-2xl border border-outline-variant/60 shadow-xs flex flex-col justify-between space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-700 uppercase">{t('profile.stats.active')}</span>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                </div>
                <p className="text-lg font-black text-amber-700">{stats.activeRescues}</p>
                <p className="text-[10px] text-on-surface-variant font-medium">{t('profile.stats.inProgress')}</p>
              </div>

              {/* Volunteer Stat 3: Completed Rescues */}
              <div className="bg-surface-container-lowest p-3 rounded-2xl border border-outline-variant/60 shadow-xs flex flex-col justify-between space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">{t('profile.stats.completed')}</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-lg font-black text-emerald-700">{stats.completedRescues}</p>
                <p className="text-[10px] text-on-surface-variant font-medium">{t('profile.stats.resolved')}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {/* Citizen Stat 1: Total Reports */}
              <div className="bg-surface-container-lowest p-3 rounded-2xl border border-outline-variant/60 shadow-xs flex flex-col justify-between space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase">{t('profile.stats.reports')}</span>
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <p className="text-lg font-black text-on-surface">{stats.totalReports}</p>
                <p className="text-[10px] text-on-surface-variant font-medium font-sans">{t('profile.stats.totalSos')}</p>
              </div>

              {/* Citizen Stat 2: Active Cases */}
              <div className="bg-surface-container-lowest p-3 rounded-2xl border border-outline-variant/60 shadow-xs flex flex-col justify-between space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-700 uppercase">{t('profile.stats.active')}</span>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                </div>
                <p className="text-lg font-black text-amber-700">{stats.activeCases}</p>
                <p className="text-[10px] text-on-surface-variant font-medium">{t('profile.stats.liveStatus')}</p>
              </div>

              {/* Citizen Stat 3: Completed Cases */}
              <div className="bg-surface-container-lowest p-3 rounded-2xl border border-outline-variant/60 shadow-xs flex flex-col justify-between space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">{t('profile.stats.resolved')}</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-lg font-black text-emerald-700">{stats.completedCases}</p>
                <p className="text-[10px] text-on-surface-variant font-medium">{t('profile.stats.completed')}</p>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 3. QUICK ACCESS SECTION */}
        {/* ========================================================================= */}
        <div className="space-y-2">
          <h3 className="text-xs font-black text-on-surface uppercase tracking-wider px-1">
            {t('profile.quickAccess', { defaultValue: 'Quick Access' })}
          </h3>

          <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/60 shadow-level-1 overflow-hidden divide-y divide-surface-container-high">
            {/* My History */}
            <div
              onClick={(e) => {
                createRipple(e);
                navigate('/history');
              }}
              className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-surface-container-low transition-colors group active:scale-[0.99] ripple-container"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-on-surface">{t('profile.history.title')}</h4>
                  <p className="text-[10px] text-on-surface-variant">{t('profile.historyDesc')}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-outline group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>

            {/* Notifications */}
            <div
              onClick={(e) => {
                createRipple(e);
                navigate('/notifications');
              }}
              className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-surface-container-low transition-colors group active:scale-[0.99] ripple-container"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 relative">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-white"></span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-on-surface">{t('profile.notifications')}</h4>
                    {unreadCount > 0 && (
                      <span className="text-[9px] font-extrabold bg-red-600 text-white px-1.5 py-0.2 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-on-surface-variant truncate">{t('profile.notificationsDesc')}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-outline group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>

            {/* First Aid Guide */}
            <div
              onClick={(e) => {
                createRipple(e);
                navigate('/first-aid');
              }}
              className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-surface-container-low transition-colors group active:scale-[0.99] ripple-container"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-on-surface">{t('profile.firstAidGuide')}</h4>
                  <p className="text-[10px] text-on-surface-variant">{t('profile.firstAidGuideDesc')}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-outline group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>

            {/* Good Samaritan Guide */}
            <div
              onClick={(e) => {
                createRipple(e);
                navigate('/good-samaritan');
              }}
              className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-surface-container-low transition-colors group active:scale-[0.99] ripple-container"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-on-surface">{t('profile.goodSamaritanGuide')}</h4>
                  <p className="text-[10px] text-on-surface-variant">{t('profile.goodSamaritanGuideDesc')}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-outline group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. ACCOUNT SECTION */}
        {/* ========================================================================= */}
        <div className="space-y-2">
          <h3 className="text-xs font-black text-on-surface uppercase tracking-wider px-1">
            {t('profile.accountSecurity')}
          </h3>

          <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/60 shadow-level-1 overflow-hidden divide-y divide-surface-container-high">
            {/* Edit Profile */}
            <div
              onClick={(e) => {
                createRipple(e);
                handleTriggerEditMode();
              }}
              className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-surface-container-low transition-colors group active:scale-[0.99] ripple-container"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-on-surface">{t('profile.editProfile')}</h4>
                  <p className="text-[10px] text-on-surface-variant">{t('profile.editProfileDesc')}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-outline group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>

            {/* Language */}
            <div
              onClick={(e) => {
                createRipple(e);
                setShowLanguageModal(true);
              }}
              className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-surface-container-low transition-colors group active:scale-[0.99] ripple-container"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-on-surface">{t('profile.languageAndRegion')}</h4>
                  <p className="text-[10px] text-on-surface-variant">{t('profile.changeLanguage')}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-outline group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>

            {/* Change Password */}
            <div
              onClick={(e) => {
                createRipple(e);
                setShowChangePassword(true);
              }}
              className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-surface-container-low transition-colors group active:scale-[0.99] ripple-container"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-on-surface">{t('profile.changePassword')}</h4>
                  <p className="text-[10px] text-on-surface-variant">{t('profile.changePasswordDesc')}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-outline group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>

            {/* Privacy & Security */}
            <div
              onClick={(e) => {
                createRipple(e);
                setShowPrivacySecurity(true);
              }}
              className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-surface-container-low transition-colors group active:scale-[0.99] ripple-container"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-on-surface">{t('profile.privacySecurity')}</h4>
                  <p className="text-[10px] text-on-surface-variant">{t('profile.privacySecurityDesc')}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-outline group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>
          </div>
        </div>


        {/* ========================================================================= */}
        {/* MEDICAL PASSPORT & CONTACTS DETAIL CARD (View Mode) */}
        {/* ========================================================================= */}
        {!isEditing && (
          <div className="space-y-3 pt-1">
            <div className="bg-surface-container-lowest p-4 rounded-3xl border border-outline-variant/60 shadow-level-1 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <HeartPulse className="w-4 h-4" />
                  <span>{t('profile.medicalPassport')}</span>
                </h3>
                <span className="text-[10px] text-on-surface-variant font-medium">Supabase Live DB</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-surface-container-low p-3 rounded-2xl">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase">{t('profile.bloodGroup')}</p>
                  <p className="text-sm font-black text-primary">{displayBlood}</p>
                </div>
                <div className="bg-surface-container-low p-3 rounded-2xl">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase">{t('profile.knownAllergies')}</p>
                  <p className="text-xs font-bold text-on-surface truncate">{displayAllergies}</p>
                </div>
              </div>

              <div className="bg-surface-container-low p-3 rounded-2xl">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase">{t('profile.medicalConditions')}</p>
                <p className="text-xs font-bold text-on-surface">{displayMedicalConditions}</p>
              </div>
            </div>

            {/* Emergency Contacts List */}
            <div className="bg-surface-container-lowest p-4 rounded-3xl border border-outline-variant/60 shadow-level-1 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <PhoneCall className="w-4 h-4" />
                  <span>{t('profile.emergencyContacts')}</span>
                </h3>
                <button
                  onClick={handleTriggerEditMode}
                  className="text-xs font-bold text-secondary hover:underline"
                >
                  {hasEmergencyContact ? t('profile.editAdd') : t('profile.addOption')}
                </button>
              </div>

              {hasEmergencyContact ? (
                <div className="bg-surface-container-low p-3 rounded-2xl flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-on-surface">{emergencyContactName}</h4>
                    <p className="text-[11px] text-on-surface-variant">
                      {emergencyContactRelation ? `${emergencyContactRelation} • ` : ''}{emergencyContactPhone}
                    </p>
                  </div>
                  <a
                    href={`tel:${emergencyContactPhone}`}
                    className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs hover:bg-blue-700 transition-colors active:scale-95"
                    aria-label={`Call ${emergencyContactName}`}
                  >
                    <PhoneCall className="w-4 h-4" />
                  </a>
                </div>
              ) : (
                <div className="bg-surface-container-low p-4 rounded-2xl text-center space-y-2">
                  <p className="text-xs text-on-surface-variant font-medium">{t('home.noContacts', { defaultValue: 'No emergency contacts added.' })}</p>
                  <button
                    onClick={handleTriggerEditMode}
                    className="px-3.5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-blue-700 transition-colors active:scale-95"
                  >
                    {t('home.addEmergencyContact', { defaultValue: 'Add Emergency Contact' })}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}


        {/* ========================================================================= */}
        {/* 6. LOGOUT BUTTON & CONFIRMATION DIALOG */}
        {/* ========================================================================= */}
        <button
          onClick={(e) => {
            createRipple(e);
            setShowLogoutConfirm(true);
          }}
          className="w-full py-3.5 bg-red-50 hover:bg-red-100 text-red-700 font-extrabold text-xs rounded-2xl transition-colors flex items-center justify-center gap-2 border border-red-200 shadow-xs btn-press active:scale-[0.98] ripple-container"
        >
          <LogOut className="w-4 h-4 text-red-600" />
          <span>{t('profile.signOut')}</span>
        </button>

        {/* ========================================================================= */}
        {/* 7. FOOTER */}
        {/* ========================================================================= */}
        <footer className="text-center space-y-1 pt-4 pb-2 text-[11px] text-on-surface-variant/60 font-medium">
          <p className="font-bold text-on-surface-variant/80">RescueLink v1.0.0</p>
          <p>Made with ❤️ for Emergency Response</p>
        </footer>
      </main>

      {/* ========================================================================= */}
      {/* LOGOUT CONFIRMATION DIALOG MODAL */}
      {/* ========================================================================= */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-surface rounded-3xl p-6 max-w-xs w-full shadow-2xl border border-outline-variant/60 space-y-4 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto shadow-xs">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-on-surface">{t('profile.signOut')}</h3>
              <p className="text-xs text-on-surface-variant font-medium">
                Are you sure you want to logout?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="py-2.5 px-4 bg-surface-container-high hover:bg-surface-container text-on-surface text-xs font-extrabold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSignOut}
                className="py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all active:scale-95"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {showChangePassword && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-surface rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-outline-variant/60 space-y-4 text-left animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-surface-container-high pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold shadow-xs">
                  <Key className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-on-surface">{t('profile.settings.changePassword')}</h3>
              </div>
              <button
                onClick={() => setShowChangePassword(false)}
                className="p-1 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase">{t('profile.settings.newPassword')}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                    className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl pl-10 pr-10 py-2.5 text-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder={t('profile.settings.passwordMin')}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface-variant transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase">{t('profile.settings.confirmPassword')}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                    className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl pl-10 pr-10 py-2.5 text-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder={t('profile.settings.confirmPasswordPlaceholder')}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
              >
                {isUpdatingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isUpdatingPassword ? 'Updating...' : 'Update Password'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PRIVACY & SECURITY MODAL */}
      {showPrivacySecurity && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-surface rounded-3xl p-5 max-w-md w-full shadow-2xl border border-outline-variant/60 space-y-4 text-left animate-in zoom-in-95 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-surface-container-high pb-3 sticky top-0 bg-surface z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold shadow-xs">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-on-surface">{t('profile.settings.privacySecurity')}</h3>
              </div>
              <button
                onClick={() => setShowPrivacySecurity(false)}
                className="p-1 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-on-surface-variant font-medium leading-relaxed">
                This application handles sensitive emergency data. Below is exactly how your data is used and protected.
              </p>

              {/* LOCATION PRIVACY */}
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <h4 className="font-bold text-slate-900 text-sm">{t('profile.settings.locationPrivacy')}</h4>
                </div>
                <ul className="list-disc list-inside text-slate-600 space-y-1 font-medium ml-1">
                  <li>{t('profile.settings.locationPrivacyDesc1')}</li>
                  <li>{t('profile.settings.locationPrivacyDesc2')}</li>
                  <li>{t('profile.settings.locationPrivacyDesc3')}</li>
                  <li>{t('profile.settings.locationPrivacyDesc4')}</li>
                </ul>
              </div>

              {/* EMERGENCY DATA */}
              <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100/50">
                <div className="flex items-center gap-2 mb-2">
                  <HeartPulse className="w-4 h-4 text-rose-600" />
                  <h4 className="font-bold text-slate-900 text-sm">{t('profile.settings.emergencyData')}</h4>
                </div>
                <ul className="list-disc list-inside text-slate-600 space-y-1 font-medium ml-1">
                  <li>{t('profile.settings.emergencyDataDesc1')}</li>
                  <li>{t('profile.settings.emergencyDataDesc2')}</li>
                  <li>{t('profile.settings.emergencyDataDesc3')}</li>
                </ul>
              </div>

              {/* OFFLINE DATA */}
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
                <div className="flex items-center gap-2 mb-2">
                  <WifiOff className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-bold text-slate-900 text-sm">{t('profile.settings.offlineData')}</h4>
                </div>
                <p className="text-slate-600 font-medium mb-1.5 ml-1">{t('profile.settings.offlineDataDesc1')}</p>
                <ul className="list-disc list-inside text-slate-600 space-y-1 font-medium ml-1">
                  <li>{t('profile.settings.offlineDataDesc2')}</li>
                  <li>{t('profile.settings.offlineDataDesc3')}</li>
                  <li>{t('profile.settings.offlineDataDesc4')}</li>
                  <li>{t('profile.settings.offlineDataDesc5')}</li>
                </ul>
                <p className="text-slate-500 font-medium mt-1.5 text-[10px] italic ml-1">{t('profile.settings.offlineDataDesc6')}</p>
              </div>

              {/* ACCOUNT SECURITY */}
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/60">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-slate-700" />
                  <h4 className="font-bold text-slate-900 text-sm">{t('profile.accountSecurity')}</h4>
                </div>
                <ul className="list-disc list-inside text-slate-600 space-y-1 font-medium ml-1">
                  <li>{t('profile.settings.accountSecuritySub')}</li>
                  <li>{t('profile.settings.accountSecuritySub2')}</li>
                  <li>{t('profile.settings.accountSecuritySub3')}</li>
                </ul>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowPrivacySecurity(false)}
                className="w-full py-2.5 bg-surface-container-high hover:bg-surface-container text-on-surface font-extrabold text-xs rounded-xl transition-colors shadow-sm"
              >
                Close Information
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Language Modal */}
      {showLanguageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm animate-scale-up">
            <LanguageSelector onClose={() => setShowLanguageModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileScreen;
