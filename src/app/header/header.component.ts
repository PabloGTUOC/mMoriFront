import { Component, Inject } from '@angular/core';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  providers: [AuthService]

})
export class HeaderComponent {
  constructor(private authService: AuthService) { }

  signInwithGoogle() {
    this.authService.googleSignIn().then(result => {
      console.log('Sign in with Google', result);
    }).catch(error => {
      console.error('Sign in with Google failed', error);
    } );
  }

  signOut() {
    this.authService.signOut().then(() => {
      console.log('Sign out successful');
    }).catch(error => {
      console.error('Sign out failed', error);
    });
  }

  
}
