import { Component, Input } from '@angular/core';
import {DomSanitizer, SafeResourceUrl} from "@angular/platform-browser";

@Component({
  selector: 'app-stretch-item',
  standalone: true,
  imports: [],
  templateUrl: './stretch-item.component.html',
  styleUrl: './stretch-item.component.scss'
})
export class StretchItemComponent {
  @Input() stretch: any;

  constructor(private sanitizer: DomSanitizer) {}

  sanitizeUrl(videoUrl: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      videoUrl.replace('watch?v=', 'embed/')
    );
  }
}
