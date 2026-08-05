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
export type UserDataPayload = Omit<UserData, '_id' | 'created_at' | 'updated_at'>;

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
  message?: string;
}
