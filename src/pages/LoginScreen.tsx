import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Mail, Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

export const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, user } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
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

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    const { error: googleError } = await signInWithGoogle();
    setGoogleLoading(false);

    if (googleError) {
      setError(googleError.message || 'Google authentication failed. Please try again.');
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-surface px-6 justify-between py-10">
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
            disabled={loading || googleLoading}
            className="w-full py-3.5 bg-secondary text-white font-bold text-sm rounded-xl shadow-level-1 hover:bg-secondary/90 transition-all flex items-center justify-center gap-2 mt-4 btn-press active:scale-[0.98]"
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

        {/* OR Divider */}
        <div className="relative flex items-center justify-center my-2">
          <div className="border-t border-outline-variant/50 w-full"></div>
          <span className="bg-surface px-3 text-[11px] font-extrabold uppercase text-on-surface-variant tracking-wider absolute">
            OR
          </span>
        </div>

        {/* Google Authentication Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading || googleLoading}
          className="w-full py-3.5 bg-surface-container-lowest border border-outline-variant/60 text-on-surface font-bold text-sm rounded-xl shadow-xs hover:bg-surface-container-low transition-all flex items-center justify-center gap-3 btn-press active:scale-[0.98]"
        >
          {googleLoading ? (
            <span className="text-xs font-semibold">Connecting to Google...</span>
          ) : (
            <>
              <GoogleIcon className="w-5 h-5 shrink-0" />
              <span>Continue with Google</span>
            </>
          )}
        </button>

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
