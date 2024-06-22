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

@NgModule({
  declarations: [
    AppComponent,
    MainPageComponent,
  ],
  imports: [
    CommonModule,
    BrowserModule,
    RouterOutlet,
    AppRoutingModule,
    HeaderComponent,
    FirstTimeComponent,
    DisplayDailyComponent,  ],
  bootstrap: [AppComponent],
  providers: [
            { provide: FIREBASE_OPTIONS, useValue: environment.firebaseConfig }
        ],
})
export class AppModule { }

