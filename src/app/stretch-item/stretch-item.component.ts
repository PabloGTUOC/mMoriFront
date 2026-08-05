import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Stretch } from '../models';
import { extractYouTubeVideoId, youTubeEmbedUrl } from '../shared/youtube';

@Component({
  selector: 'app-stretch-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stretch-item.component.html',
  styleUrl: './stretch-item.component.scss'
})
export class StretchItemComponent {
  @Input({ required: true }) stretch!: Stretch;

  constructor(private sanitizer: DomSanitizer) {}

  /**
   * The iframe source, or null when the stored link is not a recognisable YouTube URL.
   *
   * `bypassSecurityTrustResourceUrl` is still used — an iframe src cannot be bound without
   * it — but it is now applied to a URL this method *constructs* from a validated 11-char
   * video id, never to user input. The previous `sanitizeUrl` did the opposite of its name.
   */
  embedUrl(): SafeResourceUrl | null {
    const videoId = extractYouTubeVideoId(this.stretch?.video_link);
    return videoId ? this.sanitizer.bypassSecurityTrustResourceUrl(youTubeEmbedUrl(videoId)) : null;
  }
}
