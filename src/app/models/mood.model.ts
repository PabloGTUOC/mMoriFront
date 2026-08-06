/**
 * Mood and recommendation models.
 *
 * `MoodType` is the set of values `ThoughtsComponent` actually sends. The previous model
 * declared title-case labels ('Optimistic & Social') that no code ever transmitted, so the
 * type described the button captions rather than the wire format.
 */

export type MoodType = 'optimistic' | 'angry' | 'calm' | 'relaxed';

/** One mood button: the caption and emoji shown, plus the value sent to the API. */
export interface MoodOption {
  label: string;
  emoji: string;
  mood: MoodType;
}

/** Both `POST /moods` and `POST /generate_recommendation` take this under `mood_data`. */
export interface MoodPayload {
  mood: MoodType;
  date: string;
}

export interface MoodResponse {
  success: boolean;
  message?: string | string[];
}

export interface RecommendationResponse {
  success: boolean;
  recommendation?: string;
  message?: string;
}
