import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import {
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  resetPassword,
  formatAuthError
} from '../../services/auth.ts';
import { isFirebaseConfigured, saveStoredFirebaseConfig } from '../../services/firebase.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
  onSuccess
}) => {
  if (!isOpen) return null;

  const [mode, setMode] = useState<'signin' | 'signup' | 'reset' | 'config'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Quick Firebase Config fields if unconfigured
  const [apiKey, setApiKey] = useState('');
  const [projectId, setProjectId] = useState('');
  const [appId, setAppId] = useState('');
  const [domainCopied, setDomainCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (!isFirebaseConfigured && mode !== 'config') {
      setMode('config');
      setError('Firebase is not yet configured for this deployment. Please enter your project credentials.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        await loginWithEmail(email, password);
        onSuccess();
        onClose();
      } else if (mode === 'signup') {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        await registerWithEmail(email, password, displayName);
        onSuccess();
        onClose();
      } else if (mode === 'reset') {
        await resetPassword(email);
        setInfoMessage('Password reset link sent to your email.');
      }
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    if (!isFirebaseConfigured) {
      setMode('config');
      setError('Firebase project credentials are required for Google Authentication.');
      return;
    }

    setLoading(true);
    try {
      await loginWithGoogle();
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFirebaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !projectId.trim()) {
      setError('API Key and Project ID are required.');
      return;
    }

    saveStoredFirebaseConfig({
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      authDomain: `${projectId.trim()}.firebaseapp.com`,
      storageBucket: `${projectId.trim()}.appspot.com`,
      messagingSenderId: '',
      appId: appId.trim()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202C39]/65 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[#FFFFFF] border border-[#DCE1E5] rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#8293A5] hover:text-[#202C39] p-1 rounded-md transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#202C39] flex items-center justify-center text-[#F7F7F4] shadow-md mb-3">
            <span className="font-bold text-xl tracking-tight text-[#D5A34B]">W</span>
          </div>
          <h2 className="text-2xl font-bold text-[#202C39] tracking-tight">
            {mode === 'signin' && 'Welcome back to Workly'}
            {mode === 'signup' && 'Create your Workly account'}
            {mode === 'reset' && 'Reset your password'}
            {mode === 'config' && 'Connect New Firebase Project'}
          </h2>
          <p className="text-xs text-[#8293A5] mt-1">
            {mode === 'signin' && 'Sign in to access your realistic plans and schedules'}
            {mode === 'signup' && 'Get more done. Without doing more.'}
            {mode === 'reset' && "We'll send you an email with reset instructions"}
            {mode === 'config' && 'Enter your web app configuration from Firebase Console'}
          </p>
        </div>

        {/* Feedback notices */}
        {error && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{error}</div>
            </div>

            {error.includes('Authentication is not enabled') && (
              <div className="mt-2 pt-2 border-t border-red-200/80 text-[11px] text-red-800 space-y-1.5">
                <p className="font-semibold text-red-900">How to fix in Firebase Console (1 minute):</p>
                <ol className="list-decimal pl-4 space-y-0.5">
                  <li>Open <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="underline font-bold text-red-900">Firebase Console &rarr;</a></li>
                  <li>Click <strong>Build &gt; Authentication</strong> &gt; <strong>Get started</strong>.</li>
                  <li>In the <strong>Sign-in method</strong> tab, enable <strong>Email/Password</strong> and <strong>Google</strong>.</li>
                </ol>

                <div className="pt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('config');
                      setError(null);
                    }}
                    className="font-semibold text-red-900 underline hover:text-black"
                  >
                    Change Firebase Project
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('workly_sandbox_user', JSON.stringify({
                        uid: 'sandbox_user_preview',
                        email: 'shalomakinade5@gmail.com',
                        displayName: 'Shalom Akinade',
                        photoURL: null
                      }));
                      window.location.reload();
                    }}
                    className="px-2.5 py-1 bg-[#202C39] text-[#F7F7F4] rounded-md font-semibold text-[10px] hover:bg-[#151E28] transition-colors"
                  >
                    Enter in Test Sandbox Mode &rarr;
                  </button>
                </div>
              </div>
            )}

            {(error.includes('not authorized') || error.includes('unauthorized-domain')) && (
              <div className="mt-2 pt-2 border-t border-red-200/80 text-[11px] text-red-800 space-y-2">
                <p className="font-semibold text-red-900">Add this domain to Firebase Authorized Domains:</p>
                <div className="p-2 bg-white border border-red-200 rounded-lg flex items-center justify-between gap-2 font-mono text-[11px] text-red-950">
                  <span className="truncate select-all font-bold">
                    {typeof window !== 'undefined' ? window.location.hostname : 'current domain'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        navigator.clipboard.writeText(window.location.hostname);
                        setDomainCopied(true);
                        setTimeout(() => setDomainCopied(false), 3000);
                      }
                    }}
                    className="px-2.5 py-1 bg-[#202C39] hover:bg-black text-[#F7F7F4] text-[10px] font-sans font-semibold rounded shrink-0 transition-colors cursor-pointer"
                  >
                    {domainCopied ? 'Copied!' : 'Copy Domain'}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <a
                    href="https://console.firebase.google.com/project/workly-7d6a0/authentication/settings"
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-red-900 underline hover:text-black flex items-center gap-1"
                  >
                    Open Firebase Authorized Domains Settings &rarr;
                  </a>
                  <span className="text-[10px] text-red-700">Or use Email/Password below</span>
                </div>
              </div>
            )}
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2.5 text-xs text-green-800">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
            <div className="flex-1">{infoMessage}</div>
          </div>
        )}

        {/* Unconfigured Firebase helper indicator */}
        {!isFirebaseConfigured && mode !== 'config' && (
          <div className="mb-4 p-3 bg-[#FCF7EE] border border-[#D5A34B]/30 rounded-lg text-xs text-[#202C39]">
            <p className="font-semibold flex items-center gap-1.5 text-[#B8852B]">
              <KeyRound className="w-3.5 h-3.5" /> Firebase Setup Notice
            </p>
            <p className="mt-1 text-[#8293A5]">
              Please link your new Firebase project to authenticate and persist data.
            </p>
            <button
              onClick={() => setMode('config')}
              className="mt-2 text-xs font-semibold text-[#202C39] underline hover:text-[#B8852B]"
            >
              Enter Firebase Project Credentials &rarr;
            </button>
          </div>
        )}

        {mode === 'config' ? (
          <form onSubmit={handleSaveFirebaseConfig} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1">
                Firebase Web API Key
              </label>
              <input
                type="text"
                required
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-xs text-[#202C39] font-mono focus:ring-2 focus:ring-[#202C39]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1">
                Firebase Project ID
              </label>
              <input
                type="text"
                required
                placeholder="e.g. workly-production"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-xs text-[#202C39] font-mono focus:ring-2 focus:ring-[#202C39]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1">
                App ID (Optional)
              </label>
              <input
                type="text"
                placeholder="1:1234567890:web:..."
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-xs text-[#202C39] font-mono focus:ring-2 focus:ring-[#202C39]"
              />
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                className="w-full py-2.5 bg-[#202C39] hover:bg-[#151E28] text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                Save Firebase Config & Reload
              </button>
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="text-xs text-[#8293A5] hover:text-[#202C39] py-1 text-center"
              >
                Back to sign in
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Google OAuth Provider Button */}
            {mode !== 'reset' && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-white hover:bg-[#F7F7F4] border border-[#DCE1E5] text-[#202C39] rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-3 shadow-xs cursor-pointer disabled:opacity-60"
                >
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
                  Continue with Google
                </button>

                <div className="relative my-4 flex items-center justify-center">
                  <div className="border-t border-[#DCE1E5] w-full" />
                  <span className="bg-white px-3 text-[11px] uppercase tracking-wider text-[#8293A5] font-semibold absolute">
                    or with email
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1">
                    Your Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#8293A5] absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="Alex Taylor"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-xs text-[#202C39] placeholder-[#8293A5] focus:ring-2 focus:ring-[#202C39] focus:bg-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8293A5] absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-xs text-[#202C39] placeholder-[#8293A5] focus:ring-2 focus:ring-[#202C39] focus:bg-white"
                  />
                </div>
              </div>

              {mode !== 'reset' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5]">
                      Password
                    </label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => setMode('reset')}
                        className="text-xs text-[#8293A5] hover:text-[#202C39]"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#8293A5] absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-xs text-[#202C39] placeholder-[#8293A5] focus:ring-2 focus:ring-[#202C39] focus:bg-white"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 mt-2 bg-[#202C39] hover:bg-[#151E28] disabled:opacity-50 text-[#F7F7F4] rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>
                      {mode === 'signin' && 'Sign In to Workly'}
                      {mode === 'signup' && 'Create Account'}
                      {mode === 'reset' && 'Send Reset Link'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 text-center text-xs text-[#8293A5]">
              {mode === 'signin' ? (
                <p>
                  Don&apos;t have an account?{' '}
                  <button
                    onClick={() => { setMode('signup'); setError(null); }}
                    className="font-semibold text-[#202C39] hover:underline"
                  >
                    Sign up free
                  </button>
                </p>
              ) : mode === 'signup' ? (
                <p>
                  Already have an account?{' '}
                  <button
                    onClick={() => { setMode('signin'); setError(null); }}
                    className="font-semibold text-[#202C39] hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              ) : (
                <button
                  onClick={() => { setMode('signin'); setError(null); }}
                  className="font-semibold text-[#202C39] hover:underline"
                >
                  Return to sign in
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
