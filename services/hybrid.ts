import { MediaItem, ShowDetails } from '@/types/tvmaze';
import * as TVMaze from './tvmaze';

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
  return null;
};

export const enrichMediaItem = async (tvmazeItem: MediaItem): Promise<EnrichedMediaItem> => {
  return { ...tvmazeItem };
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
  return showDetails;
};

export const getHighQualityPoster = (item: EnrichedMediaItem, size: 'small' | 'medium' | 'large' = 'medium'): string => {
  if (item.posterPath) {
    if (item.posterPath.startsWith('http')) {
      return item.posterPath;
    }
  }
  
  return 'https://via.placeholder.com/500x750?text=No+Image';
};

export const getHighQualityBackdrop = (item: EnrichedMediaItem, size: 'medium' | 'large' | 'original' = 'large'): string => {
  if (item.backdropPath) {
    if (item.backdropPath.startsWith('http')) {
      return item.backdropPath;
    }
  }
  
  return 'https://via.placeholder.com/1280x720?text=No+Image';
};
