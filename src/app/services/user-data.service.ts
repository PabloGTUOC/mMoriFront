import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CreatedResponse,
  TrainingPayload,
  UserDataPayload,
  UserDataPreviewResponse,
  WeightPayload,
} from '../models';

/**
 * Write endpoints for profile, training sessions and weigh-ins.
 *
 * Every payload uses the backend's canonical field names and its required wrapper key
 * (BACKEND_SPEC §6). Callers pass a typed payload; the wrapper is applied here so no
 * component has to remember that `POST /trainings` wants `training` while
 * `POST /weight_updates` wants `weight_update`.
 */
@Injectable({
  providedIn: 'root',
})
export class UserDataService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  submitUserData(data: UserDataPayload): Observable<CreatedResponse> {
    return this.http.post<CreatedResponse>(`${this.apiUrl}/user_data`, { user_data: data });
  }

  /**
   * The same figure the dashboard shows, computed on unsaved values.
   *
   * A POST that persists nothing: the profile travels in the body, which is the only reason
   * for the verb. Onboarding calls it as the form is filled so the user can see that the
   * answers are connected to the number, rather than meeting it for the first time
   * afterwards with no explanation of where it came from.
   */
  previewUserData(data: Partial<UserDataPayload>): Observable<UserDataPreviewResponse> {
    return this.http.post<UserDataPreviewResponse>(`${this.apiUrl}/user_data/preview`, {
      user_data: data,
    });
  }

  submitTrainingData(data: TrainingPayload): Observable<CreatedResponse> {
    return this.http.post<CreatedResponse>(`${this.apiUrl}/trainings`, { training: data });
  }

  submitWeightUpdate(data: WeightPayload): Observable<CreatedResponse> {
    return this.http.post<CreatedResponse>(`${this.apiUrl}/weight_updates`, {
      weight_update: data,
    });
  }
}
