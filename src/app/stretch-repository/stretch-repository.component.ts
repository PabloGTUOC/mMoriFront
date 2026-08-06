import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { StretchRepositoryService } from '../services/stretch-repository.service';
import { StretchItemComponent } from '../stretch-item/stretch-item.component';
import { CatalogueComponent } from '../shared/catalogue.component';
import { Stretch, StretchPayload } from '../models';

/**
 * The shared stretch catalogue. See `CatalogueComponent` for the behaviour this inherits.
 *
 * The video link pattern only checks the shape of the URL; the real check — that it is a
 * YouTube link — happens in `youtube.ts` and again on the server, since the catalogue is
 * global and a link saved here is framed for every user.
 */
@Component({
  selector: 'app-stretch-repository',
  standalone: true,
  // State lives in signals on CatalogueComponent, so OnPush is safe here.
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stretch-repository.component.html',
  styleUrl: './stretch-repository.component.scss',
  imports: [CommonModule, StretchItemComponent, ReactiveFormsModule],
})
export class StretchRepositoryComponent extends CatalogueComponent<Stretch, StretchPayload> {
  override readonly itemLabel = 'stretches';

  constructor(
    private stretchService: StretchRepositoryService,
    private fb: FormBuilder
  ) {
    super();
  }

  protected override fetch(): Observable<Stretch[]> {
    return this.stretchService.getStretches();
  }

  protected override create(payload: StretchPayload): Observable<unknown> {
    return this.stretchService.addNewStretch(payload);
  }

  protected override buildForm(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      video_link: ['', [Validators.required, Validators.pattern('https?://.+')]],
    });
  }
}
