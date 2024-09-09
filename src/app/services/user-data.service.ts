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

  submitTrainingData(data: any): Observable<any> {
    console.log('Submitting training data:', data); // Add this line to log the data being sent
    return this.http.post(`${this.apiUrl}/trainings`, {training: data});
  }

  submitWeightUpdate(data:any): Observable<any>{
    console.log('Submitting weight data', data);
    return this.http.post(`${this.apiUrl}/weight_updates`, {weight_update: data});
  }
}

