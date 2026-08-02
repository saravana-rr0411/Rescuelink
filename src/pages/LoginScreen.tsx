import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Mail, Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, user } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect to Home if user is already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    const { error: authError } = await signIn(email, password);
    setLoading(false);

    if (authError) {
      setError(authError.message || 'Authentication failed. Please check your credentials.');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface px-6 justify-between py-10">
      <div className="space-y-6 max-w-sm mx-auto w-full">
        {/* Brand Header */}
        <div className="text-center space-y-3 pt-6">
          <div className="w-16 h-16 rounded-3xl bg-primary text-white flex items-center justify-center mx-auto shadow-level-2 ring-4 ring-primary-fixed">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-on-surface tracking-tight">RescueLink</h1>
            <p className="text-xs font-semibold text-secondary mt-1">Emergency Dispatch & Volunteer Network</p>
          </div>
        </div>

        {/* Guest SOS Express Card */}
        <div className="bg-primary-fixed/40 border border-primary/30 p-4 rounded-2xl text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-primary">
            <AlertCircle className="w-4 h-4" />
            <span>In immediate medical danger?</span>
          </div>
          <p className="text-[11px] text-on-surface-variant">Skip login to request instant emergency dispatch</p>
          <button
            onClick={() => navigate('/report')}
            className="w-full py-2.5 bg-primary text-white font-bold text-xs rounded-xl shadow-level-1 hover:bg-primary-hover transition-all"
          >
            Instant Emergency Guest Access
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="p-3 bg-red-100 text-red-800 text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-outline absolute left-3.5 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Password</label>
              <button type="button" className="text-[11px] font-bold text-secondary hover:underline">Forgot?</button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-outline absolute left-3.5 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-secondary text-white font-bold text-sm rounded-xl shadow-level-1 hover:bg-secondary/90 transition-all flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <span className="text-xs font-semibold">Logging in with Supabase...</span>
            ) : (
              <>
                <span>Sign In to Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-xs text-on-surface-variant">
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/signup')}
              className="font-bold text-primary hover:underline ml-1"
            >
              Register Account
            </button>
          </p>
        </div>
      </div>

      {/* Footer Security Badge */}
      <div className="text-center text-[10px] text-on-surface-variant/70 flex items-center justify-center gap-1 mt-6">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        <span>Official Emergency Dispatch Protocol Encrypted</span>
      </div>
    </div>
  );
};
