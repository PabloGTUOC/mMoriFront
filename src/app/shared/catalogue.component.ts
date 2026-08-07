import { Directive, OnInit, signal } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Observable } from 'rxjs';

/**
 * Shared behaviour for the training and stretch catalogues.
 *
 * The two components were near-identical: fetch a list, render it, toggle an add form,
 * submit, refetch — the same twelve lines written twice with different nouns
 * (FRONTEND_IMPROVEMENT_PLAN.md 5.3). Only three things actually differ, and those are the
 * abstract members below.
 *
 * A base class rather than a generic catalogue component with content projection: the two
 * views render different item components and different form fields, so projecting all of
 * that would cost more ceremony than it saves. Subclasses keep their own template and their
 * own injected service, and inherit the state machine.
 *
 * `@Directive()` with no selector is Angular's marker for an abstract base with lifecycle
 * hooks — without it the compiler will not accept `ngOnInit` on an inherited class.
 */
@Directive()
export abstract class CatalogueComponent<TItem, TPayload> implements OnInit {
  /**
   * Signals rather than plain fields, so subclasses can run OnPush (5.5): writing to a
   * signal marks the view dirty, where assigning a field under OnPush would leave a
   * completed request invisible on screen.
   */
  readonly items = signal<TItem[]>([]);
  readonly loading = signal(false);
  /** Surfaced in the template so a failed fetch is visible instead of console-only. */
  readonly error = signal<string | null>(null);
  readonly showAddForm = signal(false);
  form!: FormGroup;

  /**
   * Discovery state.
   *
   * Catalogues used to be global — one list everyone saw and wrote to. They are per-user
   * now, so reaching anyone else's is a deliberate act: open the panel, search, import.
   * What is imported is a copy, so the original author changing theirs cannot reach yours.
   */
  readonly showDiscovery = signal(false);
  readonly discovered = signal<TItem[]>([]);
  readonly discovering = signal(false);
  readonly discoveryError = signal<string | null>(null);
  readonly importing = signal<string | null>(null);

  /** Fetches the catalogue. The service unwraps the envelope, so this is a plain array. */
  protected abstract fetch(): Observable<TItem[]>;

  /** Everyone else's entries, optionally filtered by a search term. */
  protected abstract discover(term: string): Observable<TItem[]>;

  /** Copies someone else's entry into this user's catalogue. */
  protected abstract importEntry(id: string): Observable<unknown>;

  /** Removes one of this user's own entries. */
  protected abstract remove(id: string): Observable<unknown>;

  /** Creates one entry. The response is ignored; the list is refetched instead. */
  protected abstract create(payload: TPayload): Observable<unknown>;

  protected abstract buildForm(): FormGroup;

  /** Used in the "nothing here yet" message and the add button. */
  abstract readonly itemLabel: string;

  ngOnInit(): void {
    this.form = this.buildForm();
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.fetch().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: (error) => {
        console.error(`Error fetching ${this.itemLabel}`, error);
        this.error.set(`Could not load ${this.itemLabel}. Please try again.`);
        this.loading.set(false);
      },
    });
  }

  toggleAddForm(): void {
    this.showAddForm.update((open) => !open);
    if (!this.showAddForm()) this.form.reset();
  }

  submit(): void {
    if (this.form.invalid) return;

    this.create(this.form.value as TPayload).subscribe({
      next: () => {
        this.showAddForm.set(false);
        this.form.reset();
        this.load();
      },
      error: (error) => {
        console.error(`Error adding ${this.itemLabel}`, error);
        this.error.set('Could not save. Please check the form and try again.');
      },
    });
  }

  toggleDiscovery(): void {
    this.showDiscovery.update((open) => !open);
    if (this.showDiscovery()) {
      this.search('');
    } else {
      this.discovered.set([]);
      this.discoveryError.set(null);
    }
  }

  search(term: string): void {
    this.discovering.set(true);
    this.discoveryError.set(null);

    this.discover(term).subscribe({
      next: (items) => {
        this.discovered.set(items);
        this.discovering.set(false);
      },
      error: (error) => {
        console.error(`Error searching ${this.itemLabel}`, error);
        this.discoveryError.set('Could not search right now. Please try again.');
        this.discovering.set(false);
      },
    });
  }

  /**
   * Imports one entry, then drops it from the results.
   *
   * Removing it locally rather than refetching: discovery excludes your own entries, so a
   * refetch would produce the same list minus one row anyway, and a request per import is a
   * lot of network for a list someone is clicking through.
   */
  importItem(item: TItem): void {
    const id = (item as { _id?: { $oid: string } })._id?.$oid;
    if (!id || this.importing()) return;

    this.importing.set(id);

    this.importEntry(id).subscribe({
      next: () => {
        this.importing.set(null);
        this.discovered.update((items) =>
          items.filter((other) => (other as { _id?: { $oid: string } })._id?.$oid !== id)
        );
        this.load();
      },
      error: (error) => {
        console.error(`Error importing ${this.itemLabel}`, error);
        this.importing.set(null);
        this.discoveryError.set('Could not import that one. Please try again.');
      },
    });
  }

  deleteItem(item: TItem): void {
    const id = (item as { _id?: { $oid: string } })._id?.$oid;
    if (!id) return;

    this.remove(id).subscribe({
      next: () => this.load(),
      error: (error) => {
        console.error(`Error removing ${this.itemLabel}`, error);
        this.error.set('Could not remove that one. Please try again.');
      },
    });
  }

  /** Keeps DOM nodes stable across refetches instead of rebuilding the whole list. */
  trackById(index: number, item: TItem): string {
    const candidate = item as { _id?: { $oid: string }; name?: string };
    return candidate._id?.$oid ?? candidate.name ?? String(index);
  }
}
