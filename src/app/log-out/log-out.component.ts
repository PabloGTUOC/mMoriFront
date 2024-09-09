import { Component } from '@angular/core';
import {AuthService} from "../services/auth.service";
import {UserService} from "../services/user.service";
import { Router } from '@angular/router';

@Component({
  selector: 'app-log-out',
  standalone:true,
  templateUrl: './log-out.component.html',
  styleUrl: './log-out.component.scss',
  providers: [AuthService]
})
export class LogOutComponent {
  constructor(private authService: AuthService,
              private userService: UserService,
              private router: Router
              ) { }

  signOut() {
    this.authService.signOut().then(() => {
      console.log('Sign out successful');
      this.userService.setUserInfo(null); // Reset user info and related states
      this.router.navigate(['/']);
    }).catch(error => {
      console.error('Sign out failed', error);
    });
  }
}
