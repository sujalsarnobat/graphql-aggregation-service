import { prisma } from '../db.js';
import { NotFoundError } from '@gas/shared';

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new NotFoundError('Product', id);
  return product;
}

export async function getAllProducts() {
  return prisma.product.findMany({ orderBy: { createdAt: 'asc' } });
}

export async function getProductsByIds(ids: string[]) {
  return prisma.product.findMany({ where: { id: { in: ids } } });
}
