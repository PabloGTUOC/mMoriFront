import { Component } from '@angular/core';

/**
 * Shell for the signed-in area.
 *
 * The route is protected by `AuthGuard` and `NewUserGuard`, so this component no longer
 * re-checks whether the user is signed in or new. It previously subscribed to both and
 * mirrored them into `*ngIf`s, which meant auth state had two sources of truth that could —
 * and did — disagree.
 *
 * View switching is still a local string rather than child routes; replacing it is Phase 5.1
 * of FRONTEND_IMPROVEMENT_PLAN.md.
 */
@Component({
  selector: 'app-main-page',
  templateUrl: './main-page.component.html',
  styleUrl: './main-page.component.scss',
})
export class MainPageComponent {
  currentView = 'daily';

  changeView(view: string): void {
    this.currentView = view;
  }
}
