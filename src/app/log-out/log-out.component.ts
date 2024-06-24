import { Component } from '@angular/core';
import {AuthService} from "../auth.service";
import {UserService} from "../user.service";

@Component({
  selector: 'app-log-out',
  standalone:true,
  templateUrl: './log-out.component.html',
  styleUrl: './log-out.component.scss',
  providers: [AuthService]
})
export class LogOutComponent {
  constructor(private authService: AuthService, private userService: UserService) { }

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
