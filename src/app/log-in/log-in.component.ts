import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-log-in',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './log-in.component.html',
  styleUrl: './log-in.component.scss',
})
export class LogInComponent implements OnInit, OnDestroy {
  signingIn = false;
  errorMessage: string | null = null;

  private readonly subscriptions = new Subscription();

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  /**
   * Navigation is driven by the resolved session rather than by the sign-in call.
   *
   * `UserService` already watches Firebase auth state and looks up whether the user has a
   * profile, so waiting on `session$` here means one profile lookup per sign-in instead of
   * two, and it also redirects a user who reaches /log-in with a session already restored.
   */
  ngOnInit(): void {
    this.subscriptions.add(
      this.userService.session$
        .pipe(
          filter((session) => session.status === 'authenticated'),
          take(1)
        )
        .subscribe((session) => {
          this.signingIn = false;
          void this.router.navigateByUrl(session.isNew ? '/first-time' : this.returnUrl());
        })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  signInwithGoogle(): void {
    this.signingIn = true;
    this.errorMessage = null;

    this.authService
      .googleSignIn()
      .then((result) => {
        // A popup the user closes resolves without a credential; nothing to report.
        if (!result?.user) {
          this.signingIn = false;
        }
      })
      .catch((error) => {
        console.error('Sign in with Google failed', error);
        this.signingIn = false;
        this.errorMessage = 'Sign in failed. Please try again.';
      });
  }

  /** Set by `AuthGuard` when it intercepts a protected route. */
  private returnUrl(): string {
    return this.route.snapshot.queryParamMap.get('returnUrl') ?? '/home';
  }
}
