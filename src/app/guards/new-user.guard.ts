import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { UserService } from '../services/user.service';

/**
 * Guard to redirect new users to the first-time setup page
 */
@Injectable({
  providedIn: 'root'
})
export class NewUserGuard implements CanActivate {
  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.userService.isUserNew.pipe(
      take(1),
      map(isNew => {
        if (isNew) {
          // New users must complete first-time setup
          this.router.navigate(['/first-time']);
          return false;
        } else {
          return true;
        }
      })
    );
  }
}
