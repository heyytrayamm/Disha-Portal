import React, { useState } from 'react';
import { X, Lock, Mail, AlertCircle, Loader2, Eye, EyeOff, Check, UserCheck } from 'lucide-react';
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

    const isValid = validateForm();
    if (!isValid) return;

    setLoading(true);

    try {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#141413]/40 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="bg-[#FFFFFF] border border-[#E2DFD8] rounded-xs shadow-2xl overflow-hidden relative z-50 text-[#141413] my-auto w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 animate-slide-down"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ═══ LEFT: Welcome & Government Identity Panel ═══ */}
        <div className="md:col-span-5 bg-[#FAF9F6] border-b md:border-b-0 md:border-r border-[#E2DFD8] p-6 sm:p-8 flex flex-col justify-between relative">
          {/* Corner Bracket */}
          <div className="corner-bracket corner-bracket-tl" />

          <div>
            {/* Header Brand */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xs bg-[#141413] text-[#FFFFFF] flex items-center justify-center font-bold text-xs">
                <span className="text-[11px] font-mono tracking-tighter">DI</span>
              </div>
              <div>
                <span className="font-bold tracking-tight text-[#141413] text-sm block">
                  DISHA
                </span>
                <p className="text-[10px] text-[#6E6D67] -mt-0.5">
                  Digital Inspection & Standards Hub
                </p>
              </div>
            </div>

            {/* Editorial Hero Statement */}
            <div className="mt-8 sm:mt-12 space-y-2">
              <span className="section-tag">LEGAL METROLOGY DIVISION</span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#141413] leading-tight">
                Welcome to<br />
                <span className="text-[#D4381D]">DISHA</span>
              </h2>
              <p className="text-xs font-semibold text-[#141413]">
                Digital Inspection & Standards Hub
              </p>
              <p className="text-xs text-[#6E6D67] mt-3 leading-relaxed">
                AI-powered verification of packaged commodities for a compliant and safer marketplace.
              </p>
            </div>
          </div>

          {/* Bottom Statutory Disclaimer */}
          <div className="mt-8 pt-4 border-t border-[#EAE7DF] text-[10px] font-mono text-[#8F8E87] space-y-1">
            <div className="flex items-center gap-1.5 text-[#141413] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1B7F43]" />
              <span>RULE 6 ENFORCEMENT PORTAL</span>
            </div>
            <div>DIRECTORATE OF LEGAL METROLOGY &bull; GOI</div>
          </div>
        </div>

        {/* ═══ RIGHT: Officer Sign In Form ═══ */}
        <div className="md:col-span-7 bg-[#FFFFFF] p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-[#141413]">Officer Sign In</h3>
                <p className="text-xs text-[#6E6D67] mt-0.5">Access your inspection workspace</p>
              </div>
              <button
                onClick={handleClose}
                className="p-1 text-[#8F8E87] hover:text-[#141413] rounded-xs cursor-pointer transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {error && (
                <div className="p-3 rounded-xs bg-[#FDE8E6] border border-[#F8B4AF] text-[#C5281B] text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Official Access Role */}
              <div>
                <label className="text-[10px] font-mono uppercase text-[#6E6D67] block mb-1.5">
                  Official Access Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('ENFORCEMENT_OFFICER')}
                    className={`py-1.5 px-3 text-xs font-semibold rounded-xs border transition-colors cursor-pointer ${
                      role === 'ENFORCEMENT_OFFICER'
                        ? 'bg-[#141413] text-[#FFFFFF] border-[#141413]'
                        : 'bg-[#FAF9F6] border-[#E2DFD8] text-[#6E6D67] hover:bg-[#F2F0E8]'
                    }`}
                  >
                    Enforcement Officer
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('SYSTEM_ADMIN')}
                    className={`py-1.5 px-3 text-xs font-semibold rounded-xs border transition-colors cursor-pointer ${
                      role === 'SYSTEM_ADMIN'
                        ? 'bg-[#141413] text-[#FFFFFF] border-[#141413]'
                        : 'bg-[#FAF9F6] border-[#E2DFD8] text-[#6E6D67] hover:bg-[#F2F0E8]'
                    }`}
                  >
                    System Admin
                  </button>
                </div>
              </div>

              {/* Username Field */}
              <div>
                <label className="text-[10px] font-mono uppercase text-[#6E6D67] block mb-1">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#8F8E87]">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (fieldErrors.identifier) setFieldErrors(prev => ({ ...prev, identifier: undefined }));
                    }}
                    placeholder="Enter username or official email"
                    className={`w-full pl-8 pr-3 py-2 bg-[#FFFFFF] border text-xs text-[#141413] placeholder:text-[#8F8E87] rounded-xs focus:outline-none focus:border-[#141413] ${
                      fieldErrors.identifier ? 'border-[#C5281B]' : 'border-[#E2DFD8]'
                    }`}
                  />
                </div>
                {fieldErrors.identifier && (
                  <p className="text-[11px] text-[#C5281B] mt-1">{fieldErrors.identifier}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-mono uppercase text-[#6E6D67]">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[10px] text-[#8F8E87] hover:text-[#141413] cursor-pointer flex items-center gap-1"
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
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#8F8E87]">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
                    }}
                    placeholder="Enter password"
                    className={`w-full pl-8 pr-9 py-2 bg-[#FFFFFF] border text-xs text-[#141413] placeholder:text-[#8F8E87] rounded-xs focus:outline-none focus:border-[#141413] ${
                      fieldErrors.password ? 'border-[#C5281B]' : 'border-[#E2DFD8]'
                    }`}
                  />
                </div>
                {fieldErrors.password && (
                  <p className="text-[11px] text-[#C5281B] mt-1">{fieldErrors.password}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn-accent w-full justify-center !py-2.5 text-xs font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>
          </div>

          {/* Demo Account Quick-Selection */}
          <div className="mt-5 pt-3 border-t border-[#EAE7DF]">
            <div className="flex items-center space-x-1.5 text-[#141413] font-semibold mb-2">
              <UserCheck className="w-3.5 h-3.5 text-[#D4381D]" />
              <span className="text-[10px] uppercase tracking-wider font-mono text-[#6E6D67]">
                Quick Test Accounts
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.user.id}
                  type="button"
                  onClick={() => handleFillDemo(acc.username, acc.passwords[0] || 'Inspect@2026', acc.user.role)}
                  className="text-left p-2 rounded-xs bg-[#FAF9F6] border border-[#E2DFD8] hover:border-[#141413] transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="truncate pr-1">
                    <div className="font-semibold text-[11px] text-[#141413] truncate">{acc.user.full_name}</div>
                    <div className="text-[9px] text-[#8F8E87] font-mono truncate">
                      {acc.username} &bull; {acc.user.role === 'SYSTEM_ADMIN' ? 'Admin' : 'Officer'}
                    </div>
                  </div>
                  {copiedAccount === acc.username ? (
                    <Check className="w-3 h-3 text-[#1B7F43] shrink-0" />
                  ) : (
                    <span className="text-[10px] text-[#D4381D] font-mono opacity-0 group-hover:opacity-100 shrink-0">&rarr;</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginModal;
