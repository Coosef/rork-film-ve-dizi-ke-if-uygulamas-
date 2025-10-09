import { MediaType } from './tvmaze';

export type InteractionType = 'watchlist' | 'watched' | 'watching' | 'favorite' | 'skipped';

export interface Interaction {
  id: string;
  mediaId: number;
  mediaType: MediaType;
  type: InteractionType;
  rating?: number;
  review?: Review;
  note?: string;
  watchProgress?: WatchProgress;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  rating: number;
  text?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WatchProgress {
  totalEpisodes: number;
  watchedEpisodes: number;
  watchedEpisodeIds: number[];
  currentSeason?: number;
  currentEpisode?: number;
  lastWatchedAt?: string;
}

export interface LibraryStats {
  totalWatched: number;
  totalWatchlist: number;
  totalFavorites: number;
  totalEpisodesWatched: number;
  genreDistribution: Record<string, number>;
  averageRating: number;
  monthlyWatchTime: number;
  currentStreak: number;
  longestStreak: number;
  lastWatchDate?: string;
}

export interface UserPreferences {
  theme: 'dark' | 'light';
  contentLanguage: string;
  uiLanguage: string;
  ageRestriction: boolean;
  autoPlayTrailers: boolean;
  hapticsEnabled: boolean;
  favoriteGenres: number[];
}
