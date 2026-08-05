import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { UserService } from './user.service';

/**
 * Covers the session handling introduced in Phase 1 — the part that decides whether a
 * reload keeps you signed in.
 */
describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;
  let authState: BehaviorSubject<{ uid: string } | null>;

  beforeEach(() => {
    authState = new BehaviorSubject<{ uid: string } | null>(null);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AngularFireAuth, useValue: { authState } },
      ],
    });

    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  const profileRequest = () =>
    httpMock.expectOne((request) => request.url.endsWith('/user_data/user_data'));

  const currentSession = () => firstValueFrom(service.session$);

  it('starts pending, so guards cannot decide before Firebase has answered', async () => {
    expect((await currentSession()).status).toBe('pending');
  });

  it('resolves to anonymous when nobody is signed in', async () => {
    await service.initializeSession();

    const session = await currentSession();
    expect(session.status).toBe('anonymous');
    expect(session.userId).toBeNull();
  });

  it('resolves an existing user to an authenticated session', async () => {
    authState.next({ uid: 'user-1' });
    const initialized = service.initializeSession();

    profileRequest().flush({ success: true, user_data: {} });
    await initialized;

    const session = await currentSession();
    expect(session.status).toBe('authenticated');
    expect(session.userId).toBe('user-1');
    expect(session.isNew).toBe(false);
    expect(service.getUserId()).toBe('user-1');
  });

  it('marks a user with no profile as new', async () => {
    authState.next({ uid: 'user-2' });
    const initialized = service.initializeSession();

    profileRequest().flush({ success: false, message: 'No data found' });
    await initialized;

    expect((await currentSession()).isNew).toBe(true);
  });

  /**
   * An unreachable API must not look like a new user: that would push an established user
   * back through onboarding and write a duplicate profile snapshot.
   */
  it('treats a failed profile lookup as an existing user', async () => {
    authState.next({ uid: 'user-3' });
    const initialized = service.initializeSession();

    profileRequest().flush('boom', { status: 500, statusText: 'Server Error' });
    await initialized;

    const session = await currentSession();
    expect(session.status).toBe('authenticated');
    expect(session.isNew).toBe(false);
  });

  it('returns to anonymous when Firebase reports a sign-out', async () => {
    authState.next({ uid: 'user-4' });
    const initialized = service.initializeSession();
    profileRequest().flush({ success: true });
    await initialized;

    authState.next(null);

    const session = await currentSession();
    expect(session.status).toBe('anonymous');
    expect(session.userId).toBeNull();
  });

  it('clears the new-user flag once onboarding completes', async () => {
    authState.next({ uid: 'user-5' });
    const initialized = service.initializeSession();
    profileRequest().flush({ success: false });
    await initialized;

    service.setUserNewStatus(false);

    const session = await currentSession();
    expect(session.isNew).toBe(false);
    expect(session.status).toBe('authenticated');
  });
});
