import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

const users = [
  {
    id: 'user_1',
    name: 'Alice Johnson',
    email: 'alice.johnson@example.com',
    phone: '+1-555-0101',
    address: '123 Maple Street, Springfield, IL 62701',
  },
  {
    id: 'user_2',
    name: 'Bob Smith',
    email: 'bob.smith@example.com',
    phone: '+1-555-0102',
    address: '456 Oak Avenue, Portland, OR 97201',
  },
  {
    id: 'user_3',
    name: 'Carol White',
    email: 'carol.white@example.com',
    phone: '+1-555-0103',
    address: '789 Pine Road, Austin, TX 78701',
  },
  {
    id: 'user_4',
    name: 'David Brown',
    email: 'david.brown@example.com',
    phone: '+1-555-0104',
    address: '321 Elm Street, Seattle, WA 98101',
  },
  {
    id: 'user_5',
    name: 'Eva Martinez',
    email: 'eva.martinez@example.com',
    phone: '+1-555-0105',
    address: '654 Cedar Lane, Miami, FL 33101',
  },
];

async function main() {
  console.log('Seeding user database...');

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: user,
      create: user,
    });
  }

  console.log(`Seeded ${users.length} users.`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
