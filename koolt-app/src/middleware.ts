import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const esPublica = createRouteMatcher(['/ingresar(.*)', '/registro(.*)']);
// Las rutas de la API verifican sesión y rol por su cuenta y responden JSON
// con 401/403, en vez de una redirección que el cliente no sabría leer.
const esApi = createRouteMatcher(['/api(.*)']);

export default clerkMiddleware(
  async (auth, req) => {
    if (!esPublica(req) && !esApi(req)) await auth.protect();
  },
  { signInUrl: '/ingresar', signUpUrl: '/registro' },
);

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
