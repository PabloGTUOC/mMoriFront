import {Component, OnDestroy, OnInit} from '@angular/core';
import { UserService } from '../user.service';
import {Subscription} from "rxjs";

@Component({
  selector: 'app-main-page',
  templateUrl: './main-page.component.html',
  styleUrl: './main-page.component.scss',
  })
export class MainPageComponent implements OnInit, OnDestroy {

  isUserLogged = false;
  isUserNew = false;
  private subscriptions = new Subscription(); // Manage multiple subscriptions

  constructor(public userService: UserService) {}

  ngOnInit(): void {
    this.subscriptions = this.userService.logged.subscribe(logged => {
      console.log('user is logged:', logged);
      this.isUserLogged = logged;
    });

    this.subscriptions.add(this.userService.isUserNew.subscribe(isNew => {
      console.log('user is new', isNew);
      this.isUserNew = isNew;
    }));
  }

  ngOnDestroy() {
    if(this.subscriptions) {
      this.subscriptions.unsubscribe();
    }
  }
}
