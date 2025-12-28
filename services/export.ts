import { Platform } from 'react-native';
import { Interaction, UserPreferences } from '@/types/library';

export interface ExportData {
  version: string;
  exportDate: string;
  interactions: Interaction[];
  preferences: UserPreferences;
  stats: {
    totalShows: number;
    totalEpisodes: number;
    totalWatchTime: number;
  };
}

export const exportToJSON = async (
  interactions: Interaction[],
  preferences: UserPreferences
): Promise<string> => {
  const totalEpisodes = interactions.reduce((sum, i) => {
    return sum + (i.watchProgress?.watchedEpisodes || 0);
  }, 0);

  const exportData: ExportData = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    interactions,
    preferences,
    stats: {
      totalShows: interactions.length,
      totalEpisodes,
      totalWatchTime: totalEpisodes * 45,
    },
  };

  return JSON.stringify(exportData, null, 2);
};

export const exportToCSV = async (interactions: Interaction[]): Promise<string> => {
  const headers = [
    'ID',
    'Başlık',
    'Tür',
    'Durum',
    'Puan',
    'İzlenen Bölümler',
    'Toplam Bölümler',
    'Son İzlenme',
    'Eklenme Tarihi',
  ].join(',');

  const rows = interactions.map(i => {
    return [
      i.mediaId,
      `"${i.mediaId}"`,
      i.mediaType,
      i.type,
      i.rating || '',
      i.watchProgress?.watchedEpisodes || 0,
      i.watchProgress?.totalEpisodes || 0,
      i.watchProgress?.lastWatchedAt || '',
      i.createdAt,
    ].join(',');
  });

  return [headers, ...rows].join('\n');
};

export const shareExportFile = async (
  content: string,
  filename: string,
  mimeType: string
): Promise<void> => {
  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

};

export const exportLibraryAsJSON = async (
  interactions: Interaction[],
  preferences: UserPreferences
): Promise<void> => {
  const json = await exportToJSON(interactions, preferences);
  const filename = `showtracker_export_${new Date().toISOString().split('T')[0]}.json`;
  await shareExportFile(json, filename, 'application/json');
};

export const exportLibraryAsCSV = async (interactions: Interaction[]): Promise<void> => {
  const csv = await exportToCSV(interactions);
  const filename = `showtracker_export_${new Date().toISOString().split('T')[0]}.csv`;
  await shareExportFile(csv, filename, 'text/csv');
};

export const importFromJSON = async (jsonString: string): Promise<ExportData> => {
  try {
    const data = JSON.parse(jsonString) as ExportData;
    
    if (!data.version || !data.interactions || !data.preferences) {
      throw new Error('Invalid export file format');
    }
    
    return data;
  } catch (error) {
    console.error('[Export] Error parsing JSON:', error);
    throw new Error('Geçersiz dosya formatı');
  }
};
