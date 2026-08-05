import { TestBed } from '@angular/core/testing';
import { provideRouter, UrlTree } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { NewUserGuard } from './new-user.guard';
import { Session, UserService } from '../services/user.service';

describe('NewUserGuard', () => {
  function createGuard(session: Session): NewUserGuard {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: UserService, useValue: { sessionReady$: of(session) } },
      ],
    });
    return TestBed.inject(NewUserGuard);
  }

  it('sends a user with no profile to onboarding', async () => {
    const guard = createGuard({ status: 'authenticated', userId: 'u1', isNew: true });

    const result = await firstValueFrom(guard.canActivate());

    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe('/first-time');
  });

  it('lets an established user through', async () => {
    const guard = createGuard({ status: 'authenticated', userId: 'u1', isNew: false });

    await expectAsync(firstValueFrom(guard.canActivate())).toBeResolvedTo(true);
  });
});
