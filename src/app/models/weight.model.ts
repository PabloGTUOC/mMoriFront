/**
 * Weight model interfaces
 */

export interface WeightUpdate {
  id?: number;
  user_id: string;
  weight: number;
  date: string;
  created_at?: string;
}

export interface WeightResponse {
  success: boolean;
  weight?: number;
  date?: string;
  message?: string;
}

export interface WeightHistory {
  date: string;
  weight: number;
}
