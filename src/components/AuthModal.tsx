import React, { useState } from 'react';
import { UserRole, validateAndAuthenticateUser, saveSession } from '../types/auth';
import { Shield, UserCheck, Stethoscope, Activity, AlertTriangle, Mail, Lock, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('ASHA_WORKER');
  const [email, setEmail] = useState('sunita.helper@helper.com');
  const [password, setPassword] = useState('sunita123');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  if (!isOpen) return null;

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
    if (role === 'ASHA_WORKER') {
      setEmail('sunita.helper@helper.com');
      setPassword('sunita123');
    } else {
      setEmail('officer.kolkata@gov.com');
      setPassword('kolkata123');
    }
  };

  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoggingIn(true);

    setTimeout(() => {
      const authRes = validateAndAuthenticateUser(email, password);
      setIsLoggingIn(false);
      if (authRes.success) {
        onLoginSuccess();
        onClose();
      } else {
        setErrorMessage(authRes.message || 'Authentication Failed');
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md overflow-hidden glass-panel rounded-3xl border border-slate-700/60 shadow-2xl p-6 sm:p-8">
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-56 h-56 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-56 h-56 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center gap-3 mb-6 relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 p-0.5 shadow-lg shadow-teal-500/20 shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Activity className="w-6 h-6 text-teal-400" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white font-outfit flex items-center gap-2">
              HealthTrack <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase font-bold">Portal Access</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Select Portal Access Mode to Sign In</p>
          </div>
        </div>

        {/* Error Alert Message */}
        {errorMessage && (
          <div className="p-3.5 mb-4 rounded-2xl bg-rose-950/80 border border-rose-500/60 text-xs text-rose-300 flex items-start gap-2.5 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* 2 Clean Option Cards: Helper Access vs Officer Access */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div
            onClick={() => handleSelectRole('ASHA_WORKER')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all duration-300 ${
              selectedRole === 'ASHA_WORKER'
                ? 'bg-teal-950/50 border-teal-500 shadow-xl shadow-teal-500/10 ring-1 ring-teal-500'
                : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400">
                <Stethoscope className="w-4 h-4" />
              </div>
              {selectedRole === 'ASHA_WORKER' && (
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
              )}
            </div>
            <h3 className="font-extrabold text-white text-sm">Helper Access</h3>
            <p className="text-[11px] text-teal-300 mt-0.5">ASHA Field Triage</p>
          </div>

          <div
            onClick={() => handleSelectRole('DISTRICT_ADMIN')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all duration-300 ${
              selectedRole === 'DISTRICT_ADMIN'
                ? 'bg-emerald-950/50 border-emerald-500 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-500'
                : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Shield className="w-4 h-4" />
              </div>
              {selectedRole === 'DISTRICT_ADMIN' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <h3 className="font-extrabold text-white text-sm">Officer Access</h3>
            <p className="text-[11px] text-emerald-300 mt-0.5">Chief Outbreak Command</p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleFormLogin} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={selectedRole === 'ASHA_WORKER' ? 'user@helper.com' : 'officer@gov.com'}
                className="w-full py-2.5 pl-10 pr-3 rounded-2xl glass-input text-xs font-semibold font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full py-2.5 pl-10 pr-3 rounded-2xl glass-input text-xs font-semibold font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-xl shadow-teal-500/20 flex items-center justify-center gap-2 transition-all mt-3"
          >
            {isLoggingIn ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4 text-slate-950" /> Sign In to {selectedRole === 'ASHA_WORKER' ? 'Helper Portal' : 'Officer Command'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
