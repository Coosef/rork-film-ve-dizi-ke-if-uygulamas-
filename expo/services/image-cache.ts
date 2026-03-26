import AsyncStorage from '@react-native-async-storage/async-storage';

const IMAGE_CACHE_KEY = '@image_cache';
const MAX_CACHE_SIZE = 100;
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

interface CacheEntry {
  uri: string;
  timestamp: number;
  size: 'small' | 'medium' | 'large';
}

interface ImageCache {
  [key: string]: CacheEntry;
}

let memoryCache: ImageCache = {};

export const initializeImageCache = async () => {
  try {
    const stored = await AsyncStorage.getItem(IMAGE_CACHE_KEY);
    if (stored) {
      memoryCache = JSON.parse(stored);
      cleanExpiredCache();
    }
  } catch (error) {
    console.error('[ImageCache] Error loading cache:', error);
  }
};

const cleanExpiredCache = () => {
  const now = Date.now();
  const validEntries: ImageCache = {};
  
  Object.entries(memoryCache).forEach(([key, entry]) => {
    if (now - entry.timestamp < CACHE_EXPIRY_MS) {
      validEntries[key] = entry;
    }
  });
  
  memoryCache = validEntries;
  saveCache();
};

const saveCache = async () => {
  try {
    await AsyncStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(memoryCache));
  } catch (error) {
    console.error('[ImageCache] Error saving cache:', error);
  }
};

export const getCachedImageUri = (
  originalUri: string,
  size: 'small' | 'medium' | 'large' = 'medium'
): string | null => {
  const cacheKey = `${originalUri}_${size}`;
  const entry = memoryCache[cacheKey];
  
  if (!entry) return null;
  
  const now = Date.now();
  if (now - entry.timestamp > CACHE_EXPIRY_MS) {
    delete memoryCache[cacheKey];
    saveCache();
    return null;
  }
  
  return entry.uri;
};

export const cacheImageUri = (
  originalUri: string,
  cachedUri: string,
  size: 'small' | 'medium' | 'large' = 'medium'
) => {
  const cacheKey = `${originalUri}_${size}`;
  
  memoryCache[cacheKey] = {
    uri: cachedUri,
    timestamp: Date.now(),
    size,
  };
  
  const entries = Object.entries(memoryCache);
  if (entries.length > MAX_CACHE_SIZE) {
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE);
    toRemove.forEach(([key]) => delete memoryCache[key]);
  }
  
  saveCache();
};

export const clearImageCache = async () => {
  memoryCache = {};
  try {
    await AsyncStorage.removeItem(IMAGE_CACHE_KEY);
  } catch (error) {
    console.error('[ImageCache] Error clearing cache:', error);
  }
};

export const prefetchImages = async (uris: string[]) => {
  const prefetchPromises = uris.map(uri => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(uri);
      img.onerror = () => resolve(null);
      img.src = uri;
    });
  });
  
  await Promise.all(prefetchPromises);
};

export const getOptimizedImageUri = (
  baseUri: string,
  size: 'small' | 'medium' | 'large' = 'medium'
): string => {
  if (!baseUri) return '';
  
  if (baseUri.includes('image.tmdb.org')) {
    const sizeMap = {
      small: 'w342',
      medium: 'w500',
      large: 'w780',
    };
    return baseUri.replace(/w\d+/, sizeMap[size]);
  }
  
  return baseUri;
};
