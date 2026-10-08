import { PrismaClient } from '@prisma/client';

// Una sola instancia: en desarrollo Next recarga los módulos en cada cambio y
// sin esto se abriría una conexión nueva por recarga hasta agotar el pool.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
