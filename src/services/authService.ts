import type { User, AuthState, UserRole } from '../types/auth';

const TOKEN_KEY = 'lm_auth_token';
const USER_KEY = 'lm_auth_user';

export interface DemoAccount {
  user: User;
  username: string;
  passwords: string[];
  role: UserRole;
  roleLabel: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    username: 'inspector.arjun',
    passwords: ['Inspect@2026'],
    role: 'ENFORCEMENT_OFFICER',
    roleLabel: 'Enforcement / Inspection Officer',
    user: {
      id: 'usr_officer_arjun',
      email: 'inspector.arjun@legalmetrology.gov.in',
      full_name: 'Arjun Sharma',
      role: 'ENFORCEMENT_OFFICER',
      location_unit: 'Delhi Zone 4 Field Inspection',
      is_active: true
    }
  },
  {
    username: 'admin.priya',
    passwords: ['Admin@2026'],
    role: 'SYSTEM_ADMIN',
    roleLabel: 'System Administrator',
    user: {
      id: 'usr_admin_priya',
      email: 'admin.priya@legalmetrology.gov.in',
      full_name: 'Priya Mehta',
      role: 'SYSTEM_ADMIN',
      location_unit: 'Central Directorate, New Delhi',
      is_active: true
    }
  }
];

export const DEFAULT_OFFICER_USER: User = DEMO_ACCOUNTS[0].user;
export const DEFAULT_ADMIN_USER: User = DEMO_ACCOUNTS[1].user;

export class AuthService {
  static getInitialState(): AuthState {
    const token = localStorage.getItem(TOKEN_KEY);
    const userStr = localStorage.getItem(USER_KEY);

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        if (user && (user.role === 'ENFORCEMENT_OFFICER' || user.role === 'SYSTEM_ADMIN')) {
          // Cleanly upgrade any legacy cache that had old placeholder names
          if (
            user.full_name?.toLowerCase().includes('rajesh') ||
            user.email?.toLowerCase().includes('officer.delhi')
          ) {
            const updated = { ...DEFAULT_OFFICER_USER };
            this.setSession(updated, token);
            return { user: updated, token, isAuthenticated: true };
          }
          return { user, token, isAuthenticated: true };
        }
      } catch {
        // Fallback
      }
    }

    return {
      user: null,
      token: null,
      isAuthenticated: false
    };
  }

  static setSession(user: User, token: string) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  static clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  static authenticate(
    usernameOrEmail: string,
    password: string,
    selectedRole: UserRole
  ): { success: boolean; user?: User; token?: string; error?: string } {
    const trimmedInput = usernameOrEmail.trim().toLowerCase();

    // Match by username or email
    const account = DEMO_ACCOUNTS.find(
      (a) =>
        a.username.toLowerCase() === trimmedInput ||
        a.user.email.toLowerCase() === trimmedInput
    );

    if (!account) {
      return { success: false, error: 'Invalid username or password.' };
    }

    if (!account.passwords.includes(password)) {
      return { success: false, error: 'Invalid username or password.' };
    }

    if (account.role !== selectedRole) {
      return {
        success: false,
        error: 'Selected role does not match account credentials.'
      };
    }

    const token = 'demo-jwt-token-sih2026';
    this.setSession(account.user, token);
    return { success: true, user: account.user, token };
  }

  static hasPermission(role: UserRole, requiredRole: 'ADMIN' | 'OFFICER' | 'ANY'): boolean {
    if (requiredRole === 'ANY') return true;
    if (requiredRole === 'ADMIN') return role === 'SYSTEM_ADMIN';
    if (requiredRole === 'OFFICER') return role === 'SYSTEM_ADMIN' || role === 'ENFORCEMENT_OFFICER';
    return false;
  }
}
