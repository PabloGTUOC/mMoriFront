import {
  APP_INITIALIZER,
  ApplicationConfig,
  ErrorHandler,
  isDevMode,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { FIREBASE_OPTIONS } from '@angular/fire/compat';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { UserService } from './services/user.service';
import { GlobalErrorHandler } from './services/error-handler.service';
import { AuthInterceptor } from './interceptor/auth.interceptor';
import { HttpInterceptorService } from './interceptor/http-interceptor.service';

/**
 * Application providers, replacing `AppModule` (FRONTEND_IMPROVEMENT_PLAN.md 5.2).
 *
 * The NgModule had become mostly ceremony: after 5.1 moved the four views to lazy routes,
 * it declared three components and imported a list of standalone ones purely so the
 * compiler could see them. Everything it actually configured is a provider, and providers
 * belong here.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),

    // `withInterceptorsFromDi` keeps the two class-based HTTP_INTERCEPTORS below working.
    provideHttpClient(withInterceptorsFromDi()),

    { provide: FIREBASE_OPTIONS, useValue: environment.firebaseConfig },

    // Order matters: the token is attached before the spinner/retry interceptor runs.
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: HttpInterceptorService, multi: true },

    { provide: ErrorHandler, useClass: GlobalErrorHandler },

    // Resolve the Firebase session before the router evaluates a single guard, so a reload
    // restores the signed-in user instead of redirecting to /log-in.
    {
      provide: APP_INITIALIZER,
      useFactory: (userService: UserService) => () => userService.initializeSession(),
      deps: [UserService],
      multi: true,
    },


    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
