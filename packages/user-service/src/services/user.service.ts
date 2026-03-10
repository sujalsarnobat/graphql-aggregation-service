import { prisma } from '../db.js';
import { NotFoundError } from '@gas/shared';

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('User', id);
  return user;
}

export async function getAllUsers() {
  return prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
}
