import { NgModule, isDevMode, ErrorHandler, APP_INITIALIZER } from '@angular/core';
import { UserService } from './services/user.service';
import { CommonModule } from '@angular/common';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';
import { FirstTimeComponent } from './first-time/first-time.component';
import { RouterOutlet } from '@angular/router';
import { FIREBASE_OPTIONS } from '@angular/fire/compat';
import { environment } from '../environments/environment';
import { BrowserModule } from '@angular/platform-browser';
import { MainPageComponent } from './main-page/main-page.component';
import { AppRoutingModule } from './app-routing.module';
import { LogInComponent } from './log-in/log-in.component';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule} from "@angular/forms";
import { HttpInterceptorService } from './interceptor/http-interceptor.service';
import { AuthInterceptor } from './interceptor/auth.interceptor';
import { SpinnerComponent } from './components/spinner.component';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import {NavigationMenuComponent} from "./navigation-menu/navigation-menu.component";
import { ServiceWorkerModule } from '@angular/service-worker';
import { GlobalErrorHandler } from './services/error-handler.service';


@NgModule({
  declarations: [
    AppComponent,
    MainPageComponent,
    SpinnerComponent,
  ],
  imports: [
    CommonModule,
    BrowserModule,
    RouterOutlet,
    AppRoutingModule,
    HeaderComponent,
    FirstTimeComponent,
    LogInComponent,
    HttpClientModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    NavigationMenuComponent,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
    })
  ],
  bootstrap: [AppComponent],
  providers: [
            { provide: FIREBASE_OPTIONS, useValue: environment.firebaseConfig },
            // Ordered: the token is attached before the spinner/retry interceptor runs.
            { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
            { provide: HTTP_INTERCEPTORS, useClass: HttpInterceptorService, multi: true },
            { provide: ErrorHandler, useClass: GlobalErrorHandler },
            // Resolve the Firebase session before the router evaluates a single guard,
            // so a reload restores the signed-in user instead of redirecting to /log-in.
            {
              provide: APP_INITIALIZER,
              useFactory: (userService: UserService) => () => userService.initializeSession(),
              deps: [UserService],
              multi: true
            },
            provideAnimationsAsync()
        ],
})
export class AppModule { }

