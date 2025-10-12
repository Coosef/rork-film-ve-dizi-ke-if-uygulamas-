import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

const app = new Hono();

console.log('[Hono] Server initializing...');
console.log('[Hono] Environment:', process.env.NODE_ENV || 'development');

app.use("*", cors({
  origin: '*',
  credentials: true,
}));

app.use(
  "/api/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
    onError({ error, path }) {
      console.error('[tRPC Error]', path, error);
    },
  })
);

app.get("/", (c) => {
  console.log('[Hono] Health check called');
  return c.json({ status: "ok", message: "API is running", timestamp: new Date().toISOString() });
});

app.get("/api", (c) => {
  console.log('[Hono] API health check called');
  return c.json({ status: "ok", message: "API endpoint is running", timestamp: new Date().toISOString() });
});

app.onError((err, c) => {
  console.error('[Hono Error]', err);
  return c.json({ error: err.message }, 500);
});

console.log('[Hono] Server initialized successfully');

export default app;
