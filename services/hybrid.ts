import { MediaItem, ShowDetails } from '@/types/tvmaze';
import * as TVMaze from './tvmaze';
import * as TMDB from './tmdb';

export interface EnrichedMediaItem extends MediaItem {
  tmdbId?: number;
  tmdbPosterPath?: string;
  tmdbBackdropPath?: string;
  tmdbVoteAverage?: number;
  tmdbVoteCount?: number;
  streamingAvailability?: StreamingProvider[];
}

export interface StreamingProvider {
  provider: string;
  providerId: number;
  logoPath: string;
  displayPriority: number;
  link?: string;
}



export const searchTMDBByName = async (
  name: string,
  year?: string
): Promise<{ id: number; posterPath: string | null; backdropPath: string | null; voteAverage: number; voteCount: number } | null> => {
  try {
    const searchYear = year ? year.split('-')[0] : undefined;
    const results = await TMDB.searchMovies(name);
    
    if (results.results.length === 0) return null;
    
    let bestMatch = results.results[0];
    
    if (searchYear) {
      const yearMatch = results.results.find(r => {
        const releaseYear = r.release_date?.split('-')[0];
        return releaseYear === searchYear;
      });
      if (yearMatch) bestMatch = yearMatch;
    }
    
    return {
      id: bestMatch.id,
      posterPath: bestMatch.poster_path,
      backdropPath: bestMatch.backdrop_path,
      voteAverage: bestMatch.vote_average,
      voteCount: bestMatch.vote_count,
    };
  } catch (error) {
    console.error('[Hybrid] Error searching TMDB:', error);
    return null;
  }
};

export const enrichMediaItem = async (tvmazeItem: MediaItem): Promise<EnrichedMediaItem> => {
  const enriched: EnrichedMediaItem = { ...tvmazeItem };
  
  try {
    const tmdbData = await searchTMDBByName(tvmazeItem.title, tvmazeItem.releaseDate);
    
    if (tmdbData) {
      enriched.tmdbId = tmdbData.id;
      enriched.tmdbPosterPath = tmdbData.posterPath || undefined;
      enriched.tmdbBackdropPath = tmdbData.backdropPath || undefined;
      enriched.tmdbVoteAverage = tmdbData.voteAverage;
      enriched.tmdbVoteCount = tmdbData.voteCount;
      
      if (tmdbData.posterPath && !tvmazeItem.posterPath) {
        enriched.posterPath = TMDB.getImageUrl(tmdbData.posterPath, 'w500') || null;
      }
      if (tmdbData.backdropPath && !tvmazeItem.backdropPath) {
        enriched.backdropPath = TMDB.getImageUrl(tmdbData.backdropPath, 'w780') || null;
      }
    }
  } catch {
    console.log('[Hybrid] Could not enrich item:', tvmazeItem.title);
  }
  
  return enriched;
};

export const getEnrichedDiscoverStack = async (page: number = 1): Promise<EnrichedMediaItem[]> => {
  const tvmazeItems = await TVMaze.getDiscoverStack(page);
  
  const enrichedItems = await Promise.all(
    tvmazeItems.map(item => enrichMediaItem(item))
  );
  
  return enrichedItems;
};

export const getEnrichedShowDetails = async (showId: number): Promise<ShowDetails & { tmdbData?: any }> => {
  const showDetails = await TVMaze.getShowDetails(showId);
  
  let tmdbData;
  try {
    const tmdbMatch = await searchTMDBByName(showDetails.name, showDetails.premiered);
    if (tmdbMatch) {
      tmdbData = tmdbMatch;
    }
  } catch {
    console.log('[Hybrid] Could not fetch TMDB data for show:', showDetails.name);
  }
  
  return {
    ...showDetails,
    tmdbData,
  };
};

export const getHighQualityPoster = (item: EnrichedMediaItem, size: 'small' | 'medium' | 'large' = 'medium'): string => {
  const sizeMap = {
    small: 'w342',
    medium: 'w500',
    large: 'w780',
  };
  
  if (item.tmdbPosterPath) {
    return TMDB.getImageUrl(item.tmdbPosterPath, sizeMap[size] as any);
  }
  
  if (item.posterPath) {
    if (item.posterPath.startsWith('http')) {
      return item.posterPath;
    }
    return TMDB.getImageUrl(item.posterPath, sizeMap[size] as any);
  }
  
  return 'https://via.placeholder.com/500x750?text=No+Image';
};

export const getHighQualityBackdrop = (item: EnrichedMediaItem, size: 'medium' | 'large' | 'original' = 'large'): string => {
  const sizeMap = {
    medium: 'w500',
    large: 'w780',
    original: 'original',
  };
  
  if (item.tmdbBackdropPath) {
    return TMDB.getImageUrl(item.tmdbBackdropPath, sizeMap[size] as any);
  }
  
  if (item.backdropPath) {
    if (item.backdropPath.startsWith('http')) {
      return item.backdropPath;
    }
    return TMDB.getImageUrl(item.backdropPath, sizeMap[size] as any);
  }
  
  return 'https://via.placeholder.com/1280x720?text=No+Image';
};
