import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { UserService } from '../services/user.service';

/**
 * Auth Guard to protect routes that require authentication
 */
@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.userService.logged.pipe(
      take(1),
      map(isLogged => {
        if (isLogged) {
          return true;
        } else {
          // Redirect to login if not authenticated
          this.router.navigate(['/log-in'], {
            queryParams: { returnUrl: state.url }
          });
          return false;
        }
      })
    );
  }
}
