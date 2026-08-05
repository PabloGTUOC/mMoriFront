import { TestBed } from '@angular/core/testing';
import { HTTP_INTERCEPTORS, HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AuthInterceptor } from './auth.interceptor';
import { environment } from '../../environments/environment';

/**
 * Covers the client half of Phase 4: the ID token has to reach our API, must not reach
 * anywhere else, and an expired token must recover exactly once.
 */
describe('AuthInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let getIdToken: jasmine.Spy;

  /** `currentUser` is a Promise on the compat layer, not an Observable. */
  function configure(signedIn: boolean) {
    getIdToken = jasmine
      .createSpy('getIdToken')
      .and.callFake((force?: boolean) => Promise.resolve(force ? 'fresh-token' : 'cached-token'));

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
        {
          provide: AngularFireAuth,
          useValue: { currentUser: Promise.resolve(signedIn ? { getIdToken } : null) },
        },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => httpMock.verify());

  /**
   * The interceptor chains several promises before the request goes out (currentUser, then
   * getIdToken). Draining the microtask queue with `await Promise.resolve()` is not enough;
   * a macrotask turn flushes all of them.
   */
  const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  it('attaches the token to API requests', async () => {
    configure(true);
    http.get(`${environment.apiUrl}/stretches`).subscribe();
    await flush();

    const request = httpMock.expectOne(`${environment.apiUrl}/stretches`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer cached-token');
    request.flush({ success: true, data: [] });
  });

  /** Sending a credential to a third-party host would be a leak, not a feature. */
  it('does not attach the token to other hosts', async () => {
    configure(true);
    http.get('https://example.com/thing').subscribe();
    await flush();

    const request = httpMock.expectOne('https://example.com/thing');
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(getIdToken).not.toHaveBeenCalled();
    request.flush({});
  });

  it('sends the request unauthenticated when nobody is signed in', async () => {
    configure(false);
    http.get(`${environment.apiUrl}/stretches`).subscribe();
    await flush();

    const request = httpMock.expectOne(`${environment.apiUrl}/stretches`);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ success: true, data: [] });
  });

  it('forces a refresh and replays once on a 401', async () => {
    configure(true);
    let succeeded = false;
    http.get(`${environment.apiUrl}/stretches`).subscribe(() => (succeeded = true));
    await flush();

    httpMock
      .expectOne(`${environment.apiUrl}/stretches`)
      .flush({ success: false }, { status: 401, statusText: 'Unauthorized' });
    await flush();

    const retried = httpMock.expectOne(`${environment.apiUrl}/stretches`);
    expect(retried.request.headers.get('Authorization')).toBe('Bearer fresh-token');
    expect(getIdToken).toHaveBeenCalledWith(true);

    retried.flush({ success: true, data: [] });
    expect(succeeded).toBe(true);
  });

  /** The retry must not become a loop: a second 401 propagates to the caller. */
  it('gives up after one retry', async () => {
    configure(true);
    let status: number | undefined;
    http
      .get(`${environment.apiUrl}/stretches`)
      .subscribe({ error: (error) => (status = error.status) });
    await flush();

    httpMock
      .expectOne(`${environment.apiUrl}/stretches`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    await flush();

    httpMock
      .expectOne(`${environment.apiUrl}/stretches`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    await flush();

    expect(status).toBe(401);
  });
});
