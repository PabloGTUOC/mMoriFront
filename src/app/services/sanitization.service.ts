import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Input Sanitization Service
 * Prevents XSS attacks and ensures data integrity
 */
@Injectable({
  providedIn: 'root'
})
export class SanitizationService {
  constructor(private domSanitizer: DomSanitizer) {}

  /**
   * Sanitize string input by removing HTML tags and dangerous characters
   */
  sanitizeString(input: string): string {
    if (!input) return '';

    // Remove HTML tags
    let sanitized = input.replace(/<[^>]*>/g, '');

    // Remove script tags and their content
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove event handlers
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

    // Trim whitespace
    sanitized = sanitized.trim();

    return sanitized;
  }

  /**
   * Sanitize HTML content for safe display
   */
  sanitizeHtml(html: string): SafeHtml {
    return this.domSanitizer.sanitize(1, html) || '';
  }

  /**
   * Sanitize email address
   */
  sanitizeEmail(email: string): string {
    if (!email) return '';

    // Basic email sanitization
    const sanitized = this.sanitizeString(email);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(sanitized) ? sanitized : '';
  }

  /**
   * Sanitize numeric input
   */
  sanitizeNumber(input: string | number): number {
    const num = typeof input === 'string' ? parseFloat(input) : input;
    return isNaN(num) ? 0 : num;
  }

  /**
   * Sanitize integer input
   */
  sanitizeInteger(input: string | number): number {
    const num = typeof input === 'string' ? parseInt(input, 10) : Math.floor(input);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Sanitize URL to prevent javascript: and data: URLs
   */
  sanitizeUrl(url: string): string {
    if (!url) return '';

    const sanitized = this.sanitizeString(url);

    // Block dangerous protocols
    const dangerousProtocols = /^(javascript|data|vbscript):/i;
    if (dangerousProtocols.test(sanitized)) {
      return '';
    }

    return sanitized;
  }

  /**
   * Sanitize object by sanitizing all string properties
   */
  sanitizeObject<T extends Record<string, any>>(obj: T): T {
    const sanitized = { ...obj };

    Object.keys(sanitized).forEach(key => {
      const value = sanitized[key];

      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeObject(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item =>
          typeof item === 'string' ? this.sanitizeString(item) :
          typeof item === 'object' && item !== null ? this.sanitizeObject(item) :
          item
        );
      }
    });

    return sanitized;
  }

  /**
   * Validate and sanitize form data
   */
  sanitizeFormData(formData: Record<string, any>): Record<string, any> {
    return this.sanitizeObject(formData);
  }

  /**
   * Remove SQL injection attempts from strings
   */
  preventSqlInjection(input: string): string {
    if (!input) return '';

    let sanitized = this.sanitizeString(input);

    // Remove common SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
      /(--|;|\/\*|\*\/|xp_|sp_)/gi,
      /('|")\s*(OR|AND)\s*('|")?/gi
    ];

    sqlPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    return sanitized;
  }
}
