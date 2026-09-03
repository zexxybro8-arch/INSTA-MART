import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AuthHeader } from '../../components/layout/AuthHeader';
import { CheckCircle2 } from 'lucide-react';

interface ForgotPasswordViewProps {
  onNavigate: (route: string) => void;
}

export const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({ onNavigate }) => {
  const { resetPassword } = useAuth();
  const { success, error } = useToast();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      error('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(cleanEmail);
      setIsSent(true);
      success('Password reset link sent to your email.');
    } catch (err: any) {
      console.error('Password reset error:', err);
      error(err?.message || 'Failed to send reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950">
      {/* Top: INSTA MART logo & Menu button */}
      <AuthHeader onNavigate={onNavigate} currentRoute="/forgot-password" />

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full px-6 py-10">
        {isSent ? (
          <div className="w-full text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Check your email</h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                We've sent password reset instructions to{' '}
                <span className="font-semibold text-white">{email}</span>.
              </p>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <button
                type="button"
                id="btn-forgot-back-to-login"
                onClick={() => onNavigate('/login')}
                className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-extrabold text-base transition shadow-lg shadow-emerald-500/20 flex items-center justify-center cursor-pointer"
              >
                Sign in
              </button>

              <button
                type="button"
                onClick={() => setIsSent(false)}
                className="w-full py-3 text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                Did not receive? Try another email
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full space-y-5">
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-white">Reset password</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter your registered email address to receive password reset instructions.
              </p>
            </div>

            {/* Email field */}
            <div>
              <label
                htmlFor="forgot-email"
                className="block text-xs font-semibold text-slate-300 mb-2"
              >
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full px-4 py-3.5 rounded-2xl bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:outline-none text-white text-sm placeholder:text-slate-500 transition"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-3 flex flex-col gap-3.5">
              <button
                type="submit"
                id="btn-submit-forgot"
                disabled={isLoading}
                className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-extrabold text-base transition shadow-lg shadow-emerald-500/20 flex items-center justify-center cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                ) : (
                  <span>Send reset link</span>
                )}
              </button>

              <button
                type="button"
                id="btn-forgot-to-login"
                onClick={() => onNavigate('/login')}
                className="w-full py-4 rounded-2xl bg-slate-900 hover:bg-slate-850 active:bg-slate-800 border border-slate-800 text-white font-bold text-base transition flex items-center justify-center cursor-pointer"
              >
                Back to Sign in
              </button>
            </div>
          </form>
        )}
      </main>

      {/* Spacer footer */}
      <footer className="py-4 text-center text-xs text-slate-600" />
    </div>
  );
};
