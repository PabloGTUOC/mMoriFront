import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import { UserService } from '../services/user.service';
import {Subscription} from "rxjs";
import { ChangeDetectorRef } from '@angular/core';
import { DisplayDailyComponent} from "../display-daily/display-daily.component";

@Component({
  selector: 'app-main-page',
  templateUrl: './main-page.component.html',
  styleUrl: './main-page.component.scss',
  })
export class MainPageComponent implements OnInit, OnDestroy {

  isUserLogged = false;
  isUserNew = false;

  @ViewChild(DisplayDailyComponent) displayDailyComponent!: DisplayDailyComponent;

  currentView: string = 'daily';
  private subscriptions = new Subscription(); // Manage multiple subscriptions

  constructor(
    public userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(this.userService.logged.subscribe(logged => {
      console.log('user is logged:', logged);
      this.isUserLogged = logged;
      this.cdr.detectChanges();
    }));
    this.subscriptions.add(this.userService.isUserNew.subscribe(isNew => {
      console.log('user is new', isNew);
      this.isUserNew = isNew;
      this.cdr.detectChanges();
    }));
    console.log('isUserLogged:', this.isUserLogged);
    console.log('isUserNew:', this.isUserNew);
  }
  // Change the view based on the navigation button clicked
  changeView(view: string) {
    this.currentView = view;
  }
  ngOnDestroy() {
    if(this.subscriptions) {
      this.subscriptions.unsubscribe();
    }
  }
  // Helper method to safely access DisplayDailyComponent properties
  get displayDailyDataReady(): boolean {
    return this.displayDailyComponent !== undefined;
  }
}
