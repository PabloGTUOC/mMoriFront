import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  logged: BehaviorSubject<boolean> = new BehaviorSubject(false);


  private userInfo: any;

  constructor() { }


  getUserInfo(){
    return this.userInfo;
  }

  setUserInfo(userInfo: any){
    this.userInfo = userInfo;
  }

}
