import { publicProcedure } from "@/backend/trpc/create-context";
import { z } from "zod";
import { userPreferences } from "../get/route";

const updatePreferencesSchema = z.object({
  theme: z.enum(['light', 'dark']).optional(),
  contentLanguage: z.string().optional(),
  uiLanguage: z.string().optional(),
  ageRestriction: z.boolean().optional(),
  autoPlayTrailers: z.boolean().optional(),
  hapticsEnabled: z.boolean().optional(),
  favoriteGenres: z.array(z.number()).optional(),
});

export default publicProcedure
  .input(updatePreferencesSchema)
  .mutation(({ input }) => {
    Object.assign(userPreferences, input);
    console.log('[Backend] Preferences updated:', userPreferences);
    return userPreferences;
  });
