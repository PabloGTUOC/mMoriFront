import { Injectable } from '@angular/core';
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {HttpClient, HttpParams} from "@angular/common/http";



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
  private refreshTrigger = new Subject<void>();
  constructor(private http: HttpClient) { }
  setUserInfo(userInfo: any) {
    if (userInfo) {
      this.userInfoSource.next(userInfo.user);
      this.isUserNew.next(userInfo.isNew || false);
      this.setUserId(userInfo.user?.uid || null);
      this.logged.next(true); // Ensure logged status is set to true
    } else {
      this.userInfoSource.next(null);
      this.isUserNew.next(false);
      this.setUserId(null);
      this.logged.next(false); // Ensure logged status is set to false on logout
    }
  }
  // Setter for userId
  setUserId(userId: string | null) {
    this.userIdSource.next(userId);
  }
  // Getter for userId
  getUserId() {
    return this.userIdSource.value;
  }
  setUserNewStatus(isNew: boolean): void {
    this.isUserNew.next(isNew);
  }
  //API Calls:
  checkUserData(userId: string) {
    let params = new HttpParams().set('user_id', userId);
    return this.http.get(`${this.apiUrl}/user_data/user_data`, { params });
  }
  getTrainingStats(userId: string ): Observable<any> {
    let params = new HttpParams().set('user_id', userId);
    return this.http.get(`${this.apiUrl}/trainings/training-stats`, { params });
  }
  getLatestWeight(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/weight_updates/latest_weight`, { params: { user_id: userId } });
  }
  // Expose the trigger as an observable
  get refreshTrigger$() {
    return this.refreshTrigger.asObservable();
  }
  // Method to trigger a refresh
  triggerRefresh() {
      this.refreshTrigger.next();
  }
  //Handle user login
  handleUserLogin(user:any): void {
    const userId = user.uid;
    console.log('handleUserLogin called');
    console.log('Received user:', user);
    console.log('Extracted userId:', userId);
    if(userId) {
      this.checkUserData(userId).subscribe({
        next: (response: any) => {
          console.log('checkUserData response:', response);
          const isNewUser = !response.success;
          console.log('Is new user:', isNewUser);
          this.setUserInfo({user, isNew: isNewUser});
          console.log('User info set with:', { user, isNew: isNewUser });
        },
        error: (error) => {
          console.log('Error checking user data', error);
        }
      });
    } else {
      console.log('user ID is missing');
    }
  }
}
