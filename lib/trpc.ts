import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    console.log('[tRPC Client] Using window origin:', origin);
    return origin;
  }
  
  console.log('[tRPC Client] Not in browser, using localhost');
  return 'http://localhost:8081';
};

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      async fetch(url, options) {
        console.log('[tRPC Client] Request:', url);
        try {
          const res = await fetch(url, {
            ...options,
            headers: {
              ...options?.headers,
              'Content-Type': 'application/json',
            },
          });
          console.log('[tRPC Client] Response status:', res.status);
          
          if (!res.ok) {
            const text = await res.text();
            console.error('[tRPC Client] Response not OK:', res.status, res.statusText, text);
          }
          return res;
        } catch (err: any) {
          console.error('[tRPC Client] Fetch error:', err.message || err);
          throw err;
        }
      },
    }),
  ],
});
