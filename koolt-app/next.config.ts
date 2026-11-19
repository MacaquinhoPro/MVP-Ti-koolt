import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // El dominio y Prisma solo corren en el servidor: nunca se empaquetan al cliente.
  serverExternalPackages: ['@prisma/client'],
  // El indicador de desarrollo tapa la barra de cobro y el pie de la barra lateral en las demos.
  devIndicators: false,
};

export default nextConfig;
