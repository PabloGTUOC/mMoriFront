import { Component, DestroyRef, OnInit, inject } from '@angular/core';
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
})
export class DisplayDailyComponent implements OnInit {
  currentAge: number = 0;
  weeksLeftToLive: number = 0;
  weight: number = 0;
  totalDaysTrained: number = 0;
  percentageDaysTrained: number = 0;
  bmi: number = 0;
  bmiStatus: string = 'Normal Weight';
  weeksGone: number = 0;
  isChartVisible: boolean = false;
  weightHistory: WeightHistory[] = [];
  loading = false;
  error: string | null = null;
  hasProfile = true;

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
    this.loading = true;
    this.error = null;
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
          this.loading = false;
          this.weightHistory = weightHistory;
          this.hasProfile = !!userData.success;
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
          this.loading = false;
          this.error = 'Could not load your dashboard. Please try again.';
        },
      });
  }

  updateFields(
    userData: UserData,
    adjustedLifeExpectancy: number,
    trainingStats: TrainingStatsResponse,
    latestWeight: WeightResponse
  ): void {
    this.currentAge = this.metrics.calculateAge(new Date(userData.dob));
    // Check if latestWeight is available, if not, use the weight from userData
    if (latestWeight && latestWeight.weight) {
      this.weight = latestWeight.weight;
    } else {
      this.weight = userData.weight;
    }
    this.totalDaysTrained = trainingStats.training_count;
    this.weeksLeftToLive = this.metrics.calculateWeeksLeftToLive(adjustedLifeExpectancy, this.currentAge);
    this.bmi = this.metrics.calculateBMI(this.weight, userData.height);
    this.bmiStatus = this.metrics.determineBMIStatus(this.bmi);
    const totalDaysSinceJoining = trainingStats.total_days_since_joining;
    this.percentageDaysTrained = this.metrics.calculatePercentage(this.totalDaysTrained, totalDaysSinceJoining);
    this.weeksGone = this.metrics.calculateWeeksGone(this.currentAge);
  }

  toggleLifeExpectancyChart () {
    this.isChartVisible = !this.isChartVisible;
  }
}
