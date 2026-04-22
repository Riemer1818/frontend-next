import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/routers/_app';
import { createContext } from '@/server/context';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
    onError({ path, error }) {
      console.error(`❌ tRPC Error on ${path}:`);
      console.error('Message:', error.message);
      console.error('Code:', error.code);
      console.error('Stack:', error.stack);
      if (error.cause) {
        console.error('Cause:', error.cause);
      }
    },
  });

export { handler as GET, handler as POST };
