import { publicProcedure } from "@/backend/trpc/create-context";
import { interactions } from "../get-all/route";
import { LibraryStats } from "@/types/library";

export default publicProcedure.query(() => {
  const watched = interactions.filter(i => i.type === 'watched' || i.type === 'watching');
  const watchlist = interactions.filter(i => i.type === 'watchlist');
  const favorites = interactions.filter(i => i.type === 'favorite');

  const ratingsSum = watched.reduce((sum, i) => sum + (i.rating || 0), 0);
  const ratingsCount = watched.filter(i => i.rating).length;

  const totalEpisodesWatched = interactions.reduce((sum, i) => {
    return sum + (i.watchProgress?.watchedEpisodes || 0);
  }, 0);

  const allWatchDates = interactions
    .filter(i => i.watchProgress?.lastWatchedAt)
    .map(i => i.watchProgress!.lastWatchedAt!)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  if (allWatchDates.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const uniqueDates = [...new Set(allWatchDates.map(d => {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    }))].sort((a, b) => b - a);

    for (let i = 0; i < uniqueDates.length; i++) {
      const currentDate = new Date(uniqueDates[i]);
      
      if (i === 0) {
        const daysDiff = Math.floor((today.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 1) {
          currentStreak = 1;
          tempStreak = 1;
        }
      } else {
        const prevDate = new Date(uniqueDates[i - 1]);
        const daysDiff = Math.floor((prevDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          tempStreak++;
          if (i === 1 || currentStreak > 0) {
            currentStreak++;
          }
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
          if (currentStreak > 0) {
            currentStreak = 0;
          }
        }
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);
  }

  const genreDistribution: Record<string, number> = {};
  
  const stats: LibraryStats = {
    totalWatched: watched.length,
    totalWatchlist: watchlist.length,
    totalFavorites: favorites.length,
    totalEpisodesWatched,
    genreDistribution,
    averageRating: ratingsCount > 0 ? ratingsSum / ratingsCount : 0,
    monthlyWatchTime: 0,
    currentStreak,
    longestStreak,
    lastWatchDate: allWatchDates[0],
  };

  console.log('[Backend] Stats calculated:', stats);
  return stats;
});
