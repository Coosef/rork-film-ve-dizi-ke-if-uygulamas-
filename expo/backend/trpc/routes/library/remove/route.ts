import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { interactions } from "../get-all/route";

export default publicProcedure
  .input(
    z.object({
      mediaId: z.number(),
      mediaType: z.enum(["movie", "tv"]),
    })
  )
  .mutation(({ input }) => {
    const index = interactions.findIndex(
      (i) => i.mediaId === input.mediaId && i.mediaType === input.mediaType
    );

    if (index >= 0) {
      interactions.splice(index, 1);
      console.log("[Backend] Removed interaction for", input.mediaId);
      return { success: true };
    }

    return { success: false };
  });
