import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { ModalComponent } from '../modal/modal.component';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [ModalComponent, TranslocoModule, FormsModule],
  template: `
    <app-modal [isOpen]="isOpen()" [title]="title()" size="sm" (closed)="cancel()">
      <p class="text-sm text-slate-600">{{ message() }}</p>

      @if (requireCheckbox()) {
        <label class="mt-4 flex items-start gap-2.5 cursor-pointer select-none">
          <input type="checkbox" [(ngModel)]="checked"
            class="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
          <span class="text-sm text-slate-700">{{ checkboxLabel() }}</span>
        </label>
      }

      <div modal-footer class="flex justify-end gap-3">
        <button (click)="cancel()"
          class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50">
          {{ cancelText() | transloco }}
        </button>
        <button (click)="confirm()" [disabled]="requireCheckbox() && !checked"
          class="rounded-xl px-4 py-2 text-sm font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          [class]="variant() === 'danger'
            ? 'bg-red-600 hover:bg-red-700'
            : 'bg-blue-600 hover:bg-blue-700'">
          {{ confirmText() | transloco }}
        </button>
      </div>
    </app-modal>
  `,
})
export class ConfirmDialogComponent {
  isOpen = input(false);
  title = input('');
  message = input('');
  confirmText = input('common.confirm');
  cancelText = input('common.cancel');
  variant = input<'danger' | 'info'>('info');
  requireCheckbox = input(false);
  checkboxLabel = input('');

  confirmed = output<void>();
  cancelled = output<void>();

  checked = false;

  confirm() {
    if (this.requireCheckbox() && !this.checked) return;
    this.checked = false;
    this.confirmed.emit();
  }

  cancel() {
    this.checked = false;
    this.cancelled.emit();
  }
}
