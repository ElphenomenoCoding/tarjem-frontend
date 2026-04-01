import { Component, input, output } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [TranslocoModule],
  styles: [],
  template: `
    @if (isOpen()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/50 transition-opacity"
          (click)="onBackdropClick()"
        ></div>

        <!-- Modal panel -->
        <div
          class="relative z-10 w-full rounded-xl bg-white shadow-2xl"
          [class]="sizeClasses()"
        >
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 class="text-lg font-semibold text-gray-900">
              {{ title() | transloco }}
            </h2>
            <button
              type="button"
              class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              (click)="closed.emit()"
            >
              <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="px-6 py-4">
            <ng-content />
          </div>

          <!-- Footer -->
          <div class="border-t border-gray-200 px-6 py-4">
            <ng-content select="[modal-footer]" />
          </div>
        </div>
      </div>
    }
  `
})
export class ModalComponent {
  isOpen = input(false);
  title = input('');
  size = input<'sm' | 'md' | 'lg'>('md');

  closed = output<void>();

  sizeClasses(): string {
    const sizes: Record<string, string> = {
      sm: 'max-w-sm',
      md: 'max-w-lg',
      lg: 'max-w-3xl',
    };
    return sizes[this.size()] || sizes['md'];
  }

  onBackdropClick(): void {
    this.closed.emit();
  }
}
