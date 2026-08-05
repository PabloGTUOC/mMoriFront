import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { UserService } from '../services/user.service';
import { MetricsService } from '../services/metrics.service';
import { forkJoin } from 'rxjs';
import { filter, switchMap, take } from 'rxjs/operators';
import { LifeExpectancyChartComponent } from '../life-expectancy-chart/life-expectancy-chart.component';


@Component({
  selector: 'app-display-daily',
  standalone: true,
  imports: [LifeExpectancyChartComponent, CommonModule],
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
    this.userService.userId$
      .pipe(
        filter((userId): userId is string => userId !== null),
        take(1),
        switchMap((userId) =>
          forkJoin({
            userData: this.userService.checkUserData(userId),
            trainingStats: this.userService.getTrainingStats(userId),
            latestWeight: this.userService.getLatestWeight(userId),
          })
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response: any) => {
          const { userData, trainingStats, latestWeight } = response;
          if (userData.success) {
            this.updateFields(
              userData.user_data,
              userData.adjusted_life_expectancy,
              trainingStats,
              latestWeight
            );
          } else {
            console.warn('No user data found');
          }
        },
        error: (error: any) => console.error('Error loading dashboard', error),
      });
  }

  updateFields(userData: any, adjustedLifeExpectancy:number, trainingStats: any, latestWeight: any): void {
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
