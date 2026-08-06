import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  readonly isDarkMode = signal(false);

  constructor(public themeService: ThemeService) {
    this.themeService.darkMode$.subscribe(darkMode => {
      this.isDarkMode.set(darkMode);
    });
  }

  toggleTheme(): void {
    this.themeService.toggleDarkMode();
  }
}
