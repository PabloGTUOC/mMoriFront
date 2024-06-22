import { Component, Inject } from '@angular/core';
import { AuthService } from '../auth.service';
import { UserService } from '../user.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  providers: [AuthService]

})
export class HeaderComponent {
  constructor(private authService: AuthService, private userService: UserService) { }

  signInwithGoogle() {
    console.log('Sign in with Google');
    this.authService.googleSignIn().then(result => {
      console.log('Signed with Google', result);
      this.userService.logged.next(true);
      this.userService.setUserInfo(result);

    }).catch(error => {
      console.error('Sign in with Google failed', error);
    } );
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
