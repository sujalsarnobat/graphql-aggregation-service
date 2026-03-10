import { PrismaClient, OrderStatus } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

const orders = [
  { id: 'order_1',  userId: 'user_1', productId: 'prod_1',  quantity: 2, totalPrice: 59.98,  status: OrderStatus.DELIVERED  },
  { id: 'order_2',  userId: 'user_1', productId: 'prod_3',  quantity: 1, totalPrice: 999.99, status: OrderStatus.DELIVERED  },
  { id: 'order_3',  userId: 'user_1', productId: 'prod_5',  quantity: 3, totalPrice: 44.97,  status: OrderStatus.SHIPPED    },
  { id: 'order_4',  userId: 'user_2', productId: 'prod_2',  quantity: 1, totalPrice: 39.99,  status: OrderStatus.PROCESSING },
  { id: 'order_5',  userId: 'user_2', productId: 'prod_4',  quantity: 2, totalPrice: 159.98, status: OrderStatus.PENDING    },
  { id: 'order_6',  userId: 'user_2', productId: 'prod_6',  quantity: 1, totalPrice: 249.99, status: OrderStatus.DELIVERED  },
  { id: 'order_7',  userId: 'user_3', productId: 'prod_7',  quantity: 4, totalPrice: 79.96,  status: OrderStatus.SHIPPED    },
  { id: 'order_8',  userId: 'user_3', productId: 'prod_8',  quantity: 1, totalPrice: 129.99, status: OrderStatus.PENDING    },
  { id: 'order_9',  userId: 'user_4', productId: 'prod_9',  quantity: 2, totalPrice: 49.98,  status: OrderStatus.DELIVERED  },
  { id: 'order_10', userId: 'user_4', productId: 'prod_10', quantity: 1, totalPrice: 89.99,  status: OrderStatus.PROCESSING },
  { id: 'order_11', userId: 'user_4', productId: 'prod_1',  quantity: 1, totalPrice: 29.99,  status: OrderStatus.SHIPPED    },
  { id: 'order_12', userId: 'user_5', productId: 'prod_2',  quantity: 3, totalPrice: 119.97, status: OrderStatus.CANCELLED  },
  { id: 'order_13', userId: 'user_5', productId: 'prod_3',  quantity: 1, totalPrice: 999.99, status: OrderStatus.DELIVERED  },
  { id: 'order_14', userId: 'user_5', productId: 'prod_5',  quantity: 2, totalPrice: 29.98,  status: OrderStatus.PENDING    },
  { id: 'order_15', userId: 'user_1', productId: 'prod_9',  quantity: 1, totalPrice: 24.99,  status: OrderStatus.PROCESSING },
];

async function main() {
  console.log('Seeding order database...');

  for (const order of orders) {
    await prisma.order.upsert({
      where: { id: order.id },
      update: order,
      create: order,
    });
  }

  console.log(`Seeded ${orders.length} orders.`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
