// Minimal, non-sensitive projection of User for embedding "who did this"
// on other records (asset holder, movement actor, notification target,
// etc). Deliberately excludes passwordHash, invite fields, and the
// legacy*Id migration-bridge fields — those never leave the core module.
export const PUBLIC_USER_SELECT = {
  id: true,
  fullName: true,
} as const;
