import { Movie, MovieDetails, MovieListResponse, TVShow, MediaItem, MediaType } from '@/types/tmdb';

const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY || '';
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
  console.log('[TMDB] Full URL:', url.toString().replace(TMDB_API_KEY, 'API_KEY_HIDDEN'));
  
  const response = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[TMDB] Error:', response.status, response.statusText);
    console.error('[TMDB] Error body:', errorText);
    throw new Error(`TMDB API Error: ${response.status} ${response.statusText}`);
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
  return fetchTMDB<MovieDetails>(`/movie/${movieId}`, {
    append_to_response: 'credits,videos,similar',
  });
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
  title: movie.title,
  overview: movie.overview,
  posterPath: movie.poster_path,
  backdropPath: movie.backdrop_path,
  releaseDate: movie.release_date,
  voteAverage: movie.vote_average,
  voteCount: movie.vote_count,
  genres: movie.genre_ids,
});

export const convertTVShowToMediaItem = (show: TVShow): MediaItem => ({
  id: show.id,
  type: 'tv' as MediaType,
  title: show.name,
  overview: show.overview,
  posterPath: show.poster_path,
  backdropPath: show.backdrop_path,
  releaseDate: show.first_air_date,
  voteAverage: show.vote_average,
  voteCount: show.vote_count,
  genres: show.genre_ids,
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
