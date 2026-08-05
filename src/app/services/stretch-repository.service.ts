import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Stretch, StretchPayload, StretchResponse } from '../models';

/**
 * The shared stretch catalogue (BACKEND_SPEC §4.10–§4.11).
 *
 * Writes are wrapped under `stretch`, which the frontend previously omitted entirely — the
 * Rails backend answered 400 and adding a stretch simply failed. Note that this create
 * returns 200 rather than 201, unlike every other create endpoint.
 */
@Injectable({
  providedIn: 'root',
})
export class StretchRepositoryService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getStretches(): Observable<Stretch[]> {
    return this.http
      .get<StretchResponse>(`${this.apiUrl}/stretches`)
      .pipe(map((response) => response.data ?? []));
  }

  addNewStretch(stretch: StretchPayload): Observable<StretchResponse> {
    return this.http.post<StretchResponse>(`${this.apiUrl}/stretches`, { stretch });
  }
}
