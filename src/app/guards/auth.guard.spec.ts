import { TestBed } from '@angular/core/testing';
import { provideRouter, RouterStateSnapshot, UrlTree } from '@angular/router';
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { AuthGuard } from './auth.guard';
import { Session, UserService } from '../services/user.service';

/**
 * Locks in the reload bug fixed in Phase 1: the guard must wait for the session to resolve
 * rather than reading a default of "logged out".
 */
describe('AuthGuard', () => {
  function createGuard(sessionReady$: unknown): AuthGuard {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: UserService, useValue: { sessionReady$ } }],
    });
    return TestBed.inject(AuthGuard);
  }

  const stateFor = (url: string) => ({ url }) as RouterStateSnapshot;
  const emptyRoute = {} as never;

  it('allows an authenticated user through', async () => {
    const guard = createGuard(
      of<Session>({ status: 'authenticated', userId: 'u1', isNew: false })
    );

    await expectAsync(
      firstValueFrom(guard.canActivate(emptyRoute, stateFor('/home')))
    ).toBeResolvedTo(true);
  });

  it('redirects an anonymous user to /log-in, preserving the attempted url', async () => {
    const guard = createGuard(of<Session>({ status: 'anonymous', userId: null, isNew: false }));

    const result = await firstValueFrom(guard.canActivate(emptyRoute, stateFor('/first-time')));

    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe('/log-in?returnUrl=%2Ffirst-time');
  });

  /**
   * The regression test for the reload bug. While the session is `pending` the guard must
   * emit nothing at all — the old version resolved `false` immediately and redirected a
   * signed-in user to the login screen on every refresh.
   */
  it('waits while the session is pending instead of deciding early', async () => {
    const session = new BehaviorSubject<Session>({
      status: 'pending',
      userId: null,
      isNew: false,
    });
    const guard = createGuard(
      session.pipe(
        filter((s) => s.status !== 'pending'),
        take(1)
      )
    );

    let decided: boolean | UrlTree | undefined;
    guard.canActivate(emptyRoute, stateFor('/home')).subscribe((value) => (decided = value));

    expect(decided).toBeUndefined();

    session.next({ status: 'authenticated', userId: 'u1', isNew: false });

    expect(decided).toBe(true);
  });
});
