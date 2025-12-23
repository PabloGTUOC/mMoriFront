import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Notification {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

/**
 * Notification Service for displaying user-friendly messages
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationSubject = new BehaviorSubject<Notification | null>(null);
  public notification$ = this.notificationSubject.asObservable();

  /**
   * Show success notification
   */
  success(message: string, duration: number = 3000): void {
    this.show({ type: 'success', message, duration });
  }

  /**
   * Show error notification
   */
  error(message: string, duration: number = 5000): void {
    this.show({ type: 'error', message, duration });
  }

  /**
   * Show warning notification
   */
  warning(message: string, duration: number = 4000): void {
    this.show({ type: 'warning', message, duration });
  }

  /**
   * Show info notification
   */
  info(message: string, duration: number = 3000): void {
    this.show({ type: 'info', message, duration });
  }

  /**
   * Show notification and auto-dismiss after duration
   */
  private show(notification: Notification): void {
    this.notificationSubject.next(notification);

    if (notification.duration) {
      setTimeout(() => {
        this.dismiss();
      }, notification.duration);
    }
  }

  /**
   * Manually dismiss notification
   */
  dismiss(): void {
    this.notificationSubject.next(null);
  }
}
