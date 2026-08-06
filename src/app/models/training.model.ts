/**
 * Training models.
 *
 * Field names are the backend's canonical ones (BACKEND_SPEC §3). The frontend used to send
 * and read its own spellings — `training_name` for the catalogue, `date`/`training` when
 * logging a session — which the backend only tolerates through compatibility aliases. Using
 * the canonical names here is what makes those aliases removable.
 *
 * `_id` is a Mongoid-shaped `{ $oid }`, not a bare string — see BACKEND_SPEC §6.
 */

export interface ObjectId {
  $oid: string;
}

/** One logged training session. */
export interface Training {
  _id?: ObjectId;
  user_id: string;
  training_date: string;
  training_type: string;
  duration?: number;
  calories_burned?: number;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

/** Payload for `POST /trainings`; the service nests it under a `training` key. */
export interface TrainingPayload {
  training_date: string;
  training_type: string;
}

/** An entry in the shared training catalogue (`training_repository`). */
export interface TrainingRepositoryEntry {
  _id?: ObjectId;
  name: string;
  type: string;
  duration: number;
  calories: number;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TrainingRepositoryPayload {
  name: string;
  type: string;
  duration: number;
  calories: number;
  description?: string;
}

/** `GET /trainings/training-stats`. Drives the dashboard's "% days trained". */
export interface TrainingStatsResponse {
  success: boolean;
  training_count: number;
  total_days_since_joining: number;
  first_login_date?: string;
  error?: string;
}

export interface TrainingRepositoryResponse {
  success: boolean;
  data?: TrainingRepositoryEntry[];
  message?: string;
}

/** Shared shape of every create endpoint's success response. */
export interface CreatedResponse {
  success: boolean;
  inserted_id?: ObjectId;
  errors?: string[];
}
