import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StretchRepositoryService {
  private apiUrl = 'http://localhost:3000';

  constructor( private http: HttpClient) {}

  getStretches(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stretches`)
  }

  addNewStretch(stretchData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/stretches`, stretchData)
  }
}
