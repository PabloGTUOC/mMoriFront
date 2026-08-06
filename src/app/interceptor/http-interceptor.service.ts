import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from "@angular/common/http";
import { Inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { catchError, finalize, retry, timeout } from "rxjs/operators";
import { HttpProgressState, HttpStateService } from "./http-state.service";

@Injectable({
  providedIn: "root",
})
export class HttpInterceptorService implements HttpInterceptor {
  isRefreshing = false;
  constructor(
      @Inject(HttpStateService) private httpStateService: HttpStateService
    ) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    if (request.url.includes("json")) {
      return next.handle(request);
    }
    const httpRequest = this.cloneRequest(request);

    /**
     * Only retry requests that are safe to repeat.
     *
     * This used to retry everything. A POST that succeeded slowly — or whose response was
     * lost — was sent up to three times, so one weigh-in could become three rows and one
     * logged session could inflate `training_count` threefold.
     */
    const retryCount = this.isIdempotent(httpRequest.method) ? 2 : 0;

    this.httpStateService.state.next({
      url: httpRequest.url,
      state: HttpProgressState.start,
    });

    return next.handle(httpRequest).pipe(
       timeout(30000),
       retry(retryCount),
       catchError((error) => {
        this.httpStateService.state.next({
          url: httpRequest.url,
          state: HttpProgressState.error,
          message: error.message,
        });
        throw error;
      }
      ),
      finalize(() => {
        this.httpStateService.state.next({
          url: httpRequest.url,
          state: HttpProgressState.end,
        });
      })
    );
  }

  cloneRequest(request: HttpRequest<unknown>) {
    return request.clone();
  }

  /** GET and HEAD can be repeated without changing server state; the write verbs cannot. */
  private isIdempotent(method: string): boolean {
    return method === 'GET' || method === 'HEAD';
  }
}
