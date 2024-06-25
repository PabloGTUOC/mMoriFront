import { Component } from '@angular/core';
import {AuthService} from "../auth.service";
import {UserService} from "../user.service";
import {user} from "@angular/fire/auth";

@Component({
  selector: 'app-log-in',
  standalone:true,
  templateUrl: './log-in.component.html',
  styleUrl: './log-in.component.scss',
  providers: [AuthService]
})
export class LogInComponent {
  isNewUser = false;
  constructor(private authService: AuthService, private userService: UserService) { }

  signInwithGoogle(isNew: boolean) {
    console.log('Sign in with Google');
    this.isNewUser = isNew;
    this.authService.googleSignIn().then(result => {
      if (result && result?.user) {  // Check if user object exists
        console.log('Signed with Google', result);
        const isNewUser = result.additionalUserInfo?.isNewUser;
        this.userService.logged.next(true);
        this.userService.setUserInfo({
          user: result.user,
          isNew: isNewUser
        });  // Assuming setUserInfo expects a user object
        const userEmail = result.user.email;
        if (userEmail) {
          console.log('User Email:', userEmail);
          this.sendEmailRuby(userEmail);
        }
      }
    }).catch(error => {
      console.error('Sign in with Google failed', error);
    });
  }

  sendEmailRuby(email: string){
    this.userService.sendUserEmail(email).subscribe({
      next: (response) => console.log('Email sent successfully', response),
      error: (error) => console.error('Error sending email', error)
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
