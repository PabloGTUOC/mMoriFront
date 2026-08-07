import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/** The shape the panel needs; both catalogue item types satisfy it. */
export interface DiscoverableEntry {
  _id?: { $oid: string };
  name?: string;
  type?: string;
  description?: string;
  created_by_name?: string;
}

/**
 * "Search other users" — the deliberate route between per-user catalogues.
 *
 * Both catalogues behave identically here, so the panel is shared rather than written
 * twice with different nouns. It takes rows and emits intent; the state machine lives in
 * `CatalogueComponent`, which both hosts extend.
 *
 * Entries are attributed by display name and never by uid. A name describes a person; a
 * uid addresses an account, and publishing one lets anybody enumerate who exists.
 */
@Component({
  selector: 'app-catalogue-discovery',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="discovery" aria-labelledby="discovery-heading">
      <h3 id="discovery-heading">Search other users</h3>
      <p class="discovery-lead">
        Anything you import becomes a copy of your own. Changes the original author makes
        afterwards will not follow it.
      </p>

      <label class="discovery-search">
        <span class="sr-only">Search {{ itemLabel }}</span>
        <input
          type="search"
          [placeholder]="'Search ' + itemLabel + '…'"
          (input)="search.emit($any($event.target).value)"
        >
      </label>

      <p *ngIf="loading" class="discovery-status">Searching…</p>
      <p *ngIf="error" class="discovery-status discovery-status--error" role="alert">{{ error }}</p>

      <p *ngIf="!loading && !error && !entries.length" class="discovery-status">
        Nothing found. Either nobody else has added {{ itemLabel }} yet, or no name matches.
      </p>

      <ul *ngIf="entries.length" class="discovery-rows">
        <li *ngFor="let entry of entries; trackBy: trackByEntry" class="discovery-row">
          <div class="discovery-main">
            <span class="discovery-name">{{ entry.name }}</span>
            <span *ngIf="entry.type" class="discovery-meta">{{ entry.type }}</span>
            <span *ngIf="entry.created_by_name" class="discovery-author">
              by {{ entry.created_by_name }}
            </span>
          </div>

          <button
            type="button"
            class="discovery-import"
            [disabled]="importingId === entry._id?.$oid"
            [attr.aria-label]="'Import ' + entry.name"
            (click)="import.emit(entry)"
          >{{ importingId === entry._id?.$oid ? 'Importing…' : 'Import' }}</button>
        </li>
      </ul>
    </section>
  `,
  styleUrl: './catalogue-discovery.component.scss',
})
export class CatalogueDiscoveryComponent {
  @Input() entries: DiscoverableEntry[] = [];
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() importingId: string | null = null;
  @Input() itemLabel = 'entries';

  @Output() readonly search = new EventEmitter<string>();
  @Output() readonly import = new EventEmitter<DiscoverableEntry>();

  trackByEntry(index: number, entry: DiscoverableEntry): string {
    return entry._id?.$oid ?? entry.name ?? String(index);
  }
}
