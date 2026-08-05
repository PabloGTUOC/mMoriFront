import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  TrainingRepositoryEntry,
  TrainingRepositoryPayload,
  TrainingRepositoryResponse,
} from '../models';

/**
 * The shared training catalogue — global, not user-scoped (BACKEND_SPEC §4.8).
 *
 * `getTrainingRepository` unwraps the envelope and hands back a plain array. An empty
 * catalogue arrives as `success: false` with a message rather than an empty list, which is
 * a quirk worth absorbing once here instead of in every caller.
 */
@Injectable({
  providedIn: 'root',
})
export class TrainingRepositoryService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getTrainingRepository(): Observable<TrainingRepositoryEntry[]> {
    return this.http
      .get<TrainingRepositoryResponse>(`${this.apiUrl}/training-repository`)
      .pipe(map((response) => response.data ?? []));
  }

  addNewTraining(training: TrainingRepositoryPayload): Observable<TrainingRepositoryResponse> {
    return this.http.post<TrainingRepositoryResponse>(`${this.apiUrl}/training-repository`, {
      training,
    });
  }
}
