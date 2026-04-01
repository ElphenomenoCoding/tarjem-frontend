import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  template: `
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-3 min-w-[320px] max-w-[420px]">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="flex items-start gap-3 rounded-xl border px-4 py-3.5 shadow-lg backdrop-blur-sm transition-all duration-300"
          [class]="getClasses(toast.type, toast.leaving)"
          [style.animation]="toast.leaving ? 'toast-out 0.3s ease-in forwards' : 'toast-in 0.3s ease-out'"
        >
          <div class="shrink-0 mt-0.5">
            @switch (toast.type) {
              @case ('success') {
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              @case ('error') {
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              }
              @case ('warning') {
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                </svg>
              }
              @case ('info') {
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
              }
            }
          </div>
          <p class="flex-1 text-sm font-medium">{{ toast.message }}</p>
          <button
            type="button"
            class="shrink-0 rounded-lg p-0.5 opacity-60 hover:opacity-100 transition-opacity"
            (click)="toastService.dismiss(toast.id)"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: contents;
    }
    @keyframes toast-in {
      from { opacity: 0; transform: translateX(100%); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes toast-out {
      from { opacity: 1; transform: translateX(0); }
      to { opacity: 0; transform: translateX(100%); }
    }
  `]
})
export class ToastContainerComponent {
  toastService = inject(ToastService);

  getClasses(type: string, leaving?: boolean): string {
    const base = leaving ? 'opacity-0' : '';
    const map: Record<string, string> = {
      success: 'bg-emerald-50/95 border-emerald-200 text-emerald-800',
      error: 'bg-red-50/95 border-red-200 text-red-800',
      warning: 'bg-amber-50/95 border-amber-200 text-amber-800',
      info: 'bg-blue-50/95 border-blue-200 text-blue-800',
    };
    return `${map[type] || map['info']} ${base}`;
  }
}
