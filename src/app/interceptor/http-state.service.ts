import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

export enum HttpProgressState {
  start,
  end,
  error
}

export interface IHttpState {
  url: string;
  state: HttpProgressState;
  message?: string;
}

@Injectable({
  providedIn: "root",
})
export class HttpStateService {
  public state = new BehaviorSubject<IHttpState>({} as IHttpState);

  constructor() {}
}
