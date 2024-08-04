import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from "@angular/common/http";
import { Inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { catchError, delay, finalize, retry, timeout,  } from "rxjs/operators";
import { HttpProgressState, HttpStateService } from "./http-state.service";
import { time } from "console";

@Injectable({
  providedIn: "root",
})
export class HttpInterceptorService implements HttpInterceptor {
  isRefreshing = false;
  constructor(
      @Inject(HttpStateService) private httpStateService: HttpStateService
    ) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    if (request.url.includes("json")) {
      return next.handle(request);
    }
    const httpRequest = this.cloneRequest(request);   

    this.httpStateService.state.next({
      url: httpRequest.url,
      state: HttpProgressState.start,
    });

    return next.handle(httpRequest).pipe(
       delay(1000),
       timeout(30000),
       retry(2),
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

  cloneRequest(request: HttpRequest<any>) {
    return request.clone();
  }
}
