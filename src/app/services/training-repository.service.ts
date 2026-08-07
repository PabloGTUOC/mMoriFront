import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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

  /**
   * Everyone else's entries, for the "Search other users" panel.
   *
   * Catalogues are per-user now; this is the deliberate way across. Results carry
   * `created_by_name` so an entry can say whose it is, and never `created_by` — a name
   * describes a person, a uid addresses an account.
   */
  discoverTrainingRepository(term: string): Observable<TrainingRepositoryEntry[]> {
    const params = term ? new HttpParams().set('q', term) : undefined;
    return this.http
      .get<TrainingRepositoryResponse>(`${this.apiUrl}/training-repository/discover`, { params })
      .pipe(map((response) => response.data ?? []));
  }

  /** Copies one into this user's catalogue. Importing twice is a no-op server-side. */
  importTrainingRepositoryEntry(id: string): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/training-repository/${id}/import`, {});
  }

  deleteTrainingRepositoryEntry(id: string): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/training-repository/${id}`);
  }
}
