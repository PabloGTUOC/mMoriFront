import { ChangeDetectionStrategy, Component, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { Notification, NotificationService } from '../services/notification.service';

/**
 * Toast host for `NotificationService`.
 *
 * The service was written, documented as a feature, and never called by anything — the
 * global error handler used `alert()`, which blocks the page and cannot be styled or
 * dismissed (FRONTEND_IMPROVEMENT_PLAN.md 6.2).
 *
 * `role="alert"` so screen readers announce it without the user having to find it.
 */
@Component({
  selector: 'app-notification',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="notification() as toast"
      class="toast"
      [class.toast-success]="toast.type === 'success'"
      [class.toast-error]="toast.type === 'error'"
      [class.toast-warning]="toast.type === 'warning'"
      [class.toast-info]="toast.type === 'info'"
      role="alert"
    >
      <span class="toast-message">{{ toast.message }}</span>
      <button type="button" class="toast-close" aria-label="Dismiss" (click)="dismiss()">
        &times;
      </button>
    </div>
  `,
  styles: [
    `
      .toast {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2000;
        display: flex;
        align-items: center;
        gap: 12px;
        max-width: min(90vw, 480px);
        padding: 12px 16px;
        border-radius: 8px;
        border-left: 4px solid var(--info-color);
        background: var(--card-background);
        color: var(--text-primary);
        box-shadow: var(--shadow-lg);
      }
      .toast-success {
        border-left-color: var(--success-color);
      }
      .toast-error {
        border-left-color: var(--error-color);
      }
      .toast-warning {
        border-left-color: var(--warning-color);
      }
      .toast-message {
        flex: 1;
      }
      .toast-close {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1.25rem;
        line-height: 1;
        color: inherit;
      }
    `,
  ],
})
export class NotificationComponent implements OnDestroy {
  readonly notification = signal<Notification | null>(null);

  private readonly subscription: Subscription;

  constructor(private notifications: NotificationService) {
    this.subscription = this.notifications.notification$.subscribe(
      (notification) => this.notification.set(notification)
    );
  }

  dismiss(): void {
    this.notifications.dismiss();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
