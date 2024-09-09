import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Observable} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class ThoughtsService {
  private  apiUrl = 'http://localhost:3000';
  constructor(private http: HttpClient) {}

  saveMood(moodData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/moods`, moodData);
  }

  getRecomendation(moodData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/generate_recommendation`, moodData);
  }
}
