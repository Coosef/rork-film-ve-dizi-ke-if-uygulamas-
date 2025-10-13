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
  
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    console.log('[tRPC Client] Using env URL:', envUrl);
    return envUrl;
  }
  
  console.log('[tRPC Client] Fallback to localhost');
  return 'http://localhost:8081';
};

const testBackendConnection = async () => {
  const baseUrl = getBaseUrl();
  try {
    const response = await fetch(`${baseUrl}/api`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.ok) {
      const data = await response.json();
      console.log('[tRPC Client] ✓ Backend connected:', data.message);
    } else {
      console.warn('[tRPC Client] ⚠ Backend not available (status:', response.status, '). App will work offline.');
    }
  } catch {
    console.warn('[tRPC Client] ⚠ Backend not available. App will work offline.');
  }
};

if (typeof window !== 'undefined') {
  setTimeout(testBackendConnection, 1000);
}

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
