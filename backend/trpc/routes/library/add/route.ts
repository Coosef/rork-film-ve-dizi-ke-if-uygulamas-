import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { InteractionType, Interaction } from "@/types/library";
import { MediaType } from "@/types/tvmaze";
import { interactions } from "../get-all/route";

const reviewSchema = z.object({
  rating: z.number(),
  text: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const watchProgressSchema = z.object({
  totalEpisodes: z.number(),
  watchedEpisodes: z.number(),
  watchedEpisodeIds: z.array(z.number()),
  currentSeason: z.number().optional(),
  currentEpisode: z.number().optional(),
  lastWatchedAt: z.string().optional(),
});

export default publicProcedure
  .input(
    z.object({
      mediaId: z.number(),
      mediaType: z.enum(["movie", "tv"]),
      type: z.enum(["watchlist", "watched", "watching", "favorite", "skipped"]),
      rating: z.number().optional(),
      note: z.string().optional(),
      watchProgress: watchProgressSchema.optional(),
      review: reviewSchema.optional(),
    })
  )
  .mutation(({ input }) => {
    const existingIndex = interactions.findIndex(
      (i) => i.mediaId === input.mediaId && i.mediaType === input.mediaType
    );

    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      const existing = interactions[existingIndex];
      interactions[existingIndex] = {
        ...existing,
        type: input.type,
        rating: input.rating,
        review: input.review || existing.review,
        note: input.note,
        watchProgress: input.watchProgress || existing.watchProgress,
        updatedAt: now,
      };
      console.log("[Backend] Updated interaction for", input.mediaId);
      return interactions[existingIndex];
    } else {
      const newInteraction: Interaction = {
        id: `${input.mediaId}-${input.mediaType}-${Date.now()}`,
        mediaId: input.mediaId,
        mediaType: input.mediaType as MediaType,
        type: input.type as InteractionType,
        rating: input.rating,
        review: input.review,
        note: input.note,
        watchProgress: input.watchProgress,
        createdAt: now,
        updatedAt: now,
      };
      interactions.push(newInteraction);
      console.log("[Backend] Added new interaction for", input.mediaId, "type:", input.type);
      return newInteraction;
    }
  });
