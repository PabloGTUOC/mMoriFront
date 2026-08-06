import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavigationMenuComponent } from '../navigation-menu/navigation-menu.component';

/**
 * Shell for the signed-in area: the nav bar plus a router outlet.
 *
 * It used to hold a `currentView` string and swap four components with `*ngIf`, and to
 * re-check auth state that the route guards already guarantee. Both are gone — the views
 * are child routes and access is decided once, on the parent route.
 */
@Component({
  selector: 'app-main-page',
  standalone: true,
  imports: [RouterOutlet, NavigationMenuComponent],
  templateUrl: './main-page.component.html',
  styleUrl: './main-page.component.scss',
  // A shell around a router outlet; holds no state.
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainPageComponent {}
