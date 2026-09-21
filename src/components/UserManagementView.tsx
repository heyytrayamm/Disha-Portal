import React from 'react';
import { Users, Shield, Building, Mail, CheckCircle2, UserPlus } from 'lucide-react';
import type { User } from '../types/auth';
import { DEMO_ACCOUNTS } from '../services/authService';

interface UserManagementViewProps {
  currentUser: User | null;
  onOpenLogin: () => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({ currentUser: _currentUser, onOpenLogin }) => {
  const usersList: User[] = DEMO_ACCOUNTS.map(acc => acc.user);

  return (
    <div className="space-y-6 animate-fade-in text-[#141413]">
      
      {/* ═══ Top Header ═══ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E2DFD8] pb-5">
        <div>
          <span className="section-tag">REFERENCE / ENFORCEMENT</span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#141413] mt-1">
            Officials directory
          </h1>
          <p className="text-xs sm:text-sm text-[#6E6D67] mt-1">
            Role-Based Access Control (RBAC) under Legal Metrology & statutory enforcement guidelines.
          </p>
        </div>
        <button
          onClick={onOpenLogin}
          className="btn-primary text-xs font-semibold"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Switch / Add Account</span>
        </button>
      </div>

      {/* ═══ User Table ═══ */}
      <div className="disha-card overflow-hidden">
        <div className="p-3.5 border-b border-[#E2DFD8] bg-[#FAF9F6] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#D4381D]" />
            <span className="font-bold text-[#141413] uppercase tracking-wider">Registered Statutory Officials</span>
          </div>
          <span className="text-[11px] font-mono text-[#8F8E87]">Total Accounts: {usersList.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="disha-table">
            <thead>
              <tr>
                <th className="disha-th">Official Name & Email</th>
                <th className="disha-th">Access Privilege</th>
                <th className="disha-th">Inspection Zone / Unit</th>
                <th className="disha-th">Account Status</th>
                <th className="disha-th text-right">Privilege Scope</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map((u) => (
                <tr key={u.id} className="disha-tr">
                  <td className="disha-td">
                    <div className="font-semibold text-[#141413] flex items-center gap-2">
                      <div className="w-6 h-6 rounded-xs bg-[#141413] text-[#FFFFFF] font-mono text-[10px] font-bold flex items-center justify-center">
                        {u.full_name.charAt(0)}
                      </div>
                      <span>{u.full_name}</span>
                    </div>
                    <div className="text-[11px] text-[#6E6D67] flex items-center gap-1.5 mt-0.5 ml-8">
                      <Mail className="w-3 h-3 text-[#8F8E87]" />
                      <span>{u.email}</span>
                    </div>
                  </td>

                  <td className="disha-td">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold uppercase tracking-wider ${
                      u.role === 'SYSTEM_ADMIN' 
                        ? 'bg-[#EFECE6] text-[#141413] border border-[#D5D2C8]'
                        : 'bg-[#FAF4F2] text-[#D4381D] border border-[#F8B4AB]'
                    }`}>
                      <Shield className="w-3 h-3" />
                      <span>{u.role === 'SYSTEM_ADMIN' ? 'System Administrator' : 'Enforcement Officer'}</span>
                    </span>
                  </td>

                  <td className="disha-td">
                    <div className="flex items-center gap-1.5 text-xs text-[#6E6D67]">
                      <Building className="w-3.5 h-3.5 text-[#8F8E87]" />
                      <span>{u.location_unit || 'Default Unit'}</span>
                    </div>
                  </td>

                  <td className="disha-td">
                    <span className="badge-pass">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>ACTIVE</span>
                    </span>
                  </td>

                  <td className="disha-td text-right font-mono text-[11px] text-[#6E6D67]">
                    Statutory Role
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default UserManagementView;
