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
    <div className="space-y-6 animate-fade-in text-text-main">
      
      {/* Top Banner */}
      <div className="bg-surface-container-lowest border border-border-subtle rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <div className="p-2 bg-primary/10 border border-primary/20 text-primary rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-primary font-headline-lg">Official User & Role Management</h1>
          </div>
          <p className="text-xs text-text-muted">
            Role-Based Access Control (RBAC) under Legal Metrology & statutory enforcement guidelines
          </p>
        </div>
        <button
          onClick={onOpenLogin}
          className="flex items-center space-x-2 bg-primary hover:bg-primary-container text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs transition cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Switch / Add Account</span>
        </button>
      </div>

      {/* User Table */}
      <div className="bg-surface-container-lowest border border-border-subtle rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border-subtle font-semibold text-sm text-text-main flex justify-between items-center bg-surface-container-low">
          <span>Registered Statutory Officials</span>
          <span className="text-xs text-text-muted font-normal">Total Accounts: {usersList.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-text-main">
            <thead className="bg-surface-container-low text-text-muted uppercase tracking-wider text-[11px] border-b border-border-subtle">
              <tr>
                <th className="py-3.5 px-4 font-semibold">User Name & Email</th>
                <th className="py-3.5 px-4 font-semibold">Access Privilege</th>
                <th className="py-3.5 px-4 font-semibold">Inspection Zone / Unit</th>
                <th className="py-3.5 px-4 font-semibold">Account Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Privileges</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {usersList.map((u) => (
                <tr key={u.id} className="hover:bg-surface-container-low/60 transition">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-text-main">{u.full_name}</div>
                    <div className="text-[11px] text-text-muted flex items-center space-x-1 mt-0.5">
                      <Mail className="w-3 h-3 text-text-muted" />
                      <span>{u.email}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                      u.role === 'SYSTEM_ADMIN' 
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                      <Shield className="w-3 h-3" />
                      <span>{u.role === 'SYSTEM_ADMIN' ? 'System Administrator' : 'Enforcement / Inspection Officer'}</span>
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-1.5 text-text-muted">
                      <Building className="w-3.5 h-3.5 text-text-muted" />
                      <span>{u.location_unit || 'Default Unit'}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center space-x-1 text-emerald-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>ACTIVE</span>
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <span className="text-xs text-primary font-medium">
                      Statutory Role
                    </span>
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
