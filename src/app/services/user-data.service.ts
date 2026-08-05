import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreatedResponse, TrainingPayload, UserDataPayload, WeightPayload } from '../models';

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

  submitTrainingData(data: TrainingPayload): Observable<CreatedResponse> {
    return this.http.post<CreatedResponse>(`${this.apiUrl}/trainings`, { training: data });
  }

  submitWeightUpdate(data: WeightPayload): Observable<CreatedResponse> {
    return this.http.post<CreatedResponse>(`${this.apiUrl}/weight_updates`, {
      weight_update: data,
    });
  }
}
