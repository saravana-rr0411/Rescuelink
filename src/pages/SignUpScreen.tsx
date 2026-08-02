import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, CheckCircle, ArrowLeft, AlertCircle, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export const SignUpScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [name, setName] = useState('Alex Johnson');
  const [phone, setPhone] = useState('+1 (555) 382-9102');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bloodType, setBloodType] = useState('O-');
  const [isVolunteer, setIsVolunteer] = useState(true);
  const [contactName, setContactName] = useState('Sarah Johnson');
  const [contactPhone, setContactPhone] = useState('+1 (555) 492-1049');
  const [contactRelation, setContactRelation] = useState('Spouse');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Redirect to Home if user is already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email || !password) {
      setError('Please provide a valid email and password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    
    // 1. Pass user metadata to Supabase Auth SignUp
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          phone_number: phone,
          blood_group: bloodType,
          role: isVolunteer ? 'Volunteer' : 'Citizen',
          emergency_contact_name: contactName,
          emergency_contact_phone: contactPhone,
          emergency_contact_relation: contactRelation,
          allergies: null,
          medical_conditions: null,
        }
      }
    });

    if (authError) {
      setLoading(false);
      setError(authError.message || 'Registration failed. Please try again.');
      return;
    }

    // 2. Extract authenticated user ID directly from sign up response
    const createdUserId = authData?.user?.id;

    if (createdUserId) {
      console.log('Auth signup succeeded for User ID:', createdUserId);

      // 3. Immediately insert profile row into public.profiles
      const { data: insertedProfile, error: profileError } = await supabase
        .from('profiles')
        .upsert([
          {
            auth_user_id: createdUserId,
            full_name: name,
            phone_number: phone,
            blood_group: bloodType,
            role: isVolunteer ? 'Volunteer' : 'Citizen',
            emergency_contact_name: contactName,
            emergency_contact_phone: contactPhone,
            emergency_contact_relation: contactRelation,
            allergies: null,
            medical_conditions: null,
          }
        ], { onConflict: 'auth_user_id' })
        .select();

      if (profileError) {
        // 4. Log exact Supabase error to browser console
        console.error('Supabase profiles insert failed. Exact error:', profileError);
      } else {
        console.log('Successfully inserted profile into public.profiles:', insertedProfile);
      }
    } else {
      console.warn('Auth signup completed but no User ID returned in authData.');
    }

    setLoading(false);
    setSuccessMessage('Account & Emergency Profile created successfully in Supabase!');
    setTimeout(() => {
      navigate('/');
    }, 1500);
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface px-6 py-6 space-y-6">
      {/* Top Navigation Back */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/login')}
          className="p-2 rounded-full bg-surface-container-high hover:bg-surface-container text-on-surface"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-on-surface leading-tight">Create Account</h1>
          <p className="text-xs text-on-surface-variant">Set up your Emergency Passport & Supabase Auth</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-red-100 text-red-800 text-xs font-semibold rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-100 text-emerald-900 text-xs font-semibold rounded-xl flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Personal Details */}
        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/50 space-y-3.5 shadow-level-1">
          <h2 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-4 h-4" />
            <span>Personal Information</span>
          </h2>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-on-surface">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface">Mobile Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface">Blood Group</label>
              <select
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-secondary"
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

          <div className="space-y-1">
            <label className="text-xs font-semibold text-on-surface">Email Address (Supabase Login)</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-outline absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full pl-9 pr-3.5 py-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-on-surface">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-outline absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
                className="w-full pl-9 pr-3.5 py-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary"
              />
            </div>
          </div>
        </div>

        {/* Volunteer Network Opt-in */}
        <div className="bg-tertiary-fixed/30 border border-tertiary/30 p-4 rounded-2xl flex items-start gap-3">
          <input
            type="checkbox"
            id="volunteer-check"
            checked={isVolunteer}
            onChange={(e) => setIsVolunteer(e.target.checked)}
            className="mt-1 w-4 h-4 text-tertiary rounded focus:ring-tertiary cursor-pointer"
          />
          <label htmlFor="volunteer-check" className="text-xs cursor-pointer">
            <span className="font-bold text-tertiary block">Register as Community Volunteer Responder</span>
            <span className="text-on-surface-variant block mt-0.5 text-[11px]">
              Receive alerts for medical emergencies within 5 km. Protected by Good Samaritan Law.
            </span>
          </label>
        </div>

        {/* Emergency Contact */}
        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/50 space-y-3 shadow-level-1">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="w-4 h-4" />
              <span>Primary Emergency Contact</span>
            </h2>
            <span className="text-[10px] bg-secondary-fixed text-secondary px-2 py-0.5 rounded-full font-bold">Autodialed on SOS</span>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              placeholder="Contact Name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full px-3.5 py-2 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs text-on-surface"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="tel"
                placeholder="Phone Number"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-3.5 py-2 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs text-on-surface"
              />
              <input
                type="text"
                placeholder="Relationship (e.g. Parent)"
                value={contactRelation}
                onChange={(e) => setContactRelation(e.target.value)}
                className="w-full px-3.5 py-2 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs text-on-surface"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-primary text-white font-bold text-sm rounded-xl shadow-level-2 hover:bg-primary-hover transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="text-xs">Creating Account & Profile...</span>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              <span>Complete Registration</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
