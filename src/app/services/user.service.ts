import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import { catchError, distinctUntilChanged, filter, map, take, tap } from 'rxjs/operators';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import firebase from 'firebase/compat/app';
import { environment } from '../../environments/environment';
import {
  TrainingStatsResponse,
  UserDataResponse,
  WeightHistory,
  WeightResponse,
} from '../models';

/**
 * Whether the app yet knows if anyone is signed in.
 *
 * `pending` is the state that used to be missing. Session state previously started as
 * "logged out" and was only corrected after an interactive sign-in, so on every reload the
 * guards saw `false` and bounced a perfectly valid Firebase session to /log-in.
 */
export type SessionStatus = 'pending' | 'authenticated' | 'anonymous';

export interface Session {
  status: SessionStatus;
  userId: string | null;
  /** True when the user has no profile yet and must complete /first-time. */
  isNew: boolean;
}

const PENDING_SESSION: Session = { status: 'pending', userId: null, isNew: false };
const ANONYMOUS_SESSION: Session = { status: 'anonymous', userId: null, isNew: false };

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly sessionSource = new BehaviorSubject<Session>(PENDING_SESSION);

  /** The single source of truth for who is signed in. */
  readonly session$ = this.sessionSource.asObservable();

  /** Emits once the first Firebase auth state has been resolved. Guards wait on this. */
  readonly sessionReady$: Observable<Session> = this.session$.pipe(
    filter((session) => session.status !== 'pending'),
    take(1)
  );

  readonly logged: Observable<boolean> = this.session$.pipe(
    map((session) => session.status === 'authenticated'),
    distinctUntilChanged()
  );

  readonly isUserNew: Observable<boolean> = this.session$.pipe(
    map((session) => session.isNew),
    distinctUntilChanged()
  );

  readonly userId$: Observable<string | null> = this.session$.pipe(
    map((session) => session.userId),
    distinctUntilChanged()
  );

  private readonly apiUrl = environment.apiUrl;
  private readonly refreshTrigger = new Subject<void>();
  private initialization?: Promise<void>;

  constructor(
    private http: HttpClient,
    private afAuth: AngularFireAuth
  ) {}

  /**
   * Subscribes to Firebase auth state and resolves once the first value arrives.
   *
   * Wired to APP_INITIALIZER so no route is ever evaluated while the session is still
   * `pending`. The subscription then stays live, so a sign-out — from anywhere, including
   * another tab — flows back into `session$` without any component having to notice.
   */
  initializeSession(): Promise<void> {
    if (this.initialization) return this.initialization;

    this.initialization = new Promise<void>((resolve) => {
      let settled = false;
      const settle = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };

      this.afAuth.authState.subscribe({
        next: (user) => this.applyFirebaseUser(user).subscribe({ next: settle, error: settle }),
        error: (error) => {
          console.error('Could not resolve Firebase auth state', error);
          this.sessionSource.next(ANONYMOUS_SESSION);
          settle();
        },
      });
    });

    return this.initialization;
  }

  getUserId(): string | null {
    return this.sessionSource.value.userId;
  }

  /** Called by the onboarding form once a profile has been created. */
  setUserNewStatus(isNew: boolean): void {
    this.sessionSource.next({ ...this.sessionSource.value, isNew });
  }

  // API calls

  checkUserData(userId: string): Observable<UserDataResponse> {
    const params = new HttpParams().set('user_id', userId);
    return this.http.get<UserDataResponse>(`${this.apiUrl}/user_data/user_data`, { params });
  }

  getTrainingStats(userId: string): Observable<TrainingStatsResponse> {
    const params = new HttpParams().set('user_id', userId);
    return this.http.get<TrainingStatsResponse>(`${this.apiUrl}/trainings/training-stats`, { params });
  }

  getLatestWeight(userId: string): Observable<WeightResponse> {
    const params = new HttpParams().set('user_id', userId);
    return this.http.get<WeightResponse>(`${this.apiUrl}/weight_updates/latest_weight`, { params });
  }

  /** The full weigh-in series, for the weight history chart. */
  getWeightHistory(userId: string): Observable<WeightHistory[]> {
    const params = new HttpParams().set('user_id', userId);
    return this.http
      .get<{ success: boolean; data?: WeightHistory[] }>(
        `${this.apiUrl}/weight_updates/history`,
        { params }
      )
      .pipe(map((response) => response.data ?? []));
  }

  get refreshTrigger$(): Observable<void> {
    return this.refreshTrigger.asObservable();
  }

  /** Asks the dashboard to reload after the user logs something. */
  triggerRefresh(): void {
    this.refreshTrigger.next();
  }

  /**
   * Turns a Firebase user into a resolved session, looking up whether they have a profile.
   *
   * A failed lookup resolves to `isNew: false` on purpose: treating an unreachable API as
   * "new user" would send an existing user back through onboarding and create a duplicate
   * profile snapshot. Showing an empty dashboard is the recoverable failure.
   */
  private applyFirebaseUser(user: firebase.User | null): Observable<void> {
    if (!user) {
      this.sessionSource.next(ANONYMOUS_SESSION);
      return of(undefined);
    }

    const userId = user.uid;

    return this.checkUserData(userId).pipe(
      map((response) => !response.success),
      catchError((error) => {
        console.error('Could not check user profile; assuming an existing user', error);
        return of(false);
      }),
      tap((isNew) => this.sessionSource.next({ status: 'authenticated', userId, isNew })),
      map(() => undefined)
    );
  }
}
