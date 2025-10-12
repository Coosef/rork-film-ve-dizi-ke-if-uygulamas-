import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  console.log('[tRPC Client] Base URL:', baseUrl);
  
  if (!baseUrl) {
    throw new Error(
      "No base url found, please set EXPO_PUBLIC_RORK_API_BASE_URL"
    );
  }
  
  return baseUrl;
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      fetch(url, options) {
        console.log('[tRPC Client] Request:', url);
        return fetch(url, options).then(res => {
          console.log('[tRPC Client] Response status:', res.status);
          if (!res.ok) {
            console.error('[tRPC Client] Response not OK:', res.status, res.statusText);
          }
          return res;
        }).catch(err => {
          console.error('[tRPC Client] Fetch error:', err);
          throw err;
        });
      },
    }),
  ],
});
