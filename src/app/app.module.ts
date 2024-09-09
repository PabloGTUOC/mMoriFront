import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';
import { FirstTimeComponent } from './first-time/first-time.component';
import { DisplayDailyComponent } from './display-daily/display-daily.component';
import { RouterOutlet } from '@angular/router';
import { FIREBASE_OPTIONS } from '@angular/fire/compat';
import { environment } from '../enviroments/environment';
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
    ThoughtsComponent
  ],
  bootstrap: [AppComponent],
  providers: [
            { provide: FIREBASE_OPTIONS, useValue: environment.firebaseConfig },
            { provide: HTTP_INTERCEPTORS, useClass: HttpInterceptorService, multi: true },
            provideAnimationsAsync()
        ],
})
export class AppModule { }

