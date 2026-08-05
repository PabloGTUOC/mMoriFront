import { Directive, OnInit } from '@angular/core';
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
  items: TItem[] = [];
  loading = false;
  /** Surfaced in the template so a failed fetch is visible instead of console-only. */
  error: string | null = null;
  showAddForm = false;
  form!: FormGroup;

  /** Fetches the catalogue. The service unwraps the envelope, so this is a plain array. */
  protected abstract fetch(): Observable<TItem[]>;

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
    this.loading = true;
    this.error = null;

    this.fetch().subscribe({
      next: (items) => {
        this.items = items;
        this.loading = false;
      },
      error: (error) => {
        console.error(`Error fetching ${this.itemLabel}`, error);
        this.error = `Could not load ${this.itemLabel}. Please try again.`;
        this.loading = false;
      },
    });
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) this.form.reset();
  }

  submit(): void {
    if (this.form.invalid) return;

    this.create(this.form.value as TPayload).subscribe({
      next: () => {
        this.showAddForm = false;
        this.form.reset();
        this.load();
      },
      error: (error) => {
        console.error(`Error adding ${this.itemLabel}`, error);
        this.error = `Could not save. Please check the form and try again.`;
      },
    });
  }

  /** Keeps DOM nodes stable across refetches instead of rebuilding the whole list. */
  trackById(index: number, item: TItem): string {
    const candidate = item as { _id?: { $oid: string }; name?: string };
    return candidate._id?.$oid ?? candidate.name ?? String(index);
  }
}
