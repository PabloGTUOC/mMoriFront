/**
 * Mood and thoughts model interfaces
 */

export type MoodType = 'Optimistic & Social' | 'Angry & Moody' | 'Calm & Analytic' | 'Relax & Pacific';

export interface Mood {
  id?: number;
  user_id: string;
  mood: MoodType;
  date: string;
  created_at?: string;
}

export interface MoodRecommendation {
  recommendation: string;
  formatted?: string;
}

export interface MoodResponse {
  success: boolean;
  message?: string;
}
