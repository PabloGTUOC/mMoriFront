// src/app/services/training-repository.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TrainingRepositoryService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Method to get training repository data from the backend
  getTrainingRepository(): Observable<any> {
    return this.http.get(`${this.apiUrl}/training-repository`);
  }

  addNewTraining(trainingData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/training-repository`, trainingData);
  }

}
