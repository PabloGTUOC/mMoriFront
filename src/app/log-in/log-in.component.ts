import { Component } from '@angular/core';
import {AuthService} from "../auth.service";
import {UserService} from "../user.service";
import { Router } from '@angular/router';

@Component({
  selector: 'app-log-in',
  standalone:true,
  templateUrl: './log-in.component.html',
  styleUrl: './log-in.component.scss',
  providers: [AuthService]
})
export class LogInComponent {
  isNewUser = false;
  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router
  ) {}

  signInwithGoogle(isNew: boolean) {
    console.log('Sign in with Google');
    this.isNewUser = isNew;  // You control this based on the button clicked
    this.authService.googleSignIn().then(result => {
      if (result?.user) {
        console.log('Signed with Google', result);
        this.userService.logged.next(true);
        this.userService.setUserInfo({
          user: result.user,
          isNew: this.isNewUser  // Use your own isNew control instead of Google's flag
        });
        const userId = result.user.uid;
        if (userId) {
          console.log('User ID:', userId);
          //Check for training data
          this.userService.checkUserTraining(userId).subscribe({
            next: (response) => {
              console.log('Training data check:', response);
            },
            error: (error) => console.error('Error checking training data', error)
          });
        }
      }
    }).catch(error => {
      console.error('Sign in with Google failed', error);
    });
  }

  signOut() {
    this.authService.signOut().then(() => {
      console.log('Sign out successful');
      this.userService.logged.next(false);
      this.userService.setUserInfo(null);
    }).catch(error => {
      console.error('Sign out failed', error);
    });
  }

}
