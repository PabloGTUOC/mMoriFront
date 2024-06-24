import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HttpClient} from "@angular/common/http";
import {user} from "@angular/fire/auth";


@Injectable({
  providedIn: 'root'
})
export class UserService {
  logged: BehaviorSubject<boolean> = new BehaviorSubject(false);
  private userInfoSource: BehaviorSubject<any> = new BehaviorSubject(null);
  userInfo = this.userInfoSource.asObservable();
  private  apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) { }
  getUserInfo(){
    return this.userInfo;
  }
  setUserInfo(userInfo: any){
    this.userInfoSource.next(userInfo);
  }

  sendUserEmail(email: string) {
    return this.http.post(`${this.apiUrl}/receive_email`, {email});
  }
}
