import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { TrainingRepositoryService } from '../services/training-repository.service';
import { TrainingItemComponent } from '../training-item/training-item.component';
import { CatalogueComponent } from '../shared/catalogue.component';
import { CatalogueDiscoveryComponent } from '../shared/catalogue-discovery.component';
import { TrainingRepositoryEntry, TrainingRepositoryPayload } from '../models';

/**
 * The shared training catalogue. Fetching, form toggling, submitting and refetching all
 * come from `CatalogueComponent`; only the three abstract members below are specific.
 */
@Component({
  selector: 'app-training-repository',
  standalone: true,
  // State lives in signals on CatalogueComponent, so OnPush is safe here.
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './training-repository.component.html',
  styleUrls: ['./training-repository.component.scss'],
  imports: [CommonModule, TrainingItemComponent, ReactiveFormsModule, CatalogueDiscoveryComponent],
})
export class TrainingRepositoryComponent extends CatalogueComponent<
  TrainingRepositoryEntry,
  TrainingRepositoryPayload
> {
  override readonly itemLabel = 'trainings';

  constructor(
    private trainingRepositoryService: TrainingRepositoryService,
    private fb: FormBuilder
  ) {
    super();
  }

  protected override fetch(): Observable<TrainingRepositoryEntry[]> {
    return this.trainingRepositoryService.getTrainingRepository();
  }

  protected override create(payload: TrainingRepositoryPayload): Observable<unknown> {
    return this.trainingRepositoryService.addNewTraining(payload);
  }

  protected override discover(term: string): Observable<TrainingRepositoryEntry[]> {
    return this.trainingRepositoryService.discoverTrainingRepository(term);
  }

  protected override importEntry(id: string): Observable<unknown> {
    return this.trainingRepositoryService.importTrainingRepositoryEntry(id);
  }

  protected override remove(id: string): Observable<unknown> {
    return this.trainingRepositoryService.deleteTrainingRepositoryEntry(id);
  }

  protected override buildForm(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      type: ['', Validators.required],
      duration: ['', [Validators.required, Validators.min(1)]],
      calories: ['', [Validators.required, Validators.min(1)]],
      description: ['', Validators.required],
    });
  }
}
