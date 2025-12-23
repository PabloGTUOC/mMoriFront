import {Component, OnInit, ViewChild,} from '@angular/core';
import {CommonModule} from "@angular/common";
import {UserService} from "../services/user.service";
import {forkJoin, switchMap} from "rxjs";
import {LifeExpectancyChartComponent} from "../life-expectancy-chart/life-expectancy-chart.component";


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
  IBM: number = 0;
  bmiStatus: string = "Normal Weight";
  weaksLeft: number = 0;
  isChartVisible: boolean = false;

  @ViewChild(DisplayDailyComponent) displayDailyComponent!: DisplayDailyComponent;

  constructor(
    private userService: UserService,
  ) {}
  ngOnInit() {
    this.userService.userId$.pipe(
      switchMap(userId => {
        if (userId) {
          return forkJoin({
            userData: this.userService.checkUserData(userId),
            trainingStats: this.userService.getTrainingStats(userId),
            latestWeight: this.userService.getLatestWeight(userId)
          });
        } else {
          throw new Error('User ID is not available')
        }
      })
    ).subscribe({
      next: (response: any) => {
        console.log('User data check response:', response);
        const { userData,trainingStats, latestWeight } = response;
        if (userData.success) {
          this.updateFields(userData.user_data, userData.adjusted_life_expectancy, trainingStats, latestWeight);
        } else {
          console.log('No user data found')
        }
      }, error: (error: any) => console.log('Error checking user data', error)
    });
    this.userService.refreshTrigger$.subscribe(() =>{
      this.ngOnInit();
    });
  }

  updateFields(userData: any, adjustedLifeExpectancy:number, trainingStats: any, latestWeight: any): void {
    this.currentAge = this.calculateAge(new Date(userData.dob));
    // Check if latestWeight is available, if not, use the weight from userData
    if (latestWeight && latestWeight.weight) {
      this.weight = latestWeight.weight;
    } else {
      this.weight = userData.weight;
    }
    this.totalDaysTrained = trainingStats.training_count; // You can update this with actual data if available
    this.weeksLeftToLive = this.calculateWeeksLeftToLive(adjustedLifeExpectancy, this.currentAge);
    this.IBM = this.calculateBMI(this.weight, userData.height);
    this.bmiStatus = this.determineBMIStatus(this.IBM)
    const totalDaysSinceJoining = trainingStats.total_days_since_joining;
    this.percentageDaysTrained = this.calculatePercentage(this.totalDaysTrained, totalDaysSinceJoining);
    this.weaksLeft = this.calculateWeeksGone(this.currentAge);
  }

  calculatePercentage(trainedDays: number, totalDays: number): number {
    return totalDays > 0 ? parseFloat(((trainedDays / totalDays) * 100).toFixed(2)) : 0;
  }

  calculateAge(dob: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }
  calculateWeeksLeftToLive(adjustedLifeExpectancy: number, currentAge: number): number {
    const yearsLeft = adjustedLifeExpectancy - currentAge;
    return yearsLeft > 0 ? Math.round(yearsLeft * 52) : 0; // Convert years to weeks and round to nearest whole number
  }

  calculateWeeksGone(currentAge: number): number {
    return currentAge > 0 ? Math.round(currentAge * 52) : 0;
  }

  calculateBMI(weight: number, height: number): number {
    const heightInMeters = height / 100; // Convert height from cm to meters
    const IBM = weight / (heightInMeters * heightInMeters);
    return parseFloat(IBM.toFixed(2)); // Round to 2 decimal places and convert back to number
  }

  determineBMIStatus(IBM: number): string {
    if (IBM < 18.5) {
      return 'Underweight';
    } else if (IBM >= 18.5 && IBM < 24.9) {
      return 'Normal Weight';
    } else if (IBM >= 25 && IBM < 29.9) {
      return 'Overweight';
    } else {
      return 'Obese';
    }
  }

  toggleLifeExpectancyChart () {
    this.isChartVisible = !this.isChartVisible;
  }
}
