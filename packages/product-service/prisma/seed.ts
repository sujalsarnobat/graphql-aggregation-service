import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

const products = [
  {
    id: 'prod_1',
    name: 'Wireless Headphones',
    description: 'Premium noise-cancelling wireless headphones with 30-hour battery life.',
    price: 29.99,
    category: 'Electronics',
    inStock: true,
    imageUrl: 'https://example.com/images/headphones.jpg',
  },
  {
    id: 'prod_2',
    name: 'Running Shoes',
    description: 'Lightweight and breathable running shoes for all terrains.',
    price: 39.99,
    category: 'Sports',
    inStock: true,
    imageUrl: 'https://example.com/images/running-shoes.jpg',
  },
  {
    id: 'prod_3',
    name: 'Laptop Pro 15"',
    description: 'High-performance 15-inch laptop with Intel Core i9 and 32GB RAM.',
    price: 999.99,
    category: 'Electronics',
    inStock: true,
    imageUrl: 'https://example.com/images/laptop.jpg',
  },
  {
    id: 'prod_4',
    name: 'Yoga Mat',
    description: 'Eco-friendly non-slip yoga mat with alignment lines.',
    price: 79.99,
    category: 'Sports',
    inStock: true,
    imageUrl: 'https://example.com/images/yoga-mat.jpg',
  },
  {
    id: 'prod_5',
    name: 'Coffee Maker',
    description: 'Programmable 12-cup coffee maker with built-in grinder.',
    price: 14.99,
    category: 'Kitchen',
    inStock: true,
    imageUrl: 'https://example.com/images/coffee-maker.jpg',
  },
  {
    id: 'prod_6',
    name: 'Smart Watch',
    description: 'Fitness tracker with heart rate monitor, GPS, and 7-day battery.',
    price: 249.99,
    category: 'Electronics',
    inStock: true,
    imageUrl: 'https://example.com/images/smartwatch.jpg',
  },
  {
    id: 'prod_7',
    name: 'Resistance Bands Set',
    description: 'Set of 5 resistance bands for strength training and rehabilitation.',
    price: 19.99,
    category: 'Sports',
    inStock: true,
    imageUrl: 'https://example.com/images/resistance-bands.jpg',
  },
  {
    id: 'prod_8',
    name: 'Air Fryer',
    description: 'Digital air fryer with 8 preset cooking programs and 5.8-qt capacity.',
    price: 129.99,
    category: 'Kitchen',
    inStock: false,
    imageUrl: 'https://example.com/images/air-fryer.jpg',
  },
  {
    id: 'prod_9',
    name: 'Water Bottle',
    description: 'Insulated stainless steel water bottle — keeps cold 24h, hot 12h.',
    price: 24.99,
    category: 'Sports',
    inStock: true,
    imageUrl: 'https://example.com/images/water-bottle.jpg',
  },
  {
    id: 'prod_10',
    name: 'Bluetooth Speaker',
    description: 'Portable waterproof Bluetooth speaker with 360° surround sound.',
    price: 89.99,
    category: 'Electronics',
    inStock: true,
    imageUrl: 'https://example.com/images/speaker.jpg',
  },
];

async function main() {
  console.log('Seeding product database...');

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: product,
      create: product,
    });
  }

  console.log(`Seeded ${products.length} products.`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
