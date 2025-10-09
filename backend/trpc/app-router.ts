import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import getAllLibraryRoute from "./routes/library/get-all/route";
import addLibraryRoute from "./routes/library/add/route";
import removeLibraryRoute from "./routes/library/remove/route";
import getStatsRoute from "./routes/library/get-stats/route";
import getHistoryRoute from "./routes/library/get-history/route";
import getPreferencesRoute from "./routes/preferences/get/route";
import updatePreferencesRoute from "./routes/preferences/update/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  library: createTRPCRouter({
    getAll: getAllLibraryRoute,
    add: addLibraryRoute,
    remove: removeLibraryRoute,
    getStats: getStatsRoute,
    getHistory: getHistoryRoute,
  }),
  preferences: createTRPCRouter({
    get: getPreferencesRoute,
    update: updatePreferencesRoute,
  }),
});

export type AppRouter = typeof appRouter;
