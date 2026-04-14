import { TVMazeShow, TVMazeCast, TVMazeSearchResult, MediaItem, ShowDetails, TVMazeEpisode, TVMazeSeason } from '@/types/tvmaze';

const TVMAZE_BASE_URL = 'https://api.tvmaze.com';

export const getImageUrl = (show: TVMazeShow | null, size: 'medium' | 'original' = 'medium'): string => {
  if (!show?.image) return 'https://via.placeholder.com/500x750?text=No+Image';
  return size === 'medium' ? show.image.medium : show.image.original;
};

const fetchTVMaze = async <T>(endpoint: string, params: Record<string, string> = {}): Promise<T> => {
  const url = new URL(`${TVMAZE_BASE_URL}${endpoint}`);
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  console.log('[TVMaze] Fetching:', url.toString());
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TVMaze] Error:', response.status, response.statusText);
      console.error('[TVMaze] Error body:', errorText);
      throw new Error(`TVMaze API Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[TVMaze] Request timeout:', endpoint);
      throw new Error('Request timeout');
    }
    throw error;
  }
};

// Fetch shows with pagination - each page has ~250 shows
const fetchShowsPaginated = async (page: number = 0): Promise<TVMazeShow[]> => {
  return fetchTVMaze<TVMazeShow[]>(`/shows`, { page: page.toString() });
};

export const getTrending = async (): Promise<TVMazeShow[]> => {
  try {
    // Fetch first 2 pages (about 500 shows) for trending
    const [page0, page1] = await Promise.all([
      fetchShowsPaginated(0),
      fetchShowsPaginated(1),
    ]);
    const shows = [...page0, ...page1];
    return shows.sort((a, b) => b.weight - a.weight).slice(0, 20);
  } catch (error) {
    console.error('[TVMaze] Error fetching trending:', error);
    return [];
  }
};

export const getPopular = async (page: number = 1): Promise<TVMazeShow[]> => {
  try {
    const shows = await fetchShowsPaginated(page - 1);
    return shows.sort((a, b) => b.weight - a.weight).slice(0, 20);
  } catch (error) {
    console.error('[TVMaze] Error fetching popular:', error);
    return [];
  }
};

export const getTopRated = async (page: number = 1): Promise<TVMazeShow[]> => {
  try {
    const shows = await fetchShowsPaginated(page - 1);
    return shows
      .filter(show => show.rating.average !== null)
      .sort((a, b) => (b.rating.average || 0) - (a.rating.average || 0))
      .slice(0, 20);
  } catch (error) {
    console.error('[TVMaze] Error fetching top rated:', error);
    return [];
  }
};

export const getShowsByGenre = async (genre: string, page: number = 1): Promise<TVMazeShow[]> => {
  try {
    // Fetch first 3 pages to find shows by genre
    const shows = await fetchShowsPaginated(page - 1);
    return shows
      .filter(show => show.genres.includes(genre))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 20);
  } catch (error) {
    console.error('[TVMaze] Error fetching shows by genre:', error);
    return [];
  }
};

export const getShowDetails = async (showId: number): Promise<ShowDetails> => {
  const show = await fetchTVMaze<TVMazeShow>(`/shows/${showId}`);
  
  let cast: TVMazeCast[] = [];
  try {
    cast = await fetchTVMaze<TVMazeCast[]>(`/shows/${showId}/cast`);
  } catch (error) {
    console.log('[TVMaze] Could not fetch cast:', error);
  }

  let seasons: TVMazeSeason[] = [];
  try {
    seasons = await fetchTVMaze<TVMazeSeason[]>(`/shows/${showId}/seasons`);
  } catch (error) {
    console.log('[TVMaze] Could not fetch seasons:', error);
  }

  let episodes: TVMazeEpisode[] = [];
  try {
    episodes = await fetchTVMaze<TVMazeEpisode[]>(`/shows/${showId}/episodes`);
  } catch (error) {
    console.log('[TVMaze] Could not fetch episodes:', error);
  }

  return {
    ...show,
    cast,
    seasons,
    episodes,
  };
};

export const getShowEpisodes = async (showId: number): Promise<TVMazeEpisode[]> => {
  try {
    return await fetchTVMaze<TVMazeEpisode[]>(`/shows/${showId}/episodes`);
  } catch (error) {
    console.log('[TVMaze] Could not fetch episodes:', error);
    return [];
  }
};

export const getShowSeasons = async (showId: number): Promise<TVMazeSeason[]> => {
  try {
    return await fetchTVMaze<TVMazeSeason[]>(`/shows/${showId}/seasons`);
  } catch (error) {
    console.log('[TVMaze] Could not fetch seasons:', error);
    return [];
  }
};

export const searchShows = async (query: string): Promise<TVMazeShow[]> => {
  const results = await fetchTVMaze<TVMazeSearchResult[]>('/search/shows', { q: query });
  return results.map(result => result.show);
};

export const getDiscoverStack = async (page: number = 1): Promise<MediaItem[]> => {
  try {
    const shows = await getPopular(page);
    return shows.map(show => convertShowToMediaItem(show));
  } catch (error) {
    console.error('[TVMaze] Error fetching discover stack:', error);
    return [];
  }
};

export const convertShowToMediaItem = (show: TVMazeShow): MediaItem => ({
  id: show.id,
  type: 'tv',
  title: show.name,
  overview: show.summary ? show.summary.replace(/<[^>]*>/g, '') : '',
  posterPath: show.image?.medium || null,
  backdropPath: show.image?.original || null,
  releaseDate: show.premiered || '',
  voteAverage: show.rating.average || 0,
  voteCount: show.weight,
  genres: show.genres,
});

export const getNewReleases = async (): Promise<TVMazeShow[]> => {
  try {
    // Fetch first 2 pages for new releases
    const [page0, page1] = await Promise.all([
      fetchShowsPaginated(0),
      fetchShowsPaginated(1),
    ]);
    const shows = [...page0, ...page1];
    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    return shows
      .filter(show => {
        if (!show.premiered) return false;
        const premiereDate = new Date(show.premiered);
        return premiereDate >= threeMonthsAgo && premiereDate <= now;
      })
      .sort((a, b) => {
        const dateA = new Date(a.premiered || 0).getTime();
        const dateB = new Date(b.premiered || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 20);
  } catch (error) {
    console.error('[TVMaze] Error fetching new releases:', error);
    return [];
  }
};

export const getSimilarShows = async (showId: number): Promise<TVMazeShow[]> => {
  try {
    if (!showId || showId <= 0) {
      console.log('[TVMaze] Invalid showId for similar shows:', showId);
      return [];
    }

    const show = await fetchTVMaze<TVMazeShow>(`/shows/${showId}`);
    
    if (!show || !show.genres || show.genres.length === 0) {
      console.log('[TVMaze] Show has no genres, returning empty similar shows');
      return [];
    }

    // Strategy 1: Search by the main genre (most efficient)
    const mainGenre = show.genres[0];
    
    try {
      // Use search endpoint to find shows by genre keyword
      const searchResults = await fetchTVMaze<TVMazeSearchResult[]>('/search/shows', { q: mainGenre });
      
      if (searchResults && searchResults.length > 0) {
        const similar = searchResults
          .map(r => r.show)
          .filter(s => s.id !== showId)
          .filter(s => s.genres && s.genres.some(genre => show.genres.includes(genre)))
          .sort((a, b) => (b.weight || 0) - (a.weight || 0))
          .slice(0, 20);
        
        if (similar.length > 0) {
          return similar;
        }
      }
    } catch (searchError) {
      console.log('[TVMaze] Genre search failed, trying alternative methods');
    }

    // Strategy 2: Try searching by show name keywords to find related content
    try {
      const nameKeywords = show.name.split(' ').filter(word => word.length > 3);
      if (nameKeywords.length > 0) {
        const keywordResults = await fetchTVMaze<TVMazeSearchResult[]>('/search/shows', { q: nameKeywords[0] });
        
        if (keywordResults && keywordResults.length > 0) {
          const similar = keywordResults
            .map(r => r.show)
            .filter(s => s.id !== showId)
            .filter(s => s.genres && s.genres.some(genre => show.genres.includes(genre)))
            .sort((a, b) => (b.weight || 0) - (a.weight || 0))
            .slice(0, 20);
          
          if (similar.length > 0) {
            return similar;
          }
        }
      }
    } catch (keywordError) {
      console.log('[TVMaze] Keyword search failed');
    }

    // Strategy 3: Fetch a single page of shows and filter by genre
    try {
      const showsPage = await fetchShowsPaginated(0);
      const similar = showsPage
        .filter(s => s.id !== showId)
        .filter(s => s.genres && s.genres.some(genre => show.genres.includes(genre)))
        .sort((a, b) => {
          const aGenreCount = a.genres.filter((g: string) => show.genres.includes(g)).length;
          const bGenreCount = b.genres.filter((g: string) => show.genres.includes(g)).length;
          if (bGenreCount !== aGenreCount) return bGenreCount - aGenreCount;
          return (b.weight || 0) - (a.weight || 0);
        })
        .slice(0, 20);
      
      return similar;
    } catch (pageError) {
      console.log('[TVMaze] Page fetch also failed');
    }

    return [];
  } catch (error) {
    console.error('[TVMaze] Error fetching similar shows:', error);
    return [];
  }
};

export const GENRES = [
  'Drama',
  'Comedy',
  'Action',
  'Thriller',
  'Horror',
  'Science-Fiction',
  'Fantasy',
  'Romance',
  'Crime',
  'Mystery',
  'Adventure',
  'Anime',
  'Family',
  'Music',
  'War',
  'Western',
  'History',
  'Documentary',
];
