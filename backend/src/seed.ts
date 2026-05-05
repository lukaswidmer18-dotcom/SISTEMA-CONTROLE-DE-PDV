import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed...');

  const adminPassword = await bcrypt.hash('admin123', 10);
  const promotorPassword = await bcrypt.hash('promotor123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@sistema.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@sistema.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  });

  const promotor = await prisma.user.upsert({
    where: { email: 'promotor@sistema.com' },
    update: {},
    create: {
      name: 'João Promotor',
      email: 'promotor@sistema.com',
      passwordHash: promotorPassword,
      role: 'PROMOTOR',
    },
  });

  const pdv1 = await prisma.pDV.upsert({
    where: { id: 'pdv-exemplo-1' },
    update: {},
    create: {
      id: 'pdv-exemplo-1',
      name: 'Supermercado Central',
      address: 'Rua das Flores, 123',
      city: 'São Paulo',
    },
  });

  const pdv2 = await prisma.pDV.upsert({
    where: { id: 'pdv-exemplo-2' },
    update: {},
    create: {
      id: 'pdv-exemplo-2',
      name: 'Mercado Bom Preço',
      address: 'Av. Brasil, 456',
      city: 'São Paulo',
    },
  });

  await prisma.product.upsert({
    where: { id: 'prod-exemplo-1' },
    update: {},
    create: {
      id: 'prod-exemplo-1',
      name: 'Leite Integral 1L',
      brand: 'Bello',
      sku: 'LEI-001',
    },
  });

  await prisma.product.upsert({
    where: { id: 'prod-exemplo-2' },
    update: {},
    create: {
      id: 'prod-exemplo-2',
      name: 'Iogurte Natural 170g',
      brand: 'Bello',
      sku: 'IOG-001',
    },
  });

  await prisma.product.upsert({
    where: { id: 'prod-exemplo-3' },
    update: {},
    create: {
      id: 'prod-exemplo-3',
      name: 'Queijo Minas 500g',
      brand: 'Bello',
      sku: 'QUE-001',
    },
  });

  console.log('Seed concluído!');
  console.log('Admin: admin@sistema.com / admin123');
  console.log('Promotor: promotor@sistema.com / promotor123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
