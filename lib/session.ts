import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function requireOwner() {
  const user = await requireAuth();
  if (user.role !== 'OWNER') {
    throw new Error('Forbidden: Owner access required');
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== 'ADMIN' && user.role !== 'OWNER') {
    throw new Error('Forbidden: Admin access required');
  }
  return user;
}

export async function requireStaff() {
  const user = await requireAuth();
  if (user.role !== 'ADMIN' && user.role !== 'STAFF' && user.role !== 'OWNER') {
    throw new Error('Forbidden: Staff access required');
  }
  return user;
}
