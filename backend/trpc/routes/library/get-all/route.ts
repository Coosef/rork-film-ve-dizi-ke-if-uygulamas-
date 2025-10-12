import { publicProcedure } from "@/backend/trpc/create-context";
import { Interaction } from "@/types/library";

const interactions: Interaction[] = [];

export default publicProcedure.query(() => {
  console.log('[Backend] getAll called, returning', interactions.length, 'interactions');
  return interactions;
});

export { interactions };
