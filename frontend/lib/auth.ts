export function saveSession(accessToken: string, user: { name: string; email: string; role: string }) {
  window.localStorage.setItem('accessToken', accessToken);
  window.localStorage.setItem('user', JSON.stringify(user));
}

export function getStoredUser() {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

export function clearSession() {
  window.localStorage.removeItem('accessToken');
  window.localStorage.removeItem('user');
}
