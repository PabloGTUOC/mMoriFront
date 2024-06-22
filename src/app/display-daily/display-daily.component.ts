import { Component } from '@angular/core';

@Component({
  selector: 'app-display-daily',
  standalone: true,
  imports: [],
  templateUrl: './display-daily.component.html',
  styleUrl: './display-daily.component.css'
})
export class DisplayDailyComponent {
  currentAge: number;
  weeksLeftToLive: number;
  weight: number;
  totalDaysTrained: number;
  percentageDaysTrained: number;

  constructor() {
    this.currentAge = 0;
    this.weeksLeftToLive = 0;
    this.weight = 0;
    this.totalDaysTrained = 0;
    this.percentageDaysTrained = 0;
  }

}
