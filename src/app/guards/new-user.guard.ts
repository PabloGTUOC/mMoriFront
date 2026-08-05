import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { UserService } from '../services/user.service';

/**
 * Sends users who have no profile yet to the onboarding form.
 *
 * Like `AuthGuard`, this waits for the session to resolve first — `isNew` is only
 * meaningful once the profile lookup in `UserService.initializeSession` has completed.
 */
@Injectable({
  providedIn: 'root',
})
export class NewUserGuard implements CanActivate {
  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.userService.sessionReady$.pipe(
      take(1),
      map((session) => (session.isNew ? this.router.createUrlTree(['/first-time']) : true))
    );
  }
}
