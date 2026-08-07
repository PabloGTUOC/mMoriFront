import { ChangeDetectionStrategy, Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { TrainingRepositoryService } from '../services/training-repository.service';
import { StretchRepositoryService } from '../services/stretch-repository.service';
import {
  CatalogueDiscoveryComponent,
  DiscoverableEntry,
} from '../shared/catalogue-discovery.component';

/**
 * The second step of signing up: fill your catalogue from other people's.
 *
 * Catalogues are per-user, so a new account starts with nothing in either — and an empty
 * training picker on the daily form is a bad first impression of an app you have just
 * finished describing yourself to. Showing the pool here means the first thing a new user
 * does is take what is already useful rather than type it out.
 *
 * Importing is optional and skippable. Nothing here blocks getting to the dashboard.
 */
@Component({
  selector: 'app-onboarding-catalogue',
  standalone: true,
  imports: [CommonModule, CatalogueDiscoveryComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-catalogue-discovery
      [entries]="entries()"
      [loading]="loading()"
      [error]="error()"
      [importingId]="importing()"
      [itemLabel]="itemLabel"
      (search)="search($event)"
      (import)="importOne($event)"
    ></app-catalogue-discovery>
  `,
})
export class OnboardingCatalogueComponent implements OnInit {
  /** Which catalogue this instance browses. */
  @Input({ required: true }) mode!: 'trainings' | 'stretches';

  readonly entries = signal<DiscoverableEntry[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly importing = signal<string | null>(null);

  constructor(
    private trainings: TrainingRepositoryService,
    private stretches: StretchRepositoryService
  ) {}

  get itemLabel(): string {
    return this.mode;
  }

  ngOnInit(): void {
    this.search('');
  }

  search(term: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.discover(term).subscribe({
      next: (items) => {
        this.entries.set(items as DiscoverableEntry[]);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        console.error(`Could not search ${this.mode}`, error);
        this.error.set('Could not search right now. You can do this later from the menu.');
        this.loading.set(false);
      },
    });
  }

  importOne(entry: DiscoverableEntry): void {
    const id = entry._id?.$oid;
    if (!id || this.importing()) return;

    this.importing.set(id);

    this.importOneById(id).subscribe({
      next: () => {
        this.importing.set(null);
        // Drop it from the list rather than refetching: discovery excludes what you own,
        // so a refetch returns the same rows minus this one.
        this.entries.update((items) => items.filter((item) => item._id?.$oid !== id));
      },
      error: (error: unknown) => {
        console.error(`Could not import ${this.mode}`, error);
        this.importing.set(null);
        this.error.set('Could not import that one. Please try again.');
      },
    });
  }

  private discover(term: string): Observable<unknown[]> {
    return this.mode === 'trainings'
      ? this.trainings.discoverTrainingRepository(term)
      : this.stretches.discoverStretches(term);
  }

  private importOneById(id: string): Observable<unknown> {
    return this.mode === 'trainings'
      ? this.trainings.importTrainingRepositoryEntry(id)
      : this.stretches.importStretch(id);
  }
}
