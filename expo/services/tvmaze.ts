import { TVMazeShow, TVMazeCast, TVMazeSearchResult, MediaItem, ShowDetails } from '@/types/tvmaze';

const TVMAZE_API_KEY = process.env.EXPO_PUBLIC_TVMAZE_API_KEY || '';
const TVMAZE_BASE_URL = 'https://api.tvmaze.com';

console.log('[TVMaze] API Key exists:', !!TVMAZE_API_KEY);
console.log('[TVMaze] API Key length:', TVMAZE_API_KEY.length);

export const getImageUrl = (show: TVMazeShow | null, size: 'medium' | 'original' = 'medium'): string => {
  if (!show?.image) return 'https://via.placeholder.com/500x750?text=No+Image';
  return size === 'medium' ? show.image.medium : show.image.original;
};

const fetchTVMaze = async <T>(endpoint: string, params: Record<string, string> = {}): Promise<T> => {
  const url = new URL(`${TVMAZE_BASE_URL}${endpoint}`);
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  console.log('[TVMaze] Fetching:', endpoint);
  
  const response = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[TVMaze] Error:', response.status, response.statusText);
    console.error('[TVMaze] Error body:', errorText);
    throw new Error(`TVMaze API Error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data;
};

export const getTrending = async (): Promise<TVMazeShow[]> => {
  const shows = await fetchTVMaze<TVMazeShow[]>('/shows');
  return shows.sort((a, b) => b.weight - a.weight).slice(0, 20);
};

export const getPopular = async (page: number = 1): Promise<TVMazeShow[]> => {
  const shows = await fetchTVMaze<TVMazeShow[]>('/shows');
  const start = (page - 1) * 20;
  const end = start + 20;
  return shows.sort((a, b) => b.weight - a.weight).slice(start, end);
};

export const getTopRated = async (page: number = 1): Promise<TVMazeShow[]> => {
  const shows = await fetchTVMaze<TVMazeShow[]>('/shows');
  const start = (page - 1) * 20;
  const end = start + 20;
  return shows
    .filter(show => show.rating.average !== null)
    .sort((a, b) => (b.rating.average || 0) - (a.rating.average || 0))
    .slice(start, end);
};

export const getShowsByGenre = async (genre: string, page: number = 1): Promise<TVMazeShow[]> => {
  const shows = await fetchTVMaze<TVMazeShow[]>('/shows');
  const start = (page - 1) * 20;
  const end = start + 20;
  return shows
    .filter(show => show.genres.includes(genre))
    .sort((a, b) => b.weight - a.weight)
    .slice(start, end);
};

export const getShowDetails = async (showId: number): Promise<ShowDetails> => {
  const show = await fetchTVMaze<TVMazeShow>(`/shows/${showId}`);
  
  let cast: TVMazeCast[] = [];
  try {
    cast = await fetchTVMaze<TVMazeCast[]>(`/shows/${showId}/cast`);
  } catch (error) {
    console.log('[TVMaze] Could not fetch cast:', error);
  }

  return {
    ...show,
    cast,
  };
};

export const searchShows = async (query: string): Promise<TVMazeShow[]> => {
  const results = await fetchTVMaze<TVMazeSearchResult[]>('/search/shows', { q: query });
  return results.map(result => result.show);
};

export const getDiscoverStack = async (page: number = 1): Promise<MediaItem[]> => {
  const shows = await getPopular(page);
  return shows.map(show => convertShowToMediaItem(show));
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
  const shows = await fetchTVMaze<TVMazeShow[]>('/shows');
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
};

export const getSimilarShows = async (showId: number): Promise<TVMazeShow[]> => {
  try {
    const show = await fetchTVMaze<TVMazeShow>(`/shows/${showId}`);
    const allShows = await fetchTVMaze<TVMazeShow[]>('/shows');
    
    return allShows
      .filter(s => s.id !== showId)
      .filter(s => s.genres.some(genre => show.genres.includes(genre)))
      .sort((a, b) => {
        const aGenreCount = a.genres.filter(g => show.genres.includes(g)).length;
        const bGenreCount = b.genres.filter(g => show.genres.includes(g)).length;
        if (bGenreCount !== aGenreCount) return bGenreCount - aGenreCount;
        return b.weight - a.weight;
      })
      .slice(0, 20);
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
