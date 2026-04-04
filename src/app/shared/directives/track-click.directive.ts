import { Directive, HostListener, input } from '@angular/core';
import { AnalyticsService } from '../../core/services/analytics.service';

@Directive({
  selector: '[trackClick]',
  standalone: true,
})
export class TrackClickDirective {
  trackClick = input.required<string>();
  trackProps = input<Record<string, unknown>>();

  constructor(private readonly analytics: AnalyticsService) {}

  @HostListener('click')
  onClick(): void {
    this.analytics.track(this.trackClick(), this.trackProps());
  }
}
