/**
 * User and profile models.
 *
 * `UserData` is an append-only history on the backend, not one row per user — signing up
 * again adds a snapshot, and reads take the newest (BACKEND_SPEC §3.1). Field names are the
 * backend's canonical ones; the signup form's own spellings (`trainingFrequency`, `smoker`,
 * `drinker`, `country_code`) are mapped to these before the request is sent.
 */

import { ObjectId } from './training.model';

export interface UserData {
  _id?: ObjectId;
  user_id: string;
  dob: string;
  gender: string;
  height: number;
  weight: number;
  country: string;
  smoking_status: boolean;
  drinking_status: boolean;
  training_frequency: number;
  created_at?: string;
  updated_at?: string;
}

/** Payload for `POST /user_data`; the service nests it under a `user_data` key. */
/** `user_id` is omitted too: the server takes it from the verified token (4.1.6). */
export type UserDataPayload = Omit<UserData, '_id' | 'user_id' | 'created_at' | 'updated_at'>;

/** One term of the life-expectancy adjustment, in years. */
export interface AdjustmentStep {
  key: 'smoking' | 'drinking' | 'bmi' | 'training';
  years: number;
}

/**
 * `GET /user_data/user_data`.
 *
 * A missing profile is a **200 with `success: false`**, not a 404 (BACKEND_SPEC §4.2), so
 * `user_data` is optional and callers must branch on `success`.
 */
export interface UserDataResponse {
  success: boolean;
  user_data?: UserData;
  base_life_expectancy?: number;
  adjusted_life_expectancy?: number;
  /**
   * The adjustment itemised, so the dashboard can show what is holding the figure where it
   * is rather than only the total. Same shape the onboarding preview renders.
   */
  steps?: AdjustmentStep[];
  message?: string;
}

/**
 * `POST /user_data/preview` — the same computation as the dashboard, on unsaved values.
 *
 * `success: false` is the normal state while the form is still being filled in, not an
 * error: the endpoint is called as the user types.
 */
export interface UserDataPreviewResponse {
  success: boolean;
  base_life_expectancy?: number;
  adjusted_life_expectancy?: number;
  age?: number;
  weeks_left_to_live?: number;
  steps?: AdjustmentStep[];
  message?: string;
}
