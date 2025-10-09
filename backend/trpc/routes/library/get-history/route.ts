import { publicProcedure } from "@/backend/trpc/create-context";
import { interactions } from "../get-all/route";
import { z } from "zod";

const getHistorySchema = z.object({
  limit: z.number().optional().default(20),
  offset: z.number().optional().default(0),
});

export default publicProcedure
  .input(getHistorySchema)
  .query(({ input }) => {
    const { limit, offset } = input;
    
    const watchedItems = interactions
      .filter(i => (i.type === 'watched' || i.type === 'watching') && i.watchProgress?.lastWatchedAt)
      .sort((a, b) => {
        const dateA = new Date(a.watchProgress!.lastWatchedAt!).getTime();
        const dateB = new Date(b.watchProgress!.lastWatchedAt!).getTime();
        return dateB - dateA;
      });

    const paginatedItems = watchedItems.slice(offset, offset + limit);
    
    console.log('[Backend] History fetched:', paginatedItems.length, 'items');
    
    return {
      items: paginatedItems,
      total: watchedItems.length,
      hasMore: offset + limit < watchedItems.length,
    };
  });
