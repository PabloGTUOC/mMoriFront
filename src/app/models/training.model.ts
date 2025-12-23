/**
 * Training model interfaces
 */

export interface Training {
  id?: number;
  user_id: string;
  training_date: string;
  training_type: string;
  duration: number;
  calories_burned: number;
  description?: string;
  created_at?: string;
}

export interface TrainingStats {
  training_count: number;
  total_days_since_joining: number;
  average_calories_per_session?: number;
  total_duration?: number;
}

export interface TrainingRepository {
  id: number;
  name: string;
  type: string;
  duration: number;
  calories: number;
  description?: string;
}

export interface TrainingRepositoryResponse {
  success: boolean;
  data?: TrainingRepository[];
  message?: string;
}
