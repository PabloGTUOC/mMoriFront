import { Component, Input } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Stretch } from '../models';

@Component({
  selector: 'app-stretch-item',
  standalone: true,
  imports: [],
  templateUrl: './stretch-item.component.html',
  styleUrl: './stretch-item.component.scss'
})
export class StretchItemComponent {
  @Input({ required: true }) stretch!: Stretch;

  constructor(private sanitizer: DomSanitizer) {}

  // `video_link` is optional — catalogue entries created before the field existed have
  // none. NOTE: this still trusts a user-supplied URL verbatim; replacing the bypass with
  // real host validation is plan item 4.3.
  sanitizeUrl(videoUrl: string | undefined): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      videoUrl ? videoUrl.replace('watch?v=', 'embed/') : ''
    );
  }
}
