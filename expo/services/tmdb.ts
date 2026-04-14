import { Movie, MovieDetails, MovieListResponse, TVShow, MediaItem, MediaType } from '@/types/tmdb';

const TMDB_API_KEY = '1eba065b82fe74a042e8300ae65ab6c1';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';



export const getImageUrl = (path: string | null, size: 'w200' | 'w500' | 'w780' | 'original' = 'w500'): string => {
  if (!path) return 'https://via.placeholder.com/500x750?text=No+Image';
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
};

const fetchTMDB = async <T>(endpoint: string, params: Record<string, string> = {}): Promise<T> => {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.append('api_key', TMDB_API_KEY);
  url.searchParams.append('language', 'tr-TR');
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  console.log('[TMDB] Fetching:', endpoint);
  
  const response = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.warn('[TMDB] Request failed:', response.status, endpoint, errorText);
    throw new Error(`TMDB API Error: ${response.status}`);
  }
  
  const data = await response.json();
  return data;
};

export const getTrending = async (mediaType: 'movie' | 'tv' | 'all' = 'movie', timeWindow: 'day' | 'week' = 'week'): Promise<MovieListResponse> => {
  return fetchTMDB<MovieListResponse>(`/trending/${mediaType}/${timeWindow}`);
};

export const getPopular = async (mediaType: 'movie' | 'tv' = 'movie', page: number = 1): Promise<MovieListResponse> => {
  return fetchTMDB<MovieListResponse>(`/${mediaType}/popular`, { page: page.toString() });
};

export const getTopRated = async (mediaType: 'movie' | 'tv' = 'movie', page: number = 1): Promise<MovieListResponse> => {
  return fetchTMDB<MovieListResponse>(`/${mediaType}/top_rated`, { page: page.toString() });
};

export const getNowPlaying = async (page: number = 1): Promise<MovieListResponse> => {
  return fetchTMDB<MovieListResponse>('/movie/now_playing', { page: page.toString() });
};

export const getUpcoming = async (page: number = 1): Promise<MovieListResponse> => {
  return fetchTMDB<MovieListResponse>('/movie/upcoming', { page: page.toString() });
};

export const getMoviesByGenre = async (genreId: number, page: number = 1): Promise<MovieListResponse> => {
  return fetchTMDB<MovieListResponse>('/discover/movie', {
    with_genres: genreId.toString(),
    page: page.toString(),
    sort_by: 'popularity.desc',
  });
};

export const getMovieDetails = async (movieId: number): Promise<MovieDetails> => {
  if (!movieId || movieId <= 0) {
    throw new Error('Invalid movie ID');
  }
  return fetchTMDB<MovieDetails>(`/movie/${movieId}`, {
    append_to_response: 'credits,videos,similar',
  });
};

export const getMovieDetailsSafe = async (movieId: number): Promise<MovieDetails | null> => {
  try {
    return await getMovieDetails(movieId);
  } catch {
    console.log('[TMDB] Movie not found:', movieId);
    return null;
  }
};

export const searchMovies = async (query: string, page: number = 1): Promise<MovieListResponse> => {
  return fetchTMDB<MovieListResponse>('/search/movie', {
    query,
    page: page.toString(),
  });
};

export const getSimilarMovies = async (movieId: number, page: number = 1): Promise<MovieListResponse> => {
  return fetchTMDB<MovieListResponse>(`/movie/${movieId}/similar`, { page: page.toString() });
};

export const getDiscoverMovies = async (
  page: number = 1,
  options: { genreId?: number; minRating?: number; minYear?: number; maxYear?: number } = {}
): Promise<MovieListResponse> => {
  const params: Record<string, string> = {
    page: page.toString(),
    sort_by: 'popularity.desc',
    'vote_count.gte': '50',
  };
  if (options.genreId) params.with_genres = options.genreId.toString();
  if (options.minRating && options.minRating > 0) params['vote_average.gte'] = options.minRating.toString();
  if (options.minYear && options.minYear > 1900) params['primary_release_date.gte'] = `${options.minYear}-01-01`;
  if (options.maxYear && options.maxYear < new Date().getFullYear()) params['primary_release_date.lte'] = `${options.maxYear}-12-31`;
  return fetchTMDB<MovieListResponse>('/discover/movie', params);
};

export const GENRE_LIST: { id: number; name: string }[] = [
  { id: 28, name: 'Aksiyon' },
  { id: 12, name: 'Macera' },
  { id: 16, name: 'Animasyon' },
  { id: 35, name: 'Komedi' },
  { id: 80, name: 'Suç' },
  { id: 99, name: 'Belgesel' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Aile' },
  { id: 14, name: 'Fantastik' },
  { id: 36, name: 'Tarih' },
  { id: 27, name: 'Korku' },
  { id: 10402, name: 'Müzik' },
  { id: 9648, name: 'Gizem' },
  { id: 10749, name: 'Romantik' },
  { id: 878, name: 'Bilim Kurgu' },
  { id: 53, name: 'Gerilim' },
  { id: 10752, name: 'Savaş' },
  { id: 37, name: 'Vahşi Batı' },
];

export const getDiscoverStack = async (page: number = 1): Promise<MediaItem[]> => {
  const response = await fetchTMDB<MovieListResponse>('/discover/movie', {
    page: page.toString(),
    sort_by: 'popularity.desc',
    'vote_count.gte': '100',
  });

  return response.results.map(movie => convertMovieToMediaItem(movie));
};

export const convertMovieToMediaItem = (movie: Movie): MediaItem => ({
  id: movie.id,
  type: 'movie' as MediaType,
  title: movie.title || '',
  overview: movie.overview || '',
  posterPath: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}/w500${movie.poster_path}` : null,
  backdropPath: movie.backdrop_path ? `${TMDB_IMAGE_BASE_URL}/w780${movie.backdrop_path}` : null,
  releaseDate: movie.release_date || '',
  voteAverage: movie.vote_average ?? 0,
  voteCount: movie.vote_count ?? 0,
  genres: movie.genre_ids || [],
});

export const convertTVShowToMediaItem = (show: TVShow): MediaItem => ({
  id: show.id,
  type: 'tv' as MediaType,
  title: show.name || '',
  overview: show.overview || '',
  posterPath: show.poster_path ? `${TMDB_IMAGE_BASE_URL}/w500${show.poster_path}` : null,
  backdropPath: show.backdrop_path ? `${TMDB_IMAGE_BASE_URL}/w780${show.backdrop_path}` : null,
  releaseDate: show.first_air_date || '',
  voteAverage: show.vote_average ?? 0,
  voteCount: show.vote_count ?? 0,
  genres: show.genre_ids || [],
});

export const GENRES = {
  28: 'Aksiyon',
  12: 'Macera',
  16: 'Animasyon',
  35: 'Komedi',
  80: 'Suç',
  99: 'Belgesel',
  18: 'Drama',
  10751: 'Aile',
  14: 'Fantastik',
  36: 'Tarih',
  27: 'Korku',
  10402: 'Müzik',
  9648: 'Gizem',
  10749: 'Romantik',
  878: 'Bilim Kurgu',
  10770: 'TV Film',
  53: 'Gerilim',
  10752: 'Savaş',
  37: 'Vahşi Batı',
};
