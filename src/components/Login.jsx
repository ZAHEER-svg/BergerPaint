import React, { useState, useRef, useEffect } from 'react';
import { 
  Mail, Lock, ArrowRight, UserCheck, CheckCircle2, Sparkles, KeyRound, 
  ShieldCheck, ArrowLeft, Eye, EyeOff, Building2, ChevronDown, Check, X 
} from 'lucide-react';
import bergerLogo from '../assets/berger.png';

// Use environment variable with fallback to local development server
// Base URL resolver
const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'https://ztech-backend-production-7ad0.up.railway.app';

const DEPARTMENTS = [
  'Executive Office / MD & COO',
  'IT Department',
  'Sales & Marketing',
  'Finance & Accounting',
  'Human Resources',
  'Supply Chain & Operations',
  'Production & Manufacturing',
  'Audit & Quality Assurance',
  'General Management',
  'Other'
];

export default function Login({ onLoginSuccess }) {
  // Modes: 'signin' | 'signup' | 'signup_verify' | 'forgot_email' | 'forgot_verify' | 'forgot_reset'
  const [authMode, setAuthMode] = useState('signin');
  const [isAnimating, setIsAnimating] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Extended Profile State
  const [department, setDepartment] = useState('Executive Office / MD & COO');
  const [customDepartment, setCustomDepartment] = useState('');

  // Custom Dropdown UI state
  const [isDeptOpen, setIsDeptOpen] = useState(false);
  const deptRef = useRef(null);
  
  // Verification states
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Real-time server role lookup state
  const [serverRole, setServerRole] = useState(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (deptRef.current && !deptRef.current.contains(event.target)) {
        setIsDeptOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Real-time backend check for user role as email is typed
  useEffect(() => {
    if (!email || !email.includes('@')) {
      setServerRole(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/check-email-role?email=${encodeURIComponent(email)}`);
        const data = await res.json();
        if (res.ok && data.success) {
          setServerRole(data.role);
        } else {
          setServerRole(null);
        }
      } catch (e) {
        setServerRole(null);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [email]);

  // Smooth mode switching helper with animated transition
  const switchAuthMode = (newMode) => {
    if (newMode === authMode) return;
    
    setIsAnimating(true);
    
    setTimeout(() => {
      setAuthMode(newMode);
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setName('');
      setResetCode('');
      setCustomDepartment('');
      setShowPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setIsDeptOpen(false);
      setError('');
      setSuccessMsg('');
      setIsAnimating(false);
    }, 200);
  };

  // Helper to validate strong password criteria
  const validatePassword = (pwd) => {
    if (pwd.length < 8) return 'Password must be at least 8 characters long.';
    if (!/[A-Z]/.test(pwd)) return 'Password must contain at least one uppercase letter (A-Z).';
    if (!/[a-z]/.test(pwd)) return 'Password must contain at least one lowercase letter (a-z).';
    if (!/[0-9]/.test(pwd)) return 'Password must contain at least one number (0-9).';
    if (!/[^A-Za-z0-9]/.test(pwd)) return 'Password must contain at least one special character (e.g. !@#$%^&*).';
    return null;
  };

  // Helper to detect IT staff vs normal user
  const cleanEmail = email.toLowerCase().trim();
  const emailIsIt = cleanEmail.includes('it') || cleanEmail.includes('admin') || cleanEmail === 'lawalzoheer1@gmail.com';
  const roleIsIt = serverRole ? (
    serverRole.toLowerCase().includes('admin') || 
    serverRole.toLowerCase().includes('it') || 
    serverRole.toLowerCase().includes('engineer')
  ) : false;

  const isItStaff = emailIsIt || roleIsIt;
  const badgeTitle = serverRole || (emailIsIt ? 'IT Official / Administrator' : 'Standard Employee / User');

  // --- 1. SIGN IN & SIGN UP HANDLER ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const finalDepartment = department === 'Other' ? customDepartment.trim() : department;

    if (authMode === 'signup' && department === 'Other' && !finalDepartment) {
      setError('Please specify your department or executive title.');
      return;
    }

    // Validate password strength during signup
    if (authMode === 'signup') {
      const pwdError = validatePassword(password);
      if (pwdError) {
        setError(pwdError);
        return;
      }
    }

    setLoading(true);

    try {
      if (authMode === 'signup') {
        const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, department: finalDepartment }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Registration failed');

        setSuccessMsg(data.message || 'Registration successful! Verification code sent to your email.');
        switchAuthMode('signup_verify');
      } else {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Authentication failed');

        if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('berger_token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
        }

        onLoginSuccess(data.user);
      }
    } catch (err) {
      setError(err.message || 'Unable to connect to backend server.');
    } finally {
      setLoading(false);
    }
  };

  // --- 2. SIGNUP EMAIL VERIFICATION HANDLER ---
  const handleVerifySignupCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-signup-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: resetCode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Invalid or expired verification code');

      setSuccessMsg('Account verified successfully! Please sign in with your credentials.');
      switchAuthMode('signin');
    } catch (err) {
      setError(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // --- 3. FORGOT PASSWORD: STEP 1 ---
  const handleSendResetCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to send reset code');

      setSuccessMsg('Verification code sent! Check your corporate email inbox.');
      switchAuthMode('forgot_verify');
    } catch (err) {
      setError(err.message || 'Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  // --- 4. FORGOT PASSWORD: STEP 2 ---
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-reset-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: resetCode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Invalid code');

      setSuccessMsg('Code verified successfully! Enter your new password.');
      switchAuthMode('forgot_reset');
    } catch (err) {
      setError(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // --- 5. FORGOT PASSWORD: STEP 3 ---
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const pwdError = validatePassword(newPassword);
    if (pwdError) {
      setError(pwdError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: resetCode, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update password');

      setSuccessMsg('Password updated successfully! Please sign in with your new credentials.');
      switchAuthMode('signin');
    } catch (err) {
      setError(err.message || 'Password update failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white overflow-hidden">
      
      <style>{`
        @keyframes fadeInScale {
          0% { opacity: 0; transform: translateY(12px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes menuSlideDown {
          0% { opacity: 0; transform: translateY(-8px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fadeInScale { animation: fadeInScale 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-menuSlideDown { animation: menuSlideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        .custom-dropdown-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-dropdown-scrollbar::-webkit-scrollbar-track { background: #0f172a; border-radius: 8px; }
        .custom-dropdown-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 8px; }
        .custom-dropdown-scrollbar::-webkit-scrollbar-thumb:hover { background: #3b82f6; }
      `}</style>

      {/* Left Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 p-16 flex-col justify-between border-r border-slate-800/80 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="flex items-center gap-4 z-10">
          <div className="bg-white/95 p-3.5 rounded-2xl shadow-2xl shadow-blue-950/50 ring-1 ring-slate-200/20 backdrop-blur-md transition-transform duration-500 hover:scale-105">
            <img src={bergerLogo} alt="Berger Paints Logo" className="h-20 w-auto object-contain" />
          </div>
        </div>

        <div className="z-10 max-w-lg my-auto py-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 text-xs font-bold px-3.5 py-1.5 rounded-full border border-blue-500/20 uppercase tracking-wider mb-6 shadow-inner">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Secure Corporate Gateway</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.15]">
            Streamlining internal IT support & asset management.
          </h2>
          <p className="text-slate-400 mt-6 text-base leading-relaxed font-normal">
            Authenticate securely to submit help desk tickets, track enterprise hardware assets, and monitor system infrastructure health in real-time.
          </p>
        </div>

        <div className="z-10 text-xs text-slate-500 font-medium">
          © 2026 Berger Paints Nigeria Plc. All rights reserved.
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-slate-950 relative overflow-y-auto">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 to-transparent lg:hidden pointer-events-none"></div>

        <div className={`w-full max-w-md bg-slate-900 border border-slate-800/80 p-8 sm:p-10 rounded-3xl shadow-2xl shadow-black/80 relative z-10 ring-1 ring-white/5 transition-all duration-200 my-auto ${
          isAnimating ? 'opacity-0 translateY-2 scale-98' : 'animate-fadeInScale'
        }`}>
          
          {/* Segmented Tab Switcher for Sign In / Sign Up */}
          {(authMode === 'signin' || authMode === 'signup') && (
            <div className="mb-8 p-1.5 bg-slate-950 border border-slate-800/80 rounded-2xl flex items-center shadow-inner">
              <button
                type="button"
                onClick={() => switchAuthMode('signin')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 cursor-pointer ${
                  authMode === 'signin' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchAuthMode('signup')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 cursor-pointer ${
                  authMode === 'signup' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                Register
              </button>
            </div>
          )}

          <div className="mb-8">
            <h3 className="text-2xl font-bold text-white tracking-tight">
              {authMode === 'signin' && 'Welcome Back'}
              {authMode === 'signup' && 'Create Profile'}
              {authMode === 'signup_verify' && 'Verify Your Email'}
              {authMode === 'forgot_email' && 'Reset Password'}
              {authMode === 'forgot_verify' && 'Enter Verification Code'}
              {authMode === 'forgot_reset' && 'Set New Password'}
            </h3>
            <p className="text-sm text-slate-400 mt-1.5">
              {authMode === 'signin' && 'Enter your credentials to access your dashboard.'}
              {authMode === 'signup' && 'Enter your corporate details and department designation.'}
              {authMode === 'signup_verify' && `We sent a 6-digit verification code to ${email}. Enter it below.`}
              {authMode === 'forgot_email' && 'Enter your corporate email address to receive a reset code.'}
              {authMode === 'forgot_verify' && `We sent a 6-digit code to ${email}. Enter it below.`}
              {authMode === 'forgot_reset' && 'Choose a secure new password for your account.'}
            </p>
          </div>

          {successMsg && (
            <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs p-3.5 rounded-2xl flex items-center gap-2.5 shadow-lg shadow-emerald-950/20 animate-fadeInScale">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span className="font-medium leading-relaxed">{successMsg}</span>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-3.5 rounded-2xl shadow-lg shadow-red-950/20 animate-fadeInScale">
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}

          {/* SIGN IN / SIGN UP FORM */}
          {(authMode === 'signin' || authMode === 'signup') && (
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              
              {/* Full Name (Sign Up only) */}
              {authMode === 'signup' && (
                <div className="animate-fadeInScale">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Full Name</label>
                  <div className="flex items-center bg-slate-950 border border-slate-800/80 hover:border-slate-700 rounded-2xl px-4 py-3.5 shadow-inner focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/15 transition-all duration-300">
                    <UserCheck className="w-5 h-5 text-slate-500 mr-3 shrink-0" />
                    <input 
                      type="text" 
                      required
                      placeholder="John Davis"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-slate-600 font-medium"
                    />
                  </div>
                </div>
              )}

              {/* Corporate Email */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Corporate Email</label>
                <div className="flex items-center bg-slate-950 border border-slate-800/80 hover:border-slate-700 rounded-2xl px-4 py-3.5 shadow-inner focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/15 transition-all duration-300">
                  <Mail className="w-5 h-5 text-slate-500 mr-3 shrink-0" />
                  <input 
                    type="email" 
                    required
                    placeholder="it-admin@bergerpaints.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-slate-600 font-medium"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">Password</label>
                  {authMode === 'signin' && (
                    <button 
                      type="button"
                      onClick={() => switchAuthMode('forgot_email')}
                      className="text-xs text-blue-400 hover:text-blue-300 font-medium transition cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="flex items-center bg-slate-950 border border-slate-800/80 hover:border-slate-700 rounded-2xl px-4 py-3.5 shadow-inner focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/15 transition-all duration-300">
                  <Lock className="w-5 h-5 text-slate-500 mr-3 shrink-0" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-slate-600 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-500 hover:text-slate-300 transition ml-2 cursor-pointer focus:outline-none"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Password Strength Checklist (Sign Up Only) */}
                {authMode === 'signup' && password.length > 0 && (
                  <div className="mt-2.5 p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1.5 animate-fadeInScale text-[11px]">
                    <div className="text-slate-400 font-bold mb-1">Password Requirements:</div>
                    <div className={`flex items-center gap-2 ${password.length >= 8 ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {password.length >= 8 ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      <span>At least 8 characters</span>
                    </div>
                    <div className={`flex items-center gap-2 ${/[A-Z]/.test(password) ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {/[A-Z]/.test(password) ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      <span>One uppercase letter (A-Z)</span>
                    </div>
                    <div className={`flex items-center gap-2 ${/[a-z]/.test(password) ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {/[a-z]/.test(password) ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      <span>One lowercase letter (a-z)</span>
                    </div>
                    <div className={`flex items-center gap-2 ${/[0-9]/.test(password) ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {/[0-9]/.test(password) ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      <span>One number (0-9)</span>
                    </div>
                    <div className={`flex items-center gap-2 ${/[^A-Za-z0-9]/.test(password) ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {/[^A-Za-z0-9]/.test(password) ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      <span>One special character (!@#$%^&*)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Role Badge */}
              {email && (
                <div className="pt-1 flex items-center gap-2 bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800/80 w-fit animate-fadeInScale">
                  <span className={`w-2 h-2 rounded-full animate-pulse ${isItStaff ? 'bg-amber-400 shadow-lg shadow-amber-400/50' : 'bg-blue-400 shadow-lg shadow-blue-400/50'}`}></span>
                  <span className="text-xs text-slate-400">Role:</span> 
                  <span className={`text-xs font-bold ${isItStaff ? 'text-amber-400' : 'text-blue-400'}`}>
                    {badgeTitle}
                  </span>
                </div>
              )}

              {/* Department Dropdown */}
              {authMode === 'signup' && (
                <div className="relative z-30 animate-fadeInScale" ref={deptRef}>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Department / Designation</label>
                  <button
                    type="button"
                    onClick={() => setIsDeptOpen(!isDeptOpen)}
                    className={`w-full flex items-center justify-between bg-slate-950 border ${
                      isDeptOpen ? 'border-blue-500 ring-4 ring-blue-500/15 shadow-blue-950/50' : 'border-slate-800/90 hover:border-slate-700'
                    } rounded-2xl px-4 py-3.5 text-left transition-all duration-300 cursor-pointer shadow-lg group`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-1.5 rounded-lg transition-colors ${isDeptOpen ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-900 text-slate-400 group-hover:text-blue-400'}`}>
                        <Building2 className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-semibold text-slate-100 truncate">{department}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ml-1 ${isDeptOpen ? 'rotate-180 text-blue-400' : 'group-hover:text-slate-200'}`} />
                  </button>

                  {isDeptOpen && (
                    <div className="absolute left-0 right-0 mt-2 z-50 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl shadow-black p-1.5 custom-dropdown-scrollbar max-h-56 overflow-y-auto animate-menuSlideDown ring-1 ring-white/10">
                      <div className="px-3 py-2 border-b border-slate-800 mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Select Department
                      </div>
                      {DEPARTMENTS.map((dept) => {
                        const isSelected = department === dept;
                        return (
                          <button
                            key={dept}
                            type="button"
                            onClick={() => {
                              setDepartment(dept);
                              setIsDeptOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                              isSelected ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            <span className="truncate">{dept}</span>
                            {isSelected && <Check className="w-4 h-4 text-white shrink-0 ml-2" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {department === 'Other' && (
                    <div className="mt-3 animate-fadeInScale">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                        Specify Department / Title
                      </label>
                      <div className="flex items-center bg-slate-950 border border-slate-800/80 hover:border-slate-700 rounded-2xl px-4 py-3.5 shadow-inner focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/15 transition-all duration-300">
                        <Building2 className="w-5 h-5 text-slate-500 mr-3 shrink-0" />
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. Office of the MD / COO"
                          value={customDepartment}
                          onChange={(e) => setCustomDepartment(e.target.value)}
                          className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-slate-600 font-medium"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2.5 shadow-xl shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5 text-sm disabled:opacity-50 cursor-pointer mt-4"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  <>
                    <span>{authMode === 'signup' ? 'Complete Registration' : 'Sign In to Dashboard'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* SIGNUP EMAIL VERIFICATION FORM */}
          {authMode === 'signup_verify' && (
            <form onSubmit={handleVerifySignupCode} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Verification Code</label>
                <div className="flex items-center bg-slate-950 border border-slate-800/80 hover:border-slate-700 rounded-2xl px-4 py-3.5 shadow-inner focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/15 transition-all duration-300">
                  <KeyRound className="w-5 h-5 text-slate-500 mr-3 shrink-0" />
                  <input 
                    type="text" 
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-slate-600 font-medium tracking-widest text-center"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2.5 shadow-xl shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5 text-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Verifying Code...' : 'Verify & Activate Account'}
              </button>

              <button 
                type="button"
                onClick={() => switchAuthMode('signup')}
                className="w-full text-xs text-slate-400 hover:text-white transition font-medium flex items-center justify-center gap-2 mt-3 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Registration
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD - STEP 1 */}
          {authMode === 'forgot_email' && (
            <form onSubmit={handleSendResetCode} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Corporate Email</label>
                <div className="flex items-center bg-slate-950 border border-slate-800/80 hover:border-slate-700 rounded-2xl px-4 py-3.5 shadow-inner focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/15 transition-all duration-300">
                  <Mail className="w-5 h-5 text-slate-500 mr-3 shrink-0" />
                  <input 
                    type="email" 
                    required
                    placeholder="it-admin@bergerpaints.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-slate-600 font-medium"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2.5 shadow-xl shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5 text-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Sending Code...' : 'Send Reset Code'}
              </button>

              <button 
                type="button"
                onClick={() => switchAuthMode('signin')}
                className="w-full text-xs text-slate-400 hover:text-white transition font-medium flex items-center justify-center gap-2 mt-3 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD - STEP 2 */}
          {authMode === 'forgot_verify' && (
            <form onSubmit={handleVerifyCode} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Verification Code</label>
                <div className="flex items-center bg-slate-950 border border-slate-800/80 hover:border-slate-700 rounded-2xl px-4 py-3.5 shadow-inner focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/15 transition-all duration-300">
                  <KeyRound className="w-5 h-5 text-slate-500 mr-3 shrink-0" />
                  <input 
                    type="text" 
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-slate-600 font-medium tracking-widest text-center"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2.5 shadow-xl shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5 text-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>

              <button 
                type="button"
                onClick={() => switchAuthMode('forgot_email')}
                className="w-full text-xs text-slate-400 hover:text-white transition font-medium flex items-center justify-center gap-2 mt-3 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Resend Code / Change Email
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD - STEP 3 */}
          {authMode === 'forgot_reset' && (
            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">New Password</label>
                <div className="flex items-center bg-slate-950 border border-slate-800/80 hover:border-slate-700 rounded-2xl px-4 py-3.5 shadow-inner focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/15 transition-all duration-300">
                  <Lock className="w-5 h-5 text-slate-500 mr-3 shrink-0" />
                  <input 
                    type={showNewPassword ? "text" : "password"} 
                    required
                    placeholder="••••••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-slate-600 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="text-slate-500 hover:text-slate-300 transition ml-2 cursor-pointer focus:outline-none"
                    aria-label="Toggle new password visibility"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Confirm New Password</label>
                <div className="flex items-center bg-slate-950 border border-slate-800/80 hover:border-slate-700 rounded-2xl px-4 py-3.5 shadow-inner focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/15 transition-all duration-300">
                  <ShieldCheck className="w-5 h-5 text-slate-500 mr-3 shrink-0" />
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    required
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-slate-600 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-slate-500 hover:text-slate-300 transition ml-2 cursor-pointer focus:outline-none"
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2.5 shadow-xl shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5 text-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-slate-800/80 text-center text-[11px] text-slate-500 font-medium">
            Protected by Berger Corporate SSO & Security Guidelines.
          </div>

        </div>
      </div>
    </div>
  );
}