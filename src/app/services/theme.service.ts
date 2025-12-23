import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private darkModeSubject = new BehaviorSubject<boolean>(this.getInitialTheme());
  public darkMode$ = this.darkModeSubject.asObservable();

  constructor() {
    // Apply initial theme on service initialization
    this.applyTheme(this.darkModeSubject.value);
  }

  /**
   * Get initial theme from localStorage or system preference
   */
  private getInitialTheme(): boolean {
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme !== null) {
      return savedTheme === 'true';
    }
    // Check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  /**
   * Toggle between dark and light mode
   */
  toggleDarkMode(): void {
    const newValue = !this.darkModeSubject.value;
    this.darkModeSubject.next(newValue);
    this.applyTheme(newValue);
    localStorage.setItem('darkMode', String(newValue));
  }

  /**
   * Set specific theme
   */
  setDarkMode(enabled: boolean): void {
    this.darkModeSubject.next(enabled);
    this.applyTheme(enabled);
    localStorage.setItem('darkMode', String(enabled));
  }

  /**
   * Get current theme state
   */
  isDarkMode(): boolean {
    return this.darkModeSubject.value;
  }

  /**
   * Apply theme to document body
   */
  private applyTheme(darkMode: boolean): void {
    if (darkMode) {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    }
  }
}
