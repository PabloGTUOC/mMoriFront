// src/app/services/training-repository.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TrainingRepositoryService {
  private apiUrl = 'http://localhost:3000';  // Define the base URL

  constructor(private http: HttpClient) { }

  // Method to get training repository data from the backend
  getTrainingRepository(): Observable<any> {
    return this.http.get(`${this.apiUrl}/training-repository`);
  }

  addNewTraining(trainingData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/training-repository`, trainingData);
  }

}
