// src/app/training-item/training-item.component.ts
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TrainingRepositoryEntry } from '../models';

@Component({
  selector: 'app-training-item',
  standalone: true,
  templateUrl: './training-item.component.html',
  styleUrls: ['./training-item.component.scss'],
  // Pure @Input; nothing to check beyond input changes.
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingItemComponent {
  @Input({ required: true }) training!: TrainingRepositoryEntry;
}
