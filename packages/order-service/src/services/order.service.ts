import { prisma } from '../db.js';

export async function getOrdersByUserId(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getOrderById(id: string) {
  return prisma.order.findUnique({ where: { id } });
}
