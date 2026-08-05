import { Component } from '@angular/core';

/**
 * Shell for the signed-in area: the nav bar plus a router outlet.
 *
 * It used to hold a `currentView` string and swap four components with `*ngIf`, and to
 * re-check auth state that the route guards already guarantee. Both are gone — the views
 * are child routes and access is decided once, on the parent route.
 */
@Component({
  selector: 'app-main-page',
  templateUrl: './main-page.component.html',
  styleUrl: './main-page.component.scss',
})
export class MainPageComponent {}
