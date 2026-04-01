import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly activeRequests = signal(0);
  readonly isLoading = computed(() => this.activeRequests() > 0);

  show(): void {
    this.activeRequests.update(v => v + 1);
  }

  hide(): void {
    this.activeRequests.update(v => Math.max(0, v - 1));
  }
}
