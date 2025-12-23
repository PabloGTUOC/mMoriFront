/**
 * HTTP State model interfaces
 */

export enum HttpProgressState {
  start = 'start',
  end = 'end',
  error = 'error'
}

export interface HttpState {
  url: string;
  state: HttpProgressState;
  message?: string;
}
