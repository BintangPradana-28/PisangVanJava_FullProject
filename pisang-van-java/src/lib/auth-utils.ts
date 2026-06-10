import type { Role } from '@prisma/client'
import type { Session } from 'next-auth'

/**
 * Validates if the current session possesses one of the allowed roles.
 * Supports exact array matching for robust Edge/Server Action RBAC.
 */
export function hasRole(session: Session | null | undefined, ...allowedRoles: Role[]): boolean {
  if (!session?.user?.role) return false
  return allowedRoles.includes(session.user.role as Role)
}

/**
 * Asserts the session role and throws if unauthorized.
 * Highly recommended for Server Actions to prevent BOLA/IDOR.
 */
export function requireRole(session: Session | null | undefined, ...allowedRoles: Role[]): void {
  if (!hasRole(session, ...allowedRoles)) {
    throw new Error('UNAUTHORIZED: Insufficient permissions.')
  }
}
