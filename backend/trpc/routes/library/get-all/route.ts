import { publicProcedure } from "@/backend/trpc/create-context";
import { Interaction } from "@/types/library";

const interactions: Interaction[] = [];

export default publicProcedure.query(() => {
  return interactions;
});

export { interactions };
