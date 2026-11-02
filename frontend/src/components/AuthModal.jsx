import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  X, 
  Shield, 
  Lock, 
  Mail, 
  User, 
  AlertCircle, 
  Loader2, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Copy, 
  Check, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

export const AuthModal = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState(initialMode); // 'login' or 'register'
  
  // Registration form fields
  const [firstName, setFirstName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Login form fields (USERNAME OR EMAIL and PASSWORD)
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Status & Registration success state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registeredUsername, setRegisteredUsername] = useState(null);
  const [copied, setCopied] = useState(false);

  const { login, register } = useAuth();

  if (!isOpen) return null;

  const handleCopyUsername = () => {
    if (registeredUsername) {
      navigator.clipboard.writeText(registeredUsername);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side password matching check
    if (regPassword !== confirmPassword) {
      setError('Password and confirm password do not match.');
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const res = await register({
        firstName: firstName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        confirmPassword: confirmPassword,
      });

      // Show generated unique username card
      setRegisteredUsername(res.username);
    } catch (err) {
      const backendMsg = err.response?.data?.message;
      setError(backendMsg || 'Failed to register investigator account.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const id = loginIdentifier.trim();
    const p = loginPassword.trim();

    // Client check for both empty
    if (!id && !p) {
      setError('Please enter valid login details.');
      return;
    }
    if (!id) {
      setError('Please enter your username or registered email address.');
      return;
    }
    if (!p) {
      setError('Please enter a valid password.');
      return;
    }

    setLoading(true);

    try {
      await login(id, p);
      onClose();
    } catch (err) {
      const backendMsg = err.response?.data?.message;
      if (backendMsg) {
        setError(backendMsg);
      } else {
        setError('Invalid username/email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFinishRegistration = () => {
    setRegisteredUsername(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* REGISTRATION SUCCESS CARD SHOWING GENERATED USERNAME */}
        {registeredUsername ? (
          <div className="p-8 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-950/50">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400">
                REGISTRATION SUCCESSFUL
              </span>
              <h2 className="text-xl font-bold text-white mt-2">
                Your Investigator Dossier Is Ready!
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                A unique username has been automatically generated for you. You will use this username to log in!
              </p>
            </div>

            {/* Generated Username Highlight Box */}
            <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/40 relative group">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block mb-1">
                Your Generated Username (Required for Login)
              </span>
              <div className="flex items-center justify-center space-x-3">
                <span className="text-2xl font-black text-white font-mono tracking-wider">
                  {registeredUsername}
                </span>
                <button
                  type="button"
                  onClick={handleCopyUsername}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Copy Username"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {copied && (
                <span className="text-[10px] text-emerald-400 font-mono block mt-1">
                  Copied to clipboard!
                </span>
              )}
            </div>

            <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/50 text-[11px] font-mono text-cyan-300 text-left">
              💡 <strong>Dual Login Enabled:</strong> You can sign in using either your generated codename <strong>{registeredUsername}</strong> or your registered email address <strong>{regEmail}</strong>!
            </div>

            <button
              type="button"
              onClick={handleFinishRegistration}
              className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black font-bold font-mono text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-950/50 flex items-center justify-center space-x-2"
            >
              <span>Proceed to Investigation Desk</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-slate-800 bg-slate-950/50">
              <div className="w-12 h-12 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-3 shadow-lg shadow-cyan-950/50">
                <Shield className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-wide">
                {mode === 'login' ? 'Investigator Login' : 'Register New Sleuth'}
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                {mode === 'login' 
                  ? 'Enter your username or email address and passcode to access your cases.'
                  : 'Fill in your details. We will automatically generate your unique username!'}
              </p>

              {/* Mode Switch Tabs */}
              <div className="grid grid-cols-2 gap-2 mt-4 p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); }}
                  className={`py-1.5 rounded-md transition-all ${
                    mode === 'login'
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(''); }}
                  className={`py-1.5 rounded-md transition-all ${
                    mode === 'register'
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Create Dossier
                </button>
              </div>
            </div>

            {/* Forms Container */}
            <div className="p-6">
              {error && (
                <div className="p-3 mb-4 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2 font-mono">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* LOGIN FORM: USERNAME OR EMAIL AND PASSWORD */}
              {mode === 'login' ? (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                      Username or Email Address
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder="e.g. John_4821 or john@example.com"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                      Passcode / Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors"
                        title={showLoginPassword ? 'Hide password' : 'Show password'}
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-sm tracking-wide transition-all shadow-lg shadow-cyan-950/50 flex items-center justify-center space-x-2 mt-4 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying Credentials...</span>
                      </>
                    ) : (
                      <span>Sign In</span>
                    )}
                  </button>
                </form>
              ) : (
                /* REGISTRATION FORM: First Name, Email, Password, Confirm Password */
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                      First Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="e.g. John"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="john@scotlandyard.org"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors"
                        title={showRegPassword ? 'Hide password' : 'Show password'}
                      >
                        {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors"
                        title={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-sm tracking-wide transition-all shadow-lg shadow-cyan-950/50 flex items-center justify-center space-x-2 mt-4 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating Unique Username...</span>
                      </>
                    ) : (
                      <span>Generate Username & Register</span>
                    )}
                  </button>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
