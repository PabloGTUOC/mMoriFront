import { Routes } from '@angular/router';
import { MainPageComponent } from './main-page/main-page.component';
import { FirstTimeComponent } from './first-time/first-time.component';
import { AuthGuard } from './guards/auth.guard';
import { NewUserGuard } from './guards/new-user.guard';
import { LogInComponent } from './log-in/log-in.component';

/**
 * Application routes.
 *
 * Moved out of `AppRoutingModule` when the app went fully standalone (5.2) — these are now
 * passed to `provideRouter` in app.config.ts. Behaviour is unchanged.
 *
 * The four signed-in views are **child routes**, not a `currentView` string switched with
 * `*ngIf` (5.1). That gives deep links, a working back button, genuine code splitting via
 * `loadComponent`, and one source of truth for access — the guards sit on the parent route
 * rather than being mirrored as template conditions.
 */
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    component: MainPageComponent,
    canActivate: [AuthGuard, NewUserGuard],
    children: [
      { path: '', redirectTo: 'daily', pathMatch: 'full' },
      {
        path: 'daily',
        title: 'Today',
        loadComponent: () =>
          import('./daily-view/daily-view.component').then((m) => m.DailyViewComponent),
      },
      {
        path: 'trainings',
        title: 'Trainings',
        loadComponent: () =>
          import('./training-repository/training-repository.component').then(
            (m) => m.TrainingRepositoryComponent
          ),
      },
      {
        path: 'stretches',
        title: 'Stretches',
        loadComponent: () =>
          import('./stretch-repository/stretch-repository.component').then(
            (m) => m.StretchRepositoryComponent
          ),
      },
      {
        path: 'history',
        title: 'History',
        loadComponent: () =>
          import('./history/history.component').then((m) => m.HistoryComponent),
      },
      {
        path: 'thoughts',
        title: 'Thoughts of the Day',
        loadComponent: () =>
          import('./thoughts/thoughts.component').then((m) => m.ThoughtsComponent),
      },
    ],
  },
  {
    path: 'first-time',
    component: FirstTimeComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'log-in',
    component: LogInComponent,
  },
  // An unknown URL should land somewhere useful; the guards decide where from there.
  { path: '**', redirectTo: 'home' },
];
