import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import getAllLibraryRoute from "./routes/library/get-all/route";
import addLibraryRoute from "./routes/library/add/route";
import removeLibraryRoute from "./routes/library/remove/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  library: createTRPCRouter({
    getAll: getAllLibraryRoute,
    add: addLibraryRoute,
    remove: removeLibraryRoute,
  }),
});

export type AppRouter = typeof appRouter;
