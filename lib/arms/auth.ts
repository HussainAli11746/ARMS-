import { getUserBySession } from './db.ts';
import type { User } from './model.ts';
import { DomainError } from './service.ts';

export function getSessionUser(request: Request): User | null {
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const user = getUserBySession(token);
    if (user) return user;
  }

  // Check Cookie header
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/arms_session=([a-f0-9]+)/);
  if (match) {
    const token = match[1];
    const user = getUserBySession(token);
    if (user) return user;
  }

  return null;
}

export function requireAuth(request: Request): User {
  const user = getSessionUser(request);
  if (!user) {
    throw new DomainError(401, 'Please sign in to access this resource.');
  }
  return user;
}
