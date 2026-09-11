import React, { useState } from 'react';
import { X, ShieldCheck, Lock, Mail, AlertCircle, Loader2, Eye, EyeOff, Check, UserCheck } from 'lucide-react';
import type { UserRole, User } from '../types/auth';
import { AuthService, DEMO_ACCOUNTS } from '../services/authService';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User, token: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('ENFORCEMENT_OFFICER');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setError(null);
    setFieldErrors({});
    onClose();
  };

  const validateForm = (): boolean => {
    const errors: { identifier?: string; password?: string } = {};

    if (!identifier.trim()) {
      errors.identifier = 'Username or email address is required.';
    }
    if (!password) {
      errors.password = 'Password is required.';
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setError('Please fill in all required fields.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate fields before proceeding
    const isValid = validateForm();
    if (!isValid) {
      return;
    }

    setLoading(true);

    try {
      // Authenticate against centralized auth service (handles mock & demo accounts)
      const result = AuthService.authenticate(identifier.trim(), password, role);

      if (!result.success || !result.user || !result.token) {
        setError(result.error || 'Invalid username or password.');
        return;
      }

      onLoginSuccess(result.user, result.token);
      handleClose();
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (username: string, pass: string, targetRole: UserRole) => {
    setIdentifier(username);
    setPassword(pass);
    setRole(targetRole);
    setError(null);
    setFieldErrors({});
    setCopiedAccount(username);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto w-screen h-screen left-0 top-0"
      style={{ boxSizing: 'border-box' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="bg-surface-container-lowest border border-border-subtle rounded-2xl shadow-2xl overflow-hidden relative z-50 text-text-main my-auto flex flex-col animate-fade-in"
        style={{
          width: 'min(500px, calc(100vw - 32px))',
          maxWidth: '500px',
          minWidth: 'min(360px, calc(100vw - 32px))',
          boxSizing: 'border-box',
          flexShrink: 0
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Light Theme Government Style */}
        <div className="bg-surface-container-low px-6 py-5 border-b border-border-subtle flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-headline-md text-lg font-bold text-primary leading-tight">
                Statutory Portal Sign In
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Disha &bull; Legal Metrology Compliance Enforcement
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-text-muted hover:text-text-main p-1.5 rounded-lg hover:bg-surface-container-high transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - with noValidate to prevent native browser popups */}
        <form noValidate onSubmit={handleSubmit} className="p-6 space-y-4" style={{ boxSizing: 'border-box', width: '100%' }}>
          {error && (
            <div
              className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2 animate-fade-in"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="leading-snug font-medium">{error}</span>
            </div>
          )}

          {/* Role Selection */}
          <div>
            <label htmlFor="login-role" className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
              Select Official Role
            </label>
            <div className="relative">
              <select
                id="login-role"
                value={role}
                disabled={loading}
                onChange={(e) => {
                  setRole(e.target.value as UserRole);
                  if (error) setError(null);
                }}
                className="w-full bg-surface-container-lowest border border-border-subtle rounded-lg px-3 py-2.5 text-sm text-text-main font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all disabled:opacity-60 cursor-pointer shadow-2xs"
              >
                <option value="ENFORCEMENT_OFFICER">Enforcement / Inspection Officer</option>
                <option value="SYSTEM_ADMIN">System Administrator</option>
              </select>
            </div>
          </div>

          {/* Username / Email */}
          <div>
            <label htmlFor="login-identity" className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
              Username or Official Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
              <input
                id="login-identity"
                type="text"
                autoComplete="username"
                value={identifier}
                disabled={loading}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (fieldErrors.identifier) {
                    setFieldErrors((prev) => ({ ...prev, identifier: undefined }));
                  }
                  if (error) setError(null);
                }}
                placeholder={role === 'ENFORCEMENT_OFFICER' ? 'inspector.arjun' : 'admin.priya'}
                className={`w-full bg-surface-container-lowest border ${
                  fieldErrors.identifier ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-border-subtle focus:border-primary focus:ring-primary/15'
                } rounded-lg pl-9 pr-3 py-2.5 text-sm text-text-main focus:outline-none focus:ring-2 transition-all disabled:opacity-60 shadow-2xs`}
              />
            </div>
            {fieldErrors.identifier && (
              <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldErrors.identifier}</span>
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="login-password" className="block text-xs font-semibold text-text-muted uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium cursor-pointer"
              >
                {showPassword ? (
                  <>
                    <EyeOff className="w-3 h-3" />
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3" />
                    <span>Show password</span>
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                disabled={loading}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }
                  if (error) setError(null);
                }}
                placeholder="Enter password"
                className={`w-full bg-surface-container-lowest border ${
                  fieldErrors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-border-subtle focus:border-primary focus:ring-primary/15'
                } rounded-lg pl-9 pr-10 py-2.5 text-sm text-text-main focus:outline-none focus:ring-2 transition-all disabled:opacity-60 shadow-2xs font-mono`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-text-muted hover:text-text-main cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldErrors.password}</span>
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-container hover:bg-primary text-on-primary font-semibold py-2.5 rounded-lg shadow-sm text-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Sign In to Portal</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Accounts Section - Explicit & Readable */}
        <div className="bg-surface-container-low px-6 py-4 border-t border-border-subtle">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-primary" />
              Demo Test Accounts (Click to auto-fill)
            </span>
            <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              Testing Only
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <div
                key={acc.username}
                onClick={() => handleFillDemo(acc.username, acc.passwords[0], acc.role)}
                className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                  role === acc.role && identifier === acc.username
                    ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/20'
                    : 'bg-surface-container-lowest border-border-subtle hover:border-primary/30 hover:bg-surface-container-high/40'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-primary truncate">{acc.user.full_name}</span>
                  <span className="text-[10px] font-semibold text-text-muted px-1.5 py-0.5 rounded bg-surface-container-low border border-border-subtle">
                    {acc.role === 'SYSTEM_ADMIN' ? 'Admin' : 'Officer'}
                  </span>
                </div>
                <div className="text-[11px] text-text-muted space-y-0.5 font-mono">
                  <div>User: <strong className="text-text-main font-semibold">{acc.username}</strong></div>
                  <div>Pass: <strong className="text-text-main font-semibold">{acc.passwords[0]}</strong></div>
                </div>
                <div className="mt-2 pt-1 border-t border-border-subtle/50 flex justify-between items-center text-[10px]">
                  <span className="text-primary font-medium flex items-center gap-0.5">
                    {copiedAccount === acc.username ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600 font-semibold">Filled!</span>
                      </>
                    ) : (
                      'Click to load'
                    )}
                  </span>
                  <span className="text-text-muted">{acc.role === 'SYSTEM_ADMIN' ? 'P avatar' : 'A avatar'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Note */}
        <div className="bg-surface-container-lowest px-6 py-3 text-center text-[11px] text-text-muted border-t border-border-subtle">
          Official statutory portal strictly for authorized Government of India enforcement officers.
        </div>
      </div>
    </div>
  );
};
