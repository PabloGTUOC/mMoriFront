import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainPageComponent } from './main-page/main-page.component';
import { FirstTimeComponent } from './first-time/first-time.component';
import { AuthGuard } from './guards/auth.guard';
import { NewUserGuard } from './guards/new-user.guard';
import { LogInComponent } from './log-in/log-in.component';

/**
 * The four signed-in views are **child routes**, not a `currentView` string switched with
 * `*ngIf` (FRONTEND_IMPROVEMENT_PLAN.md 5.1).
 *
 * What that buys, beyond tidiness:
 *   - deep links — /home/trainings is now a real, shareable URL
 *   - a working back button
 *   - genuine code splitting: each view is `loadComponent`, so the training, stretch and
 *     mood screens are no longer in the initial bundle
 *   - one source of truth for access, since the guards sit on the parent route instead of
 *     being mirrored as template conditions
 */
const routes: Routes = [
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

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
