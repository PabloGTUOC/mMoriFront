import { Component } from '@angular/core';
import {AuthService} from "../services/auth.service";
import {UserService} from "../services/user.service";
import { Router } from '@angular/router';
import {response} from "express";

@Component({
  selector: 'app-log-in',
  standalone:true,
  templateUrl: './log-in.component.html',
  styleUrl: './log-in.component.scss',
  providers: [AuthService]
})
export class LogInComponent {
  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router
  ) {}

  signInwithGoogle() {
    console.log('Sign in with Google');
    this.authService.googleSignIn().then(result => {
      if (result?.user) {
        console.log('Signed in with Google', result);
        this.userService.handleUserLogin(result.user);
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
