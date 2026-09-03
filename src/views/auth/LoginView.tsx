import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AuthHeader } from '../../components/layout/AuthHeader';
import { Eye, EyeOff } from 'lucide-react';
import { loginAdminSession, verifyAdminCredentials } from '../../lib/adminAuth';

interface LoginViewProps {
  onNavigate: (route: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onNavigate }) => {
  const { login, loginWithGoogle } = useAuth();
  const { success, error } = useToast();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const userRole = await loginWithGoogle();
      success('Logged in successfully with Google!');
      if (userRole === 'admin') {
        onNavigate('/admin/dashboard');
      } else {
        onNavigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        error(err?.message || 'Failed to sign in with Google.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId || !password) {
      error('Please enter your login and password.');
      return;
    }

    setIsLoading(true);

    // 1. Direct Admin Credential Gate
    if (verifyAdminCredentials(cleanId, password)) {
      try {
        await loginAdminSession(cleanId, password);
        success('Welcome, Administrator!');
        onNavigate('/admin/dashboard');
        return;
      } catch (adminErr: any) {
        console.warn('Admin Firebase sync notice:', adminErr);
        // Fallback to local session if network or local Firebase has offline state
        loginAdminSession(cleanId, password);
        success('Welcome, Administrator!');
        onNavigate('/admin/dashboard');
        return;
      } finally {
        setIsLoading(false);
      }
    }

    // 2. Normal Customer Firebase Authentication Flow
    try {
      const userRole = await login(cleanId, password);
      success('Logged in successfully!');
      if (userRole === 'admin') {
        onNavigate('/admin/dashboard');
      } else {
        onNavigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      let msg = err?.message || 'Invalid credentials.';
      if (
        msg.includes('auth/invalid-credential') ||
        msg.includes('auth/user-not-found') ||
        msg.includes('auth/wrong-password')
      ) {
        msg = 'Invalid username/email or password.';
      }
      error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950">
      {/* Top section: INSTA MART logo & Menu button on right */}
      <AuthHeader onNavigate={onNavigate} currentRoute="/login" />

      {/* Main Content with large spacing */}
      <main className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full px-6 py-10">
        <form onSubmit={handleSubmit} className="w-full space-y-5">
          {/* Login or email */}
          <div>
            <label
              htmlFor="login-identifier"
              className="block text-xs font-semibold text-slate-300 mb-2"
            >
              Login or email
            </label>
            <input
              id="login-identifier"
              type="text"
              required
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Login or email"
              className="w-full px-4 py-3.5 rounded-2xl bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:outline-none text-white text-sm placeholder:text-slate-500 transition"
            />
          </div>

          {/* Password with Forgot? link */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="login-password"
                className="text-xs font-semibold text-slate-300"
              >
                Password
              </label>
              <button
                type="button"
                id="btn-forgot-password-link"
                onClick={() => onNavigate('/forgot-password')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition cursor-pointer"
              >
                Forgot?
              </button>
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full pl-4 pr-12 py-3.5 rounded-2xl bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:outline-none text-white text-sm placeholder:text-slate-500 transition font-mono"
              />
              <button
                type="button"
                id="btn-toggle-login-password"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 transition cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Action Buttons: Sign In and Create Account */}
          <div className="pt-3 flex flex-col gap-3.5">
            {/* Sign in Button */}
            <button
              type="submit"
              id="btn-submit-signin"
              disabled={isLoading || isGoogleLoading}
              className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-extrabold text-base transition shadow-lg shadow-emerald-500/20 flex items-center justify-center cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
              ) : (
                <span>Sign in</span>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-xs uppercase tracking-wider text-slate-500 font-medium">Or</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            {/* Google Sign-In */}
            <button
              type="button"
              id="btn-google-signin"
              onClick={handleGoogleLogin}
              disabled={isLoading || isGoogleLoading}
              className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-850 active:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 font-semibold text-sm transition flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
            >
              {isGoogleLoading ? (
                <span className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {/* Create account Navigation Button (Only navigates to /register) */}
            <button
              type="button"
              id="btn-navigate-register"
              onClick={() => onNavigate('/register')}
              className="w-full py-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-900 active:bg-slate-800 border border-slate-850 text-slate-300 font-medium text-sm transition flex items-center justify-center cursor-pointer"
            >
              Don&apos;t have an account? Create one
            </button>
          </div>
        </form>
      </main>

      {/* Clean minimal spacer footer */}
      <footer className="py-4 text-center text-xs text-slate-600" />
    </div>
  );
};
