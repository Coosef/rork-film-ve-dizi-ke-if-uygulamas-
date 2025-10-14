import { generateObject, generateText } from "@rork/toolkit-sdk";
import { z } from "zod";
import { TVMazeShow } from "@/types/tvmaze";
import { Interaction } from "@/types/library";

export interface AIRecommendationInput {
  userInteractions: Interaction[];
  availableShows: TVMazeShow[];
  favoriteGenres?: number[];
  recentlyWatched?: TVMazeShow[];
}

export interface AIRecommendation {
  showId: number;
  score: number;
  reason: string;
  matchedPreferences: string[];
}

const recommendationSchema = z.object({
  recommendations: z.array(
    z.object({
      showId: z.number().describe("The ID of the recommended show"),
      score: z.number().min(0).max(100).describe("Recommendation confidence score (0-100)"),
      reason: z.string().describe("Brief explanation why this show is recommended"),
      matchedPreferences: z.array(z.string()).describe("List of user preferences that match this show"),
    })
  ).describe("List of recommended shows with scores and reasons"),
});

export async function getAIRecommendations(
  input: AIRecommendationInput
): Promise<AIRecommendation[]> {
  try {
    console.log('[AI Recommendations] Generating recommendations for', input.userInteractions.length, 'interactions');

    if (!process.env.EXPO_PUBLIC_TOOLKIT_URL) {
      console.log('[AI Recommendations] Toolkit URL not configured, skipping AI recommendations');
      return [];
    }

    const favoriteShows = input.userInteractions
      .filter(i => i.type === 'favorite')
      .slice(0, 5);
    
    const watchedShows = input.userInteractions
      .filter(i => i.type === 'watched' || i.type === 'watching')
      .slice(0, 10);

    const userProfile = {
      favoriteCount: favoriteShows.length,
      watchedCount: watchedShows.length,
      averageRating: input.userInteractions
        .filter(i => i.rating)
        .reduce((sum, i) => sum + (i.rating || 0), 0) / 
        (input.userInteractions.filter(i => i.rating).length || 1),
      recentGenres: input.recentlyWatched?.flatMap(s => s.genres).slice(0, 5) || [],
    };

    const showsToAnalyze = input.availableShows
      .filter(show => !input.userInteractions.some(i => i.mediaId === show.id))
      .slice(0, 30);

    if (showsToAnalyze.length === 0) {
      console.log('[AI Recommendations] No shows to analyze');
      return [];
    }

    const prompt = `You are an expert TV show recommendation system. Analyze the user's viewing history and recommend shows from the available list.

User Profile:
- Favorite shows: ${favoriteShows.length}
- Watched shows: ${watchedShows.length}
- Average rating: ${userProfile.averageRating.toFixed(1)}/10
- Recent genres: ${userProfile.recentGenres.join(', ')}

Recently watched shows:
${input.recentlyWatched?.slice(0, 5).map(s => `- ${s.name} (${s.genres.join(', ')}) - Rating: ${s.rating.average || 'N/A'}`).join('\n') || 'None'}

Available shows to recommend from:
${showsToAnalyze.map(s => `ID: ${s.id} | ${s.name} | Genres: ${s.genres.join(', ')} | Rating: ${s.rating.average || 'N/A'} | Summary: ${(s.summary || '').replace(/<[^>]*>/g, '').slice(0, 150)}...`).join('\n')}

Based on the user's viewing history and preferences, recommend the top 10 shows from the available list. Consider:
1. Genre preferences and patterns
2. Rating preferences
3. Show quality and popularity
4. Diversity in recommendations
5. Similar themes and storytelling styles

Provide a score (0-100) for each recommendation and explain why it matches the user's preferences.`;

    const result = await generateObject({
      messages: [{ role: 'user', content: prompt }],
      schema: recommendationSchema,
    });

    console.log('[AI Recommendations] Generated', result.recommendations.length, 'recommendations');
    return result.recommendations;
  } catch {
    console.log('[AI Recommendations] AI service unavailable, will use fallback recommendations');
    return [];
  }
}

export async function getAIShowInsight(show: TVMazeShow, userPreferences: string[]): Promise<string> {
  try {
    const prompt = `Analyze this TV show and explain why it might appeal to someone who likes: ${userPreferences.join(', ')}.

Show: ${show.name}
Genres: ${show.genres.join(', ')}
Rating: ${show.rating.average || 'N/A'}
Summary: ${(show.summary || '').replace(/<[^>]*>/g, '')}

Provide a brief, engaging explanation (2-3 sentences) of why this show would be a good match for their preferences.`;

    const insight = await generateText({ messages: [{ role: 'user', content: prompt }] });
    return insight;
  } catch (error) {
    console.error('[AI Show Insight] Error:', error);
    return '';
  }
}

export async function getPersonalizedSearchQuery(userHistory: Interaction[], searchTerm: string): Promise<string> {
  try {
    const genrePreferences = userHistory
      .filter(i => i.type === 'favorite')
      .slice(0, 5);

    const prompt = `The user is searching for: "${searchTerm}"

Their viewing history shows they enjoy shows with these characteristics:
${genrePreferences.map(i => `- Show ID: ${i.mediaId}`).join('\n')}

Enhance their search query to better match their preferences while staying true to their original intent. Return only the enhanced search query, nothing else.`;

    const enhancedQuery = await generateText({ messages: [{ role: 'user', content: prompt }] });
    return enhancedQuery.trim();
  } catch (error) {
    console.error('[Personalized Search] Error:', error);
    return searchTerm;
  }
}
