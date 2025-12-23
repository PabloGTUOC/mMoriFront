/**
 * Stretch model interfaces
 */

export interface Stretch {
  id?: number;
  name: string;
  type: string;
  duration: number;
  description?: string;
  created_at?: string;
}

export interface StretchResponse {
  success: boolean;
  data?: Stretch[];
  message?: string;
}
