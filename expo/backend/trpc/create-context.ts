import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { supabase } from '@/lib/supabase';

export const createContext = async (opts: FetchCreateContextFnOptions) => {
  console.log('[tRPC Context] Creating context for request:', opts.req.url);
  
  const authHeader = opts.req.headers.get('authorization');
  let user = null;
  
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: authUser }, error } = await supabase.auth.getUser(token);
    
    if (!error && authUser) {
      user = authUser;
      console.log('[tRPC Context] Authenticated user:', user.email);
    }
  }
  
  return {
    req: opts.req,
    user,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});
