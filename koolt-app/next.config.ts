import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // El dominio y Prisma solo corren en el servidor: nunca se empaquetan al cliente.
  serverExternalPackages: ['@prisma/client'],
};

export default nextConfig;
