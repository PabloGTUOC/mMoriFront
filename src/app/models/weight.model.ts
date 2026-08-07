import { ObjectId } from './training.model';

/**
 * Weight models. `WeightUpdate` carries no timestamps on the backend — see
 * BACKEND_SPEC §3.3 for why the date ordering needs an _id tiebreaker.
 */

export interface WeightPayload {
  weight: number;
  date: string;
}

/** `GET /weight_updates/latest_weight`. Absent history is a 200 with success: false. */
export interface WeightResponse {
  success: boolean;
  weight?: number;
  date?: string;
  error?: string;
}

/**
 * One entry from `GET /weight_updates/history`.
 *
 * `_id` is optional because the chart never needed it — but the history screen does, since
 * a series you can read and not correct is how a stray point distorts the chart forever.
 */
export interface WeightHistory {
  _id?: ObjectId;
  date: string;
  weight: number;
}
