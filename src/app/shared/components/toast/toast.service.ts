import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  leaving?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private counter = 0;
  toasts = signal<Toast[]>([]);

  show(type: Toast['type'], message: string, duration = 4000): void {
    const id = ++this.counter;
    this.toasts.update(list => [...list, { id, type, message }]);

    setTimeout(() => this.dismiss(id), duration);
  }

  success(message: string): void { this.show('success', message); }
  error(message: string): void { this.show('error', message, 5000); }
  warning(message: string): void { this.show('warning', message); }
  info(message: string): void { this.show('info', message); }

  dismiss(id: number): void {
    this.toasts.update(list =>
      list.map(t => t.id === id ? { ...t, leaving: true } : t)
    );
    setTimeout(() => {
      this.toasts.update(list => list.filter(t => t.id !== id));
    }, 300);
  }
}
