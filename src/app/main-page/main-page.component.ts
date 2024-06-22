import { Component } from '@angular/core';
import { UserService } from '../user.service';

@Component({
  selector: 'app-main-page',
  templateUrl: './main-page.component.html',
  styleUrl: './main-page.component.scss'
})
export class MainPageComponent {


  isUserLogged = false;


  constructor(public userService: UserService) {

    console.log('User Info:', this.userService.getUserInfo());
   
    this.userService.logged.subscribe(logged => {
      console.log('User is logged:', logged);

      this.isUserLogged = logged;
    });

   }

  ngOnInit(): void {
  }

}
