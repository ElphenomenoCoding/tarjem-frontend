import { Component, inject } from '@angular/core';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  template: `
    @if (loading.isLoading()) {
      <div class="loading-overlay">
        <div class="spinner">
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
        </div>
      </div>
    }
  `,
  styles: [`
    .loading-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.5);
      backdrop-filter: blur(4px);
      animation: fadeIn 0.15s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .spinner {
      position: relative;
      width: 48px;
      height: 48px;
    }

    .spinner-ring {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 3px solid transparent;
      border-top-color: #2563eb;
      animation: spin 1s cubic-bezier(0.55, 0.15, 0.45, 0.85) infinite;
    }

    .spinner-ring:nth-child(2) {
      inset: 6px;
      border-top-color: #3b82f6;
      animation-duration: 0.8s;
      animation-direction: reverse;
    }

    .spinner-ring:nth-child(3) {
      inset: 12px;
      border-top-color: #93c5fd;
      animation-duration: 0.6s;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class LoadingOverlayComponent {
  readonly loading = inject(LoadingService);
}
