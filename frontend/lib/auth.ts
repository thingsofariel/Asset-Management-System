// User shape now matches the unified backend's core.User — fullName
// (not name/lastName), plus fields that didn't exist before unification:
// role can be EMPLOYEE now, not just ADMIN; status distinguishes a
// pending invite from an activated account.
export interface StoredUser {
  id: string;
  fullName: string;
  email: string;
  role: 'ADMIN' | 'EMPLOYEE';
  status: 'PENDING' | 'ACTIVE' | 'DISABLED';
  avatarUrl?: string | null;
  departmentId?: string | null;
}

export function saveSession(accessToken: string, user: StoredUser) {
  window.localStorage.setItem('accessToken', accessToken);
  window.localStorage.setItem('user', JSON.stringify(user));
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

export function clearSession() {
  window.localStorage.removeItem('accessToken');
  window.localStorage.removeItem('user');
}
