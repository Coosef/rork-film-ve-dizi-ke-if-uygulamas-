import { publicProcedure } from "@/backend/trpc/create-context";
import { UserPreferences } from "@/types/library";

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'dark',
  contentLanguage: 'tr-TR',
  uiLanguage: 'tr',
  ageRestriction: false,
  autoPlayTrailers: false,
  hapticsEnabled: true,
  favoriteGenres: [],
};

let userPreferences: UserPreferences = { ...DEFAULT_PREFERENCES };

export default publicProcedure.query(() => {
  return userPreferences;
});

export { userPreferences };
