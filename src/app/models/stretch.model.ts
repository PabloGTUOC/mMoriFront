/**
 * Stretch catalogue models.
 *
 * `video_link` is served by the Node backend but was absent from the original Rails model,
 * so the embedded player had nothing to read — see backend/README.md, deviation 2.
 */

import { ObjectId } from './training.model';

export interface Stretch {
  _id?: ObjectId;
  name: string;
  type?: string;
  duration?: number;
  description?: string;
  video_link?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StretchPayload {
  name: string;
  description: string;
  video_link: string;
}

export interface StretchResponse {
  success: boolean;
  data?: Stretch[];
  message?: string;
  errors?: string[];
}
