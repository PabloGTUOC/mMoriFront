import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-log-out',
  standalone: true,
  templateUrl: './log-out.component.html',
  styleUrl: './log-out.component.scss',
})
export class LogOutComponent {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  /** See `NavigationMenuComponent.signOut` — Firebase auth state is the only source of truth. */
  signOut(): void {
    this.authService
      .signOut()
      .then(() => this.router.navigate(['/log-in']))
      .catch((error) => console.error('Sign out failed', error));
  }
}
