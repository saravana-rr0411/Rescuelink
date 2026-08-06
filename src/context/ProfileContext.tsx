import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

export interface UserProfile {
  id?: string;
  auth_user_id?: string;
  full_name: string;
  phone_number: string;
  blood_group: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  allergies?: string;
  medical_conditions?: string;
  avatar_url?: string | null;
}

interface ProfileContextType {
  profile: UserProfile | null;
  avatarUrl: string | null;
  loadingProfile: boolean;
  refreshProfile: () => Promise<UserProfile | null>;
  setProfileState: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const fetchProfile = useCallback(async (): Promise<UserProfile | null> => {
    if (!user) {
      setProfile(null);
      setLoadingProfile(false);
      return null;
    }

    try {
      console.log('[RescueLink ProfileContext] Fetching user profile from Supabase:', user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('[RescueLink ProfileContext] Fetch error:', error.message);
      }

      if (data) {
        setProfile(data as UserProfile);
        return data as UserProfile;
      } else {
        // First-time login (e.g. Google OAuth): Auto-create user profile in Supabase
        const defaultProfile: UserProfile = {
          auth_user_id: user.id,
          full_name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            (user.email ? user.email.split('@')[0] : 'RescueLink User'),
          phone_number: user.user_metadata?.phone_number || '',
          blood_group: 'O-',
          emergency_contact_name: '',
          emergency_contact_phone: '',
          emergency_contact_relation: '',
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        };

        const { data: createdData, error: createError } = await supabase
          .from('profiles')
          .upsert(defaultProfile, { onConflict: 'auth_user_id' })
          .select()
          .single();

        if (!createError && createdData) {
          setProfile(createdData as UserProfile);
          return createdData as UserProfile;
        } else {
          setProfile(defaultProfile);
          return defaultProfile;
        }
      }
    } catch (err) {
      console.error('[RescueLink ProfileContext] Unexpected error fetching profile:', err);
    } finally {
      setLoadingProfile(false);
    }
    return null;
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Realtime subscription for public.profiles updates
  useEffect(() => {
    if (!user) return;

    console.log('[RescueLink ProfileContext] Subscribing to profiles realtime updates for user:', user.id);

    const channel = supabase
      .channel(`user_profile_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `auth_user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[RescueLink ProfileContext] Realtime profile update received:', payload);
          if (payload.new) {
            setProfile(payload.new as UserProfile);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const avatarUrl = profile?.avatar_url || null;

  return (
    <ProfileContext.Provider
      value={{
        profile,
        avatarUrl,
        loadingProfile,
        refreshProfile: fetchProfile,
        setProfileState: setProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
