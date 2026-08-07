import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { UserService } from '../services/user.service';
import { MetricsService } from '../services/metrics.service';
import { forkJoin } from 'rxjs';
import { filter, switchMap, take } from 'rxjs/operators';
import { LifeExpectancyChartComponent } from '../life-expectancy-chart/life-expectancy-chart.component';
import { WeightHistoryChartComponent } from '../components/weight-history-chart/weight-history-chart.component';
import {
  TrainingStatsResponse,
  UserData,
  WeightHistory,
  WeightResponse,
} from '../models';


@Component({
  selector: 'app-display-daily',
  standalone: true,
  imports: [LifeExpectancyChartComponent, WeightHistoryChartComponent, CommonModule, A11yModule],
  templateUrl: './display-daily.component.html',
  styleUrl: './display-daily.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisplayDailyComponent implements OnInit {
  /*
   * Signals, not plain fields.
   *
   * The dashboard would load its data and never leave the "Loading…" state. Everything here
   * hangs off `afAuth.authState`, and AngularFire's compat layer emits outside the Angular
   * zone — so the switchMap into forkJoin, and the subscribe callback that assigns these,
   * ran outside it too. The values arrived; change detection was never told.
   *
   * Signals notify Angular themselves regardless of which zone the write happened in, which
   * is also what makes the OnPush strategy above safe (TODO.md item 2.1).
   */
  readonly currentAge = signal(0);
  readonly weeksLeftToLive = signal(0);
  readonly weight = signal(0);
  readonly totalDaysTrained = signal(0);
  readonly percentageDaysTrained = signal(0);
  readonly bmi = signal(0);
  readonly bmiStatus = signal('Normal Weight');
  readonly weeksGone = signal(0);
  readonly isChartVisible = signal(false);
  readonly weightHistory = signal<WeightHistory[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly hasProfile = signal(true);

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private userService: UserService,
    private metrics: MetricsService
  ) {}

  /**
   * Subscribes to the refresh trigger exactly once.
   *
   * This previously read `refreshTrigger$.subscribe(() => this.ngOnInit())` from inside
   * `ngOnInit`, so every refresh added another trigger subscription on top of the existing
   * ones: logging a training went 1 → 2 → 4 → 8 requests. The reload is now a separate
   * method, and both streams are torn down with the component.
   */
  ngOnInit(): void {
    this.loadDashboard();

    this.userService.refreshTrigger$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadDashboard());
  }

  private loadDashboard(): void {
    this.loading.set(true);
    this.error.set(null);
    // Waits for an authenticated session so the interceptor has a token to attach; the
    // requests themselves no longer name a user.
    this.userService.session$
      .pipe(
        filter((session) => session.status === 'authenticated'),
        take(1),
        switchMap(() =>
          forkJoin({
            userData: this.userService.checkUserData(),
            trainingStats: this.userService.getTrainingStats(),
            latestWeight: this.userService.getLatestWeight(),
            weightHistory: this.userService.getWeightHistory(),
          })
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ userData, trainingStats, latestWeight, weightHistory }) => {
          this.loading.set(false);
          this.weightHistory.set(weightHistory);
          this.hasProfile.set(!!userData.success);
          // `user_data` is optional on the response even when `success` is true, so it is
          // checked here rather than asserted — see UserDataResponse.
          if (userData.success && userData.user_data) {
            this.updateFields(
              userData.user_data,
              userData.adjusted_life_expectancy ?? 0,
              trainingStats,
              latestWeight
            );
          } else {
            console.warn('No user data found');
          }
        },
        error: (error: unknown) => {
          console.error('Error loading dashboard', error);
          this.loading.set(false);
          this.error.set('Could not load your dashboard. Please try again.');
        },
      });
  }

  updateFields(
    userData: UserData,
    adjustedLifeExpectancy: number,
    trainingStats: TrainingStatsResponse,
    latestWeight: WeightResponse
  ): void {
    const age = this.metrics.calculateAge(new Date(userData.dob));
    this.currentAge.set(age);

    // Check if latestWeight is available, if not, use the weight from userData
    const weight = latestWeight?.weight ? latestWeight.weight : userData.weight;
    this.weight.set(weight);

    this.totalDaysTrained.set(trainingStats.training_count);
    this.weeksLeftToLive.set(this.metrics.calculateWeeksLeftToLive(adjustedLifeExpectancy, age));

    const bmi = this.metrics.calculateBMI(weight, userData.height);
    this.bmi.set(bmi);
    this.bmiStatus.set(this.metrics.determineBMIStatus(bmi));

    this.percentageDaysTrained.set(
      this.metrics.calculatePercentage(
        trainingStats.training_count,
        trainingStats.total_days_since_joining
      )
    );
    this.weeksGone.set(this.metrics.calculateWeeksGone(age));
  }

  toggleLifeExpectancyChart() {
    this.isChartVisible.update((visible) => !visible);
  }

  /**
   * Closes the life chart only when the backdrop itself was clicked.
   *
   * Comparing target to currentTarget keeps the panel from needing its own
   * `stopPropagation` handler — a click anywhere inside the dialog, including on the grid,
   * has a target deeper than the backdrop and is ignored.
   */
  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.toggleLifeExpectancyChart();
    }
  }
}
