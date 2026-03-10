import { PrismaClient } from './generated/prisma/index.js';

export const prisma = new PrismaClient({
  log:
    process.env['NODE_ENV'] === 'development'
      ? [{ level: 'query', emit: 'stdout' }, { level: 'warn', emit: 'stdout' }]
      : [{ level: 'warn', emit: 'stdout' }, { level: 'error', emit: 'stdout' }],
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
