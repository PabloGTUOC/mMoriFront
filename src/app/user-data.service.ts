import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserDataService {
  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) { }

  submitUserData(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/user_data`, {user_data: data});
  }
}

