import { NgModule, isDevMode, ErrorHandler, APP_INITIALIZER } from '@angular/core';
import { UserService } from './services/user.service';
import { CommonModule } from '@angular/common';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';
import { FirstTimeComponent } from './first-time/first-time.component';
import { DisplayDailyComponent } from './display-daily/display-daily.component';
import { RouterOutlet } from '@angular/router';
import { FIREBASE_OPTIONS } from '@angular/fire/compat';
import { environment } from '../environments/environment';
import { BrowserModule } from '@angular/platform-browser';
import { MainPageComponent } from './main-page/main-page.component';
import { AppRoutingModule } from './app-routing.module';
import { LogInComponent } from './log-in/log-in.component';
import { LogOutComponent} from "./log-out/log-out.component";
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule} from "@angular/forms";
import { InputDailyComponent } from './input-daily/input-daily.component';
import { HttpInterceptorService } from './interceptor/http-interceptor.service';
import { SpinnerComponent } from './components/spinner.component';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { LifeExpectancyChartComponent } from './life-expectancy-chart/life-expectancy-chart.component';
import {NavigationMenuComponent} from "./navigation-menu/navigation-menu.component";
import {TrainingRepositoryComponent} from "./training-repository/training-repository.component";
import {StretchRepositoryComponent} from "./stretch-repository/stretch-repository.component";
import {ThoughtsComponent} from "./thoughts/thoughts.component";
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
    DisplayDailyComponent,
    LogInComponent,
    LogOutComponent,
    HttpClientModule,
    ReactiveFormsModule,
    InputDailyComponent,
    MatFormFieldModule,
    MatSelectModule,
    LifeExpectancyChartComponent,
    NavigationMenuComponent,
    TrainingRepositoryComponent,
    StretchRepositoryComponent,
    ThoughtsComponent,
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

