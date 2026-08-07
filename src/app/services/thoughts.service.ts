import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { MoodHistoryEntry, MoodPayload, MoodResponse, RecommendationResponse } from '../models';

/**
 * Mood logging and the AI recommendation (BACKEND_SPEC §4.14–§4.15).
 *
 * Both endpoints take the payload under `mood_data` — not `mood` — and the wrapper is
 * applied here so callers pass a plain typed payload.
 */
@Injectable({
  providedIn: 'root',
})
export class ThoughtsService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  saveMood(moodData: MoodPayload): Observable<MoodResponse> {
    return this.http.post<MoodResponse>(`${this.apiUrl}/moods`, { mood_data: moodData });
  }

  getRecommendation(moodData: MoodPayload): Observable<RecommendationResponse> {
    return this.http.post<RecommendationResponse>(`${this.apiUrl}/generate_recommendation`, {
      mood_data: moodData,
    });
  }

  /**
   * Every mood logged, newest first.
   *
   * `POST /moods` shipped without a counterpart, so the app asked how you felt every day
   * and offered no way to ever see the answer. `GET /moods` is additive; this reads it.
   */
  getMoodHistory(): Observable<MoodHistoryEntry[]> {
    return this.http
      .get<{ success: boolean; data?: MoodHistoryEntry[] }>(`${this.apiUrl}/moods`)
      .pipe(map((response) => response.data ?? []));
  }
}
