import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Navigation for the signed-in area.
 *
 * Uses `routerLink` rather than emitting a view name to the parent, so the links are real
 * URLs — shareable, bookmarkable, and correct with the back button — and `routerLinkActive`
 * gives the active state the old string switch could not.
 *
 * The hamburger dropdown that used to live here is gone, along with its open/close state.
 * It duplicated every link into a second copy of the markup and hid four short labels
 * behind an extra tap; the layout now reflows from one list in CSS. `ariaCurrentWhenActive`
 * pairs with `routerLinkActive` so the current page is announced, not just coloured.
 */
@Component({
  selector: 'app-navigation-menu',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navigation-menu.component.html',
  styleUrls: ['./navigation-menu.component.scss'],
})
export class NavigationMenuComponent {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

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
