/**
 * User model interfaces
 */

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface UserData {
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

export interface UserInfo {
  user: User;
  isNew: boolean;
}

export interface UserDataResponse {
  success: boolean;
  user_data?: UserData;
  adjusted_life_expectancy?: number;
  message?: string;
}
