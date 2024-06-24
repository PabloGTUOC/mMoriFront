import {Component, OnDestroy, OnInit} from '@angular/core';
import { UserService } from '../user.service';
import {Subscription} from "rxjs";

@Component({
  selector: 'app-main-page',
  templateUrl: './main-page.component.html',
  styleUrl: './main-page.component.scss'
})
export class MainPageComponent implements OnInit, OnDestroy {

  isUserLogged = false;
  private subscription!: Subscription;

  constructor(public userService: UserService) {}

  ngOnInit(): void {
    this.subscription = this.userService.logged.subscribe(logged => {
      console.log('user is logged:', logged);
      this.isUserLogged = logged;
    });
    console.log('User Info:', this.userService.getUserInfo());
  }

  ngOnDestroy() {
    if(this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
