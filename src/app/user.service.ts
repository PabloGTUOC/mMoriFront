import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {HttpClient, HttpParams} from "@angular/common/http";
import {user} from "@angular/fire/auth";


@Injectable({
  providedIn: 'root'
})
export class UserService {
  logged: BehaviorSubject<boolean> = new BehaviorSubject(false);
  private userInfoSource: BehaviorSubject<any> = new BehaviorSubject(null);
  userInfo = this.userInfoSource.asObservable();
  private  apiUrl = 'http://localhost:3000';
  isUserNew: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  // New BehaviorSubject for userId
  private userIdSource: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);
  userId$ = this.userIdSource.asObservable();


  constructor(private http: HttpClient) { }
  getUserInfo(){
    return this.userInfo;
  }
  setUserInfo(userInfo: any) {
    this.userInfoSource.next(userInfo.user);
    this.isUserNew.next(userInfo.isNew || false);
    // Set the userId when userInfo is set
    this.setUserId(userInfo.user?.uid || null);
  }

  checkUserTraining(userId: string) {
    let params = new HttpParams().set('user_id', userId);
    return this.http.get(`${this.apiUrl}/trainings/all-trainings`, { params });
  }

  // Getter for userId
  getUserId() {
    return this.userIdSource.value;
  }

  // Setter for userId
  setUserId(userId: string | null) {
    this.userIdSource.next(userId);
  }
}
