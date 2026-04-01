import { Component, inject, signal, OnInit, OnDestroy, effect } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MainLayoutComponent } from '../../../shared/layouts/main-layout/main-layout.component';
import { ApiService, PageResponse } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { NotificationService, LiveNotification } from '../../../core/services/notification.service';

interface Notif {
  id: string; title: string; body: string; isRead: boolean;
  relatedEntityId: string; relatedEntityType: string; createdAt: string;
}

@Component({
  selector: 'app-client-notifications',
  standalone: true,
  imports: [MainLayoutComponent, TranslocoModule, ConfirmDialogComponent],
  styles: [`
    @keyframes fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    .anim { animation: fade-up 0.4s ease-out both; }
    .notif { transition: all 0.15s ease; cursor: pointer; }
    .notif:hover { background-color: #f8fafc; }
    .notif-unread { background-color: rgba(239,246,255,0.6); }
    .notif-expanded { background-color: #f8fafc !important; }
  `],
  template: `
    <app-main-layout>
      <div *transloco="let t">
        <div class="anim flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 class="text-2xl sm:text-3xl font-bold text-slate-900">{{ t('nav.notifications') }}</h1>
            <p class="mt-1 text-sm text-slate-500">{{ t('notif.subtitle') }}</p>
          </div>
          <div class="flex items-center gap-2">
            @if (notifications().length > 0) {
              <button (click)="markAllRead()" class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {{ t('notif.markAllRead') }}
              </button>
              <button (click)="showClearDialog.set(true)" class="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-all cursor-pointer">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                {{ t('notif.clearAll') }}
              </button>
            }
          </div>
        </div>

        @if (loading()) {
          <div class="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <svg class="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
          </div>
        } @else if (notifications().length === 0) {
          <div class="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <svg class="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
            </div>
            <p class="text-sm text-slate-500">{{ t('notif.empty') }}</p>
          </div>
        } @else {
          <div class="rounded-2xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
            @for (n of notifications(); track n.id) {
              <div (click)="toggleNotification(n)" class="notif px-5 py-4" [class.notif-unread]="!n.isRead" [class.notif-expanded]="expandedId() === n.id">
                <div class="flex items-start gap-3">
                  <!-- Dot -->
                  <div class="mt-1.5 shrink-0">
                    @if (!n.isRead) { <div class="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div> }
                    @else { <div class="w-2.5 h-2.5 rounded-full bg-slate-200"></div> }
                  </div>
                  <!-- Content -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-2">
                      <p class="text-sm truncate" [class]="n.isRead ? 'text-slate-700 font-medium' : 'text-slate-900 font-bold'">{{ t(n.title) }}</p>
                      <span class="text-[11px] text-slate-400 shrink-0 whitespace-nowrap">{{ timeAgo(n.createdAt) }}</span>
                    </div>
                    <p class="text-sm text-slate-500 mt-0.5" [class.line-clamp-1]="expandedId() !== n.id">{{ t(n.body) }}</p>

                    <!-- Expanded: show action button -->
                    @if (expandedId() === n.id && n.relatedEntityId) {
                      <button (click)="goToOrder($event, n)" class="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-all cursor-pointer">
                        {{ t('common.viewDetails') }}
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                      </button>
                    }
                  </div>
                  <!-- Chevron -->
                  <svg class="w-4 h-4 text-slate-300 shrink-0 mt-1.5 transition-transform" [class.rotate-90]="expandedId() === n.id" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </div>
              </div>
            }
          </div>

          @if (totalPages() > 1) {
            <div class="flex justify-center items-center gap-3 mt-6">
              <button (click)="goToPage(currentPage() - 1)" [disabled]="currentPage() === 0" class="px-4 py-2 text-sm border border-slate-200 rounded-xl bg-white disabled:opacity-40 hover:bg-slate-50">{{ t('common.previous') }}</button>
              <span class="text-sm text-slate-600">{{ currentPage() + 1 }} / {{ totalPages() }}</span>
              <button (click)="goToPage(currentPage() + 1)" [disabled]="currentPage() >= totalPages() - 1" class="px-4 py-2 text-sm border border-slate-200 rounded-xl bg-white disabled:opacity-40 hover:bg-slate-50">{{ t('common.next') }}</button>
            </div>
          }
        }

        <app-confirm-dialog [isOpen]="showClearDialog()" [title]="t('notif.clearTitle')" [message]="t('notif.clearMessage')"
          confirmText="notif.clearConfirm" cancelText="common.cancel" variant="danger"
          (confirmed)="clearAll()" (cancelled)="showClearDialog.set(false)" />
      </div>
    </app-main-layout>
  `,
})
export class ClientNotificationsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifService = inject(NotificationService);

  private lastSeenLiveId = '';

  // React to live notifications — only add if truly new
  private liveEffect = effect(() => {
    const live = this.notifService.latestNotification();
    if (live && !this.loading() && live.id !== this.lastSeenLiveId) {
      // Check not already in list
      const exists = this.notifications().some(n => n.id === live.id);
      if (!exists) {
        this.lastSeenLiveId = live.id;
        this.notifications.update(list => [live as Notif, ...list]);
      }
    }
  });

  loading = signal(true);
  notifications = signal<Notif[]>([]);
  expandedId = signal<string | null>(null);
  currentPage = signal(0);
  totalPages = signal(1);
  showClearDialog = signal(false);
  basePath = '/api/v1/client';

  ngOnInit() {
    if (this.router.url.includes('/translator/')) this.basePath = '/api/v1/translator';
    else if (this.router.url.includes('/admin/')) this.basePath = '/api/v1/admin';
    this.loadNotifications();
  }

  loadNotifications() {
    this.loading.set(true);
    this.api.get<PageResponse<Notif>>(this.basePath + '/notifications', { page: this.currentPage(), size: 20 }).subscribe({
      next: (res) => { this.notifications.set(res.data?.content ?? []); this.totalPages.set(res.data?.totalPages ?? 1); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  toggleNotification(n: Notif) {
    // Toggle expand
    if (this.expandedId() === n.id) {
      this.expandedId.set(null);
      return;
    }
    this.expandedId.set(n.id);

    // Mark as read
    if (!n.isRead) {
      this.api.patch(this.basePath + '/notifications/' + n.id + '/read').subscribe();
      n.isRead = true;
      this.notifications.set([...this.notifications()]);
      this.notifService.decrementUnread();
    }
  }

  goToOrder(event: Event, n: Notif) {
    event.stopPropagation();
    if (!n.relatedEntityId) return;

    if (n.relatedEntityType === 'ORDER') {
      let path: string;
      if (this.basePath.includes('admin')) path = '/admin/orders/' + n.relatedEntityId;
      else if (this.basePath.includes('translator')) path = '/translator/orders/' + n.relatedEntityId + '/detail';
      else path = '/client/orders/' + n.relatedEntityId;
      this.router.navigate([path]);
    } else if (n.relatedEntityType === 'WITHDRAWAL' && this.basePath.includes('admin')) {
      this.router.navigate(['/admin/finance']);
    } else if (n.relatedEntityType === 'USER' && this.basePath.includes('admin')) {
      this.router.navigate(['/admin/translators', n.relatedEntityId]);
    } else if (n.relatedEntityType === 'TICKET' || n.relatedEntityType === 'SUPPORT_TICKET') {
      let supportPath: string;
      if (this.basePath.includes('admin')) supportPath = '/admin/support';
      else if (this.basePath.includes('translator')) supportPath = '/translator/support';
      else supportPath = '/client/support';
      this.router.navigate([supportPath], { queryParams: { ticket: n.relatedEntityId } });
    } else if (n.relatedEntityType === 'LANGUAGE_PAIR') {
      if (this.basePath.includes('admin')) this.router.navigate(['/admin/config']);
      else this.router.navigate(['/translator/profile']);
    } else if (n.relatedEntityType === 'RATING') {
      this.router.navigate(['/translator/dashboard']);
    }
  }

  markAllRead() {
    this.api.patch(this.basePath + '/notifications/read-all').subscribe({
      next: () => { this.notifications.update(list => list.map(n => ({ ...n, isRead: true }))); this.notifService.resetUnread(); this.toast.success(this.transloco.translate('notif.allMarkedRead')); },
    });
  }

  clearAll() {
    this.showClearDialog.set(false);
    this.api.delete(this.basePath + '/notifications').subscribe({
      next: () => { this.notifications.set([]); this.notifService.resetUnread(); this.toast.success(this.transloco.translate('notif.cleared')); },
    });
  }

  goToPage(page: number) { this.currentPage.set(page); this.loadNotifications(); }

  timeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return this.transloco.translate('notif.justNow');
    if (mins < 60) return mins + ' min';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h';
    const days = Math.floor(hours / 24);
    if (days === 1) return this.transloco.translate('notif.yesterday');
    return days + 'j';
  }
}
