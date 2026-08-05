import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Navigation for the signed-in area.
 *
 * Uses `routerLink` rather than emitting a view name to the parent, so the links are real
 * URLs — shareable, bookmarkable, and correct with the back button — and `routerLinkActive`
 * gives the active state the old string switch could not.
 */
@Component({
  selector: 'app-navigation-menu',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navigation-menu.component.html',
  styleUrls: ['./navigation-menu.component.scss'],
})
export class NavigationMenuComponent {
  dropdownOpen = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  closeDropdown(): void {
    this.dropdownOpen = false;
  }

  /**
   * Signing out of Firebase is enough to clear the session: `UserService` watches auth
   * state, so it resets itself. A second source of truth here is what made the old auth
   * handling unreliable.
   */
  signOut(): void {
    this.authService
      .signOut()
      .then(() => this.router.navigate(['/log-in']))
      .catch((error) => console.error('Sign out failed', error));
  }
}
