import {Component, EventEmitter, Output} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from "../services/auth.service";
import { UserService } from "../services/user.service";

@Component({
  selector: 'app-navigation-menu',
  standalone: true,
  templateUrl: './navigation-menu.component.html',
  styleUrls: ['./navigation-menu.component.scss'],
  providers: [AuthService]
})
export class NavigationMenuComponent {
  @Output() viewChange = new EventEmitter<string>(); // Emit view change event
  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router
  ) {}

  dropdownOpen = false;

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  // Method for sign out
  signOut() {
    this.authService.signOut().then(() => {
      console.log('Sign out successful');
      this.userService.setUserInfo(null); // Reset user info and states
      this.router.navigate(['/']); // Redirect to home after sign-out
    }).catch(error => {
      console.error('Sign out failed', error);
    });
  }

  // Navigation actions for other buttons
  navigate(view: string) {
    this.viewChange.emit(view);
    this.dropdownOpen = false;
  }
}
