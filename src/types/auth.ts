export type UserRole = 'SYSTEM_ADMIN' | 'ENFORCEMENT_OFFICER';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  location_unit?: string;
  is_active: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}
