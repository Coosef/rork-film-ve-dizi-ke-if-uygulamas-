export interface StreamingProvider {
  provider: string;
  providerId: number;
  logoPath: string;
  displayPriority: number;
  link?: string;
}

const PROVIDER_INFO: Record<number, { name: string; logo: string; deepLinkPrefix?: string }> = {
  8: { name: 'Netflix', logo: 'https://image.tmdb.org/t/p/original/9A1JSVmSxsyaBK4SUFsYVqbAYfW.jpg', deepLinkPrefix: 'netflix://' },
  337: { name: 'Disney+', logo: 'https://image.tmdb.org/t/p/original/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg', deepLinkPrefix: 'disneyplus://' },
  384: { name: 'HBO Max', logo: 'https://image.tmdb.org/t/p/original/Ajqyt5aNxNGjmF9uOfxArGrdf3X.jpg' },
  119: { name: 'Amazon Prime Video', logo: 'https://image.tmdb.org/t/p/original/emthp39XA2YScoYL1p0sdbAH2WA.jpg', deepLinkPrefix: 'aiv://' },
  350: { name: 'Apple TV+', logo: 'https://image.tmdb.org/t/p/original/6uhKBfmtzFqOcLousHwZuzcrScK.jpg', deepLinkPrefix: 'videos://' },
  531: { name: 'Paramount+', logo: 'https://image.tmdb.org/t/p/original/xbhHHa1YgtpwhC8lb1NQ3ACVcLd.jpg' },
  2: { name: 'Apple iTunes', logo: 'https://image.tmdb.org/t/p/original/q6tl6Ib6X5FT80RMlcDbexIo4St.jpg' },
  3: { name: 'Google Play Movies', logo: 'https://image.tmdb.org/t/p/original/tbEdFQDwx5LEVr8WpSeXQSIirVq.jpg' },
  1899: { name: 'Max', logo: 'https://image.tmdb.org/t/p/original/zxrVdFjIjLqkfnwyghnfywTn3Lh.jpg' },
  29: { name: 'Vudu', logo: 'https://image.tmdb.org/t/p/original/shq88b09gTBYC4hA7K7MUL8Q4zP.jpg' },
  15: { name: 'Hulu', logo: 'https://image.tmdb.org/t/p/original/zxrVdFjIjLqkfnwyghnfywTn3Lh.jpg', deepLinkPrefix: 'hulu://' },
};

export const getStreamingProviders = async (tmdbId: number, mediaType: 'movie' | 'tv'): Promise<StreamingProvider[]> => {
  try {
    const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY || '';
    const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/watch/providers?api_key=${TMDB_API_KEY}`;
    
    const response = await fetch(url);
    if (!response.ok) return [];
    
    const data = await response.json();
    
    const trProviders = data.results?.TR;
    if (!trProviders) return [];
    
    const allProviders = [
      ...(trProviders.flatrate || []),
      ...(trProviders.buy || []),
      ...(trProviders.rent || []),
    ];
    
    const uniqueProviders = Array.from(
      new Map(allProviders.map(p => [p.provider_id, p])).values()
    );
    
    return uniqueProviders.map((provider: any) => {
      const info = PROVIDER_INFO[provider.provider_id];
      return {
        provider: info?.name || provider.provider_name,
        providerId: provider.provider_id,
        logoPath: info?.logo || `https://image.tmdb.org/t/p/original${provider.logo_path}`,
        displayPriority: provider.display_priority,
        link: info?.deepLinkPrefix ? `${info.deepLinkPrefix}title/${tmdbId}` : undefined,
      };
    }).sort((a, b) => a.displayPriority - b.displayPriority);
  } catch (error) {
    console.error('[Streaming] Error fetching providers:', error);
    return [];
  }
};

export const getProviderDeepLink = (providerId: number, tmdbId: number): string | undefined => {
  const info = PROVIDER_INFO[providerId];
  if (!info?.deepLinkPrefix) return undefined;
  return `${info.deepLinkPrefix}title/${tmdbId}`;
};

export const getProviderWebLink = (tmdbId: number, mediaType: 'movie' | 'tv'): string => {
  return `https://www.themoviedb.org/${mediaType}/${tmdbId}/watch`;
};
