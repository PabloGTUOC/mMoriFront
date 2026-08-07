import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { filter, switchMap, take } from 'rxjs/operators';
import { UserService } from '../services/user.service';
import { ThoughtsService } from '../services/thoughts.service';
import { NotificationService } from '../services/notification.service';
import { MoodHistoryEntry, Training, WeightHistory } from '../models';

/**
 * Everything logged so far, and the only place it can be removed.
 *
 * Two gaps meet here. Mood was write-only — the app asked how you felt every day, stored
 * it, and had no endpoint to read it back — and `/trainings/all-trainings` had existed
 * since the first backend with nothing ever calling it. Neither needed new data; both
 * needed a screen.
 *
 * Deletion lives here rather than on the dashboard because correcting the record is a
 * separate act from logging today, and mixing them invites deleting something by accident
 * while trying to add.
 */
@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryComponent implements OnInit {
  readonly trainings = signal<Training[]>([]);
  readonly weights = signal<WeightHistory[]>([]);
  readonly moods = signal<MoodHistoryEntry[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /** The row currently awaiting confirmation, keyed by its id. */
  readonly pendingDelete = signal<string | null>(null);

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private userService: UserService,
    private thoughts: ThoughtsService,
    private notifications: NotificationService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.userService.session$
      .pipe(
        filter((session) => session.status === 'authenticated'),
        take(1),
        switchMap(() =>
          forkJoin({
            trainings: this.userService.getAllTrainings(),
            weights: this.userService.getWeightHistory(),
            moods: this.thoughts.getMoodHistory(),
          })
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ trainings, weights, moods }) => {
          this.loading.set(false);
          // Newest first: the thing you just logged is the thing you are most likely to
          // want to correct. The two API series arrive oldest-first.
          this.trainings.set([...trainings].reverse());
          this.weights.set([...weights].reverse());
          this.moods.set(moods);
        },
        error: (error: unknown) => {
          console.error('Could not load history', error);
          this.loading.set(false);
          this.error.set('Could not load your history. Please try again.');
        },
      });
  }

  /** Deletion is irreversible and there is no undo, so it takes two clicks. */
  askToDelete(id: string): void {
    this.pendingDelete.set(id);
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  confirmDeleteTraining(training: Training): void {
    const id = training._id?.$oid;
    if (!id) return;

    this.userService
      .deleteTraining(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.trainings.update((rows) => rows.filter((row) => row._id?.$oid !== id));
          this.pendingDelete.set(null);
          this.notifications.success('Training removed.');
          // The dashboard's "days trained" counts these, so it is now stale.
          this.userService.triggerRefresh();
        },
        error: (error: unknown) => {
          console.error('Could not delete training', error);
          this.pendingDelete.set(null);
          this.notifications.error('Could not remove that training. Please try again.');
        },
      });
  }

  confirmDeleteWeight(entry: WeightHistory): void {
    const id = entry._id?.$oid;
    if (!id) return;

    this.userService
      .deleteWeightUpdate(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.weights.update((rows) => rows.filter((row) => row._id?.$oid !== id));
          this.pendingDelete.set(null);
          this.notifications.success('Weigh-in removed.');
          this.userService.triggerRefresh();
        },
        error: (error: unknown) => {
          console.error('Could not delete weigh-in', error);
          this.pendingDelete.set(null);
          this.notifications.error('Could not remove that weigh-in. Please try again.');
        },
      });
  }

  trackByTraining(_index: number, item: Training): string {
    return item._id?.$oid ?? `${item.training_date}-${item.training_type}`;
  }

  trackByWeight(_index: number, item: WeightHistory): string {
    return item._id?.$oid ?? item.date;
  }

  trackByMood(_index: number, item: MoodHistoryEntry): string {
    return item.date;
  }
}
