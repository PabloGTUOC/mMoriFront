import { Component, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-navigation-menu',
  standalone: true,
  templateUrl: './navigation-menu.component.html',
  styleUrls: ['./navigation-menu.component.scss'],
})
export class NavigationMenuComponent {
  @Output() viewChange = new EventEmitter<string>();

  dropdownOpen = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  /**
   * Signing out of Firebase is enough to clear the session: `UserService` watches auth
   * state, so it resets itself. Clearing session fields here as well would be a second
   * source of truth, which is what made the old auth handling unreliable.
   */
  signOut(): void {
    this.authService
      .signOut()
      .then(() => this.router.navigate(['/log-in']))
      .catch((error) => console.error('Sign out failed', error));
  }

  navigate(view: string): void {
    this.viewChange.emit(view);
    this.dropdownOpen = false;
  }
}
