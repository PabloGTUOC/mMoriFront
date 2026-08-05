import { EnvironmentProviders, Provider } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { of } from 'rxjs';

/**
 * Shared TestBed providers.
 *
 * Every spec in this project failed before this existed — 22 of 23 — almost all with
 * `NullInjectorError: No provider for HttpClient`. The generated specs were never given the
 * dependencies the components actually use, so the suite had been red since it was created.
 *
 * See FRONTEND_IMPROVEMENT_PLAN.md task 2.2.
 */

/**
 * Stands in for Firebase auth.
 *
 * `UserService` subscribes to `authState`, so a real `AngularFireAuth` would try to reach
 * Google from the test runner. Emitting `null` means "nobody signed in", which leaves the
 * session in its `pending` state and keeps specs offline and deterministic.
 */
export const angularFireAuthStub = {
  authState: of(null),
  idToken: of(null),
  signInWithPopup: () => Promise.resolve(null),
  signOut: () => Promise.resolve(),
};

/** Minimal ActivatedRoute — `LogInComponent` reads `returnUrl` off the query params. */
export const activatedRouteStub = {
  snapshot: { queryParamMap: convertToParamMap({}) },
};

export function testingProviders(): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(),
    provideHttpClientTesting(),
    provideRouter([]),
    provideNoopAnimations(),
    { provide: AngularFireAuth, useValue: angularFireAuthStub },
    // Declared after provideRouter so this stub wins.
    { provide: ActivatedRoute, useValue: activatedRouteStub },
  ];
}
