import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * Global Error Handler Service
 * Catches and handles all application errors
 */
@Injectable({
  providedIn: 'root'
})
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private injector: Injector) {}

  handleError(error: Error | HttpErrorResponse): void {
    let errorMessage = '';
    let errorType = '';

    if (error instanceof HttpErrorResponse) {
      // Server or network error
      errorType = 'HTTP Error';
      if (!navigator.onLine) {
        errorMessage = 'No internet connection. Please check your network.';
      } else {
        errorMessage = this.getHttpErrorMessage(error);
      }
      console.error('HTTP Error:', error);
    } else {
      // Client-side error
      errorType = 'Application Error';
      errorMessage = error.message || 'An unexpected error occurred';
      console.error('Application Error:', error);
    }

    // Show user-friendly error notification
    this.showErrorNotification(errorType, errorMessage);

    // Log error to external service (future enhancement)
    // this.logErrorToService(error);
  }

  /**
   * Get user-friendly message from HTTP error
   */
  private getHttpErrorMessage(error: HttpErrorResponse): string {
    switch (error.status) {
      case 0:
        return 'Unable to connect to server. Please try again.';
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Unauthorized. Please log in again.';
      case 403:
        return 'Access forbidden. You do not have permission.';
      case 404:
        return 'Resource not found.';
      case 500:
        return 'Server error. Please try again later.';
      case 503:
        return 'Service unavailable. Please try again later.';
      default:
        return `Error ${error.status}: ${error.message}`;
    }
  }

  /**
   * Show error notification to user
   */
  private showErrorNotification(type: string, message: string): void {
    // For now, use console and alert
    // In the future, replace with a proper notification service/component
    console.warn(`${type}: ${message}`);

    // You can replace this with a toast notification or modal
    if (this.shouldShowAlert(message)) {
      setTimeout(() => {
        alert(`${type}\n\n${message}`);
      }, 100);
    }
  }

  /**
   * Determine if we should show an alert for this error
   */
  private shouldShowAlert(message: string): boolean {
    // Don't show alerts for certain types of errors
    const silentErrors = [
      'Loading chunk',
      'Failed to fetch dynamically imported module'
    ];

    return !silentErrors.some(silent => message.includes(silent));
  }

  /**
   * Log error to external monitoring service (Sentry, LogRocket, etc.)
   * Placeholder for future implementation
   */
  private logErrorToService(error: Error | HttpErrorResponse): void {
    // TODO: Integrate with error monitoring service
    // Example: Sentry.captureException(error);
  }
}
