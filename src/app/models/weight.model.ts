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

export interface WeightHistory {
  date: string;
  weight: number;
}
