import { Component } from '@angular/core';
import { DisplayDailyComponent } from '../display-daily/display-daily.component';
import { InputDailyComponent } from '../input-daily/input-daily.component';

/**
 * The "Today" route: the dashboard plus the daily input form.
 *
 * Exists so the two components that make up that view can be lazily loaded as one unit —
 * previously they were rendered side by side from `MainPageComponent`'s `*ngIf` ladder.
 */
@Component({
  selector: 'app-daily-view',
  standalone: true,
  imports: [DisplayDailyComponent, InputDailyComponent],
  template: `
    <app-display-daily></app-display-daily>
    <app-input-daily></app-input-daily>
  `,
})
export class DailyViewComponent {}
