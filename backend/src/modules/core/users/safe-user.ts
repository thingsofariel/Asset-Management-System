// Single source of truth for which User fields are safe to return to
// a client. UsersService uses this as a Prisma `select`; AuthService
// uses toSafeUser() to narrow a full row after login/accept-invite,
// where a `select` isn't convenient since bcrypt needs passwordHash
// first. Both importing the same object is what stops the two code
// paths from silently drifting apart, the way they just did.
export const SAFE_USER_SELECT = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  status: true,
  avatarUrl: true,
  departmentId: true,
  createdAt: true,
} as const;

type SafeUserKeys = keyof typeof SAFE_USER_SELECT;

export function toSafeUser<T extends Record<string, any>>(user: T): Pick<T, SafeUserKeys> {
  const result = {} as Pick<T, SafeUserKeys>;
  for (const key of Object.keys(SAFE_USER_SELECT) as SafeUserKeys[]) {
    result[key] = user[key];
  }
  return result;
}
