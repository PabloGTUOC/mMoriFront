import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StretchRepositoryService {
  private apiUrl = environment.apiUrl;

  constructor( private http: HttpClient) {}

  getStretches(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stretches`)
  }

  addNewStretch(stretchData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/stretches`, stretchData)
  }
}
