import { Injectable, signal, inject, NgZone } from '@angular/core';
import { AuthService } from './auth.service';

export interface LiveNotification {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  relatedEntityId: string;
  relatedEntityType: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly auth = inject(AuthService);
  private readonly zone = inject(NgZone);
  private eventSource: EventSource | null = null;

  unreadCount = signal(0);
  latestNotification = signal<LiveNotification | null>(null);
  latestTicketMessage = signal<any>(null);

  connect() {
    this.disconnect();
    const token = this.auth.getToken();
    if (!token) return;

    // Run outside Angular zone to avoid triggering change detection on every SSE heartbeat
    this.zone.runOutsideAngular(() => {
      this.eventSource = new EventSource(`/api/v1/notifications/stream?token=${token}`);

      this.eventSource.addEventListener('notification', (event: any) => {
        const data: LiveNotification = JSON.parse(event.data);
        this.zone.run(() => {
          this.unreadCount.update(c => c + 1);
          this.latestNotification.set(data);
        });
      });

      this.eventSource.addEventListener('ticket-message', (event: any) => {
        const data = JSON.parse(event.data);
        this.zone.run(() => {
          this.latestTicketMessage.set(data);
        });
      });

      this.eventSource.onerror = () => {
        // Reconnect after 5 seconds
        this.disconnect();
        setTimeout(() => this.connect(), 5000);
      };
    });
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  setUnreadCount(count: number) {
    this.unreadCount.set(count);
  }

  decrementUnread() {
    this.unreadCount.update(c => Math.max(0, c - 1));
  }

  resetUnread() {
    this.unreadCount.set(0);
  }
}
