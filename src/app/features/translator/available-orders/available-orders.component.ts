import { Component, inject, signal, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MainLayoutComponent } from '../../../shared/layouts/main-layout/main-layout.component';
import { ApiService, PageResponse } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateLangPipe } from '../../../shared/pipes/translate-lang.pipe';

interface AvailableOrder {
  id: string; documentType: string; sourceLanguage: string; targetLanguage: string;
  tier: string; status: string; totalPrice: number; translatorAmount: number;
  pageCount: number; clientNotes: string; deliveryType: string; urgency: string;
  createdAt: string; estimatedDeliveryDate: string; documentCount: number;
}

interface TranslatorStats { activeOrders: number; completedOrders: number; totalEarnings: number; rating: number; }

@Component({
  selector: 'app-available-orders',
  standalone: true,
  imports: [MainLayoutComponent, TranslocoModule, DecimalPipe, ConfirmDialogComponent, RouterLink, TranslateLangPipe],
  styles: [`
    @keyframes fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    .anim { animation: fade-up 0.4s ease-out both; }
    .order-card { transition: all 0.2s ease; }
    .order-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px -6px rgba(0,0,0,0.1); }
  `],
  template: `
    <app-main-layout>
      <div *transloco="let t">

        <div class="anim mb-6">
          <h1 class="text-2xl sm:text-3xl font-bold text-slate-900">{{ t('order.availableOrders') }}</h1>
          <p class="mt-1 text-sm text-slate-500">{{ t('availableOrders.subtitle') }}</p>
        </div>

        <!-- Capacity warning -->
        @if (ongoingCount() >= 3) {
          <div class="anim mb-6 rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
            <svg class="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
            <div>
              <p class="text-sm font-bold text-amber-800">{{ t('availableOrders.capacityFull') }}</p>
              <p class="text-xs text-amber-600">{{ t('availableOrders.capacityFullDesc') }}</p>
            </div>
          </div>
        } @else if (ongoingCount() >= 2) {
          <div class="anim mb-6 rounded-2xl bg-blue-50 border border-blue-200 p-4 flex items-center gap-3">
            <svg class="w-5 h-5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
            <p class="text-sm text-blue-700">{{ t('availableOrders.capacityWarning', { count: ongoingCount(), max: 3 }) }}</p>
          </div>
        }

        @if (loading()) {
          <div class="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <svg class="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
            <p class="text-sm text-slate-500">{{ t('common.loading') }}</p>
          </div>
        } @else if (orders().length === 0) {
          <div class="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <svg class="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            </div>
            <p class="text-sm font-semibold text-slate-700 mb-1">{{ t('order.noAvailable') }}</p>
            <p class="text-xs text-slate-400">{{ t('availableOrders.noOrdersDesc') }}</p>
          </div>
        } @else {
          <div class="space-y-4">
            @for (order of orders(); track order.id) {
              <div class="order-card rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <!-- Main info -->
                <div class="p-5">
                  <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div class="flex-1 min-w-0">
                      <!-- Title row -->
                      <div class="flex items-center gap-2 flex-wrap mb-2">
                        <h3 class="text-base font-bold text-slate-900">{{ order.documentType }}</h3>
                        @if (order.urgency === 'EXPRESS') {
                          <span class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold text-red-700 uppercase">Express</span>
                        }
                        @if (order.tier === 'OFFICIAL') {
                          <span class="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 uppercase">{{ t('order.official') }}</span>
                        }
                      </div>

                      <!-- Details grid -->
                      <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                        <div>
                          <span class="text-slate-400 text-xs">{{ t('order.languages') }}</span>
                          <p class="font-semibold text-slate-800"><bdi dir="ltr">{{ order.sourceLanguage | translateLang }} → {{ order.targetLanguage | translateLang }}</bdi></p>
                        </div>
                        <div>
                          <span class="text-slate-400 text-xs">{{ t('order.pages') }}</span>
                          <p class="font-semibold text-slate-800">{{ order.pageCount }}</p>
                        </div>
                        <div>
                          <span class="text-slate-400 text-xs">{{ t('order.deliveryType') }}</span>
                          <p class="font-semibold text-slate-800">{{ t('delivery.' + order.deliveryType.toLowerCase()) }}</p>
                        </div>
                        <div>
                          <span class="text-slate-400 text-xs">{{ t('availableOrders.deadline') }}</span>
                          <p class="font-semibold" [class]="order.urgency === 'EXPRESS' ? 'text-red-600' : 'text-slate-800'">
                            {{ order.urgency === 'EXPRESS' ? t('availableOrders.express48h') : t('availableOrders.normal5d') }}
                          </p>
                        </div>
                        <div>
                          <span class="text-slate-400 text-xs">{{ t('availableOrders.postedAgo') }}</span>
                          <p class="font-semibold text-slate-800">{{ timeAgo(order.createdAt) }}</p>
                        </div>
                      </div>

                      <!-- Client notes -->
                      @if (order.clientNotes) {
                        <div class="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                          <p class="text-xs text-slate-400 mb-0.5">{{ t('order.notes') }}</p>
                          <p class="text-sm text-slate-700">{{ order.clientNotes }}</p>
                        </div>
                      }
                    </div>

                    <!-- Price + Actions -->
                    <div class="sm:text-end shrink-0 flex flex-row sm:flex-col items-center sm:items-end gap-3">
                      <div>
                        <p class="text-xs text-slate-400">{{ t('availableOrders.yourEarnings') }}</p>
                        <p class="text-2xl font-black text-emerald-600">{{ order.translatorAmount | number }} {{ t('common.currency') }}</p>
                        <p class="text-xs text-slate-400">{{ t('availableOrders.totalOrder') }}: {{ order.totalPrice | number }} {{ t('common.currency') }}</p>
                      </div>
                      <div class="flex gap-2">
                        <a [routerLink]="['/translator/orders', order.id, 'detail']"
                          class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all whitespace-nowrap">
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                          {{ t('common.viewDetails') }}
                        </a>
                        <button (click)="openClaimDialog(order)" [disabled]="ongoingCount() >= 3 || claiming()"
                          class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">
                          @if (claiming() === order.id) {
                            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                          }
                          {{ t('order.claim') }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div class="flex justify-center items-center gap-3 mt-8">
              <button (click)="goToPage(currentPage() - 1)" [disabled]="currentPage() === 0"
                class="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium border border-slate-200 rounded-xl bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                {{ t('common.previous') }}
              </button>
              <span class="text-sm text-slate-600 font-medium">{{ currentPage() + 1 }} / {{ totalPages() }}</span>
              <button (click)="goToPage(currentPage() + 1)" [disabled]="currentPage() >= totalPages() - 1"
                class="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium border border-slate-200 rounded-xl bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50">
                {{ t('common.next') }}
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </button>
            </div>
          }
        }

        <!-- Claim confirmation -->
        <app-confirm-dialog
          [isOpen]="showClaimDialog()"
          [title]="t('availableOrders.claimTitle')"
          [message]="claimDialogMessage()"
          confirmText="order.claim"
          cancelText="common.cancel"
          variant="info"
          (confirmed)="confirmClaim()"
          (cancelled)="showClaimDialog.set(false)"
        />

      </div>
    </app-main-layout>
  `,
})
export class AvailableOrdersComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  loading = signal(true);
  orders = signal<AvailableOrder[]>([]);
  claiming = signal<string | null>(null);
  currentPage = signal(0);
  totalPages = signal(1);
  ongoingCount = signal(0);

  showClaimDialog = signal(false);
  orderToClaim = signal<AvailableOrder | null>(null);
  claimDialogMessage = signal('');

  ngOnInit() {
    this.loadOrders();
    this.loadStats();
  }

  loadOrders() {
    this.loading.set(true);
    this.api.get<PageResponse<AvailableOrder>>('/api/v1/translator/orders/available', { page: this.currentPage(), size: 10 }).subscribe({
      next: (res) => { this.orders.set(res.data?.content ?? []); this.totalPages.set(res.data?.totalPages ?? 1); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  loadStats() {
    this.api.get<TranslatorStats>('/api/v1/translator/stats').subscribe({
      next: (res) => { if (res.data) this.ongoingCount.set(res.data.activeOrders); },
    });
  }

  openClaimDialog(order: AvailableOrder) {
    this.orderToClaim.set(order);
    const deadline = order.urgency === 'EXPRESS' ? this.transloco.translate('availableOrders.express48h') : this.transloco.translate('availableOrders.normal5d');
    this.claimDialogMessage.set(
      this.transloco.translate('availableOrders.claimMessage', {
        doc: order.documentType,
        from: order.sourceLanguage,
        to: order.targetLanguage,
        pages: order.pageCount,
        earnings: order.translatorAmount,
        deadline,
      })
    );
    this.showClaimDialog.set(true);
  }

  confirmClaim() {
    const order = this.orderToClaim();
    this.showClaimDialog.set(false);
    if (!order) return;
    this.claiming.set(order.id);
    this.api.post('/api/v1/translator/orders/' + order.id + '/claim').subscribe({
      next: () => {
        this.orders.update(list => list.filter(o => o.id !== order.id));
        this.claiming.set(null);
        this.ongoingCount.update(c => c + 1);
        this.toast.success(this.transloco.translate('availableOrders.claimSuccess'));
      },
      error: (err: HttpErrorResponse) => {
        this.claiming.set(null);
        this.toast.error(err.error?.message || this.transloco.translate('common.error'));
      },
    });
  }

  goToPage(page: number) { this.currentPage.set(page); this.loadOrders(); }

  timeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return mins + ' min';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h';
    return Math.floor(hours / 24) + 'j';
  }
}
