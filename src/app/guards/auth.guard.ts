import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { UserService } from '../services/user.service';

/**
 * Protects routes that require a signed-in user.
 *
 * Waits for `sessionReady$` rather than reading session state immediately. The previous
 * version took the current value of a subject that started as `false`, so a reload — which
 * evaluates guards long before Firebase has restored the session — always redirected to
 * /log-in even though the user was signed in.
 *
 * Returns a `UrlTree` instead of navigating imperatively, so the router performs a single
 * redirect rather than racing a rejected navigation against a manual one.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    return this.userService.sessionReady$.pipe(
      take(1),
      map((session) =>
        session.status === 'authenticated'
          ? true
          : this.router.createUrlTree(['/log-in'], {
              queryParams: { returnUrl: state.url },
            })
      )
    );
  }
}
