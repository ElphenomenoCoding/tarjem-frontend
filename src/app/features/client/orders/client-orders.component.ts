import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MainLayoutComponent } from '../../../shared/layouts/main-layout/main-layout.component';
import { ApiService, PageResponse } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateLangPipe } from '../../../shared/pipes/translate-lang.pipe';

interface Order {
  id: string;
  documentType: string;
  sourceLanguage: string;
  targetLanguage: string;
  tier: string;
  status: string;
  totalPrice: number;
  pageCount: number;
  urgency: string;
  deliveryType: string;
  createdAt: string;
  hasOpenTicket?: boolean;
}

type TabKey = 'ALL' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

const TAB_STATUS_MAP: Record<TabKey, string[]> = {
  ALL: [],
  IN_PROGRESS: ['PAID', 'IN_PROGRESS', 'PENDING_REVIEW', 'IN_REVIEW', 'REVISION_REQUESTED', 'APPROVED', 'PENDING_DELIVERY'],
  DONE: ['DELIVERED'],
  CANCELLED: ['CANCELLED'],
};

@Component({
  selector: 'app-client-orders',
  standalone: true,
  imports: [MainLayoutComponent, TranslocoModule, RouterLink, FormsModule, DecimalPipe, ModalComponent, TranslateLangPipe],
  styles: [`
    @keyframes fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    .anim { animation: fade-up 0.4s ease-out both; }
    .order-card { transition: all 0.2s ease; }
    .order-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px -4px rgba(0,0,0,0.08); }
    .tab { transition: all 0.2s ease; cursor: pointer; position: relative; }
    .tab:hover { color: #334155; }
    .tab-active { color: #3b82f6 !important; font-weight: 700; }
    .tab-active::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background: #3b82f6; border-radius: 1px; }
  `],
  template: `
    <app-main-layout>
      <div *transloco="let t">

        <!-- Header -->
        <div class="anim flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 class="text-2xl sm:text-3xl font-bold text-slate-900">{{ t('order.myOrders') }}</h1>
            <p class="mt-1 text-sm text-slate-500">{{ t('clientOrders.subtitle') }}</p>
          </div>
          <a routerLink="/client/orders/new"
            class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg hover:from-blue-700 hover:to-indigo-700">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            {{ t('order.newOrder') }}
          </a>
        </div>

        <!-- Tabs + Search -->
        <div class="anim rounded-2xl border border-slate-200 bg-white mb-6">
          <!-- Tab bar -->
          <div class="flex items-center border-b border-slate-200 px-4 gap-1 overflow-x-auto">
            @for (tab of tabs; track tab.key) {
              <button (click)="selectTab(tab.key)" class="tab flex items-center gap-2 px-4 py-3 text-sm text-slate-500 whitespace-nowrap"
                [class.tab-active]="activeTab() === tab.key">
                <span>{{ t(tab.label) }}</span>
                <span class="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold"
                  [class]="activeTab() === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'">
                  {{ tabCount(tab.key) }}
                </span>
              </button>
            }
          </div>
          <!-- Search -->
          <div class="px-4 py-3">
            <div class="relative">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
              <input type="text" [ngModel]="searchInput()" (ngModelChange)="onSearchInput($event)" (keydown.enter)="applySearch()"
                class="w-full pl-9 pr-9 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                [placeholder]="t('clientOrders.searchPlaceholder')" />
              @if (searchInput()) {
                <button (click)="clearSearch()" class="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600 transition-colors">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              }
            </div>
          </div>
        </div>

        <!-- Results count -->
        @if (!loading()) {
          <p class="anim text-xs text-slate-400 mb-4">{{ displayOrders().length }} {{ t('clientOrders.results') }}</p>
        }

        <!-- Loading -->
        @if (loading()) {
          <div class="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <svg class="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
            <p class="text-sm text-slate-500">{{ t('common.loading') }}</p>
          </div>
        } @else if (displayOrders().length === 0) {
          <div class="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <svg class="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9.75m-4.5 6.75h13.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" /></svg>
            </div>
            <p class="text-sm text-slate-500 mb-3">{{ t('clientOrders.noResults') }}</p>
            <a routerLink="/client/orders/new" class="text-sm font-semibold text-blue-600 hover:text-blue-700">{{ t('order.newOrder') }}</a>
          </div>
        } @else {
          <!-- Order Cards -->
          <div class="space-y-3">
            @for (order of displayOrders(); track order.id) {
              <div class="order-card rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <a [routerLink]="['/client/orders', order.id]" class="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4">
                  <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" [class]="getStatusBg(order.status)">
                    <svg class="w-5 h-5" [class]="getStatusIcon(order.status)" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                      @if (order.status === 'DELIVERED') { <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> }
                      @else if (order.status === 'CANCELLED') { <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> }
                      @else { <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /> }
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <p class="text-sm font-bold text-slate-900">{{ order.documentType }}</p>
                      @if (order.urgency === 'EXPRESS') { <span class="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 uppercase">Express</span> }
                      @if (order.tier === 'OFFICIAL') { <span class="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 uppercase">{{ t('order.official') }}</span> }
                      @if (order.hasOpenTicket) {
                        <a routerLink="/client/support" (click)="$event.stopPropagation()" class="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700 uppercase cursor-pointer hover:bg-orange-200 transition-colors">
                          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" /></svg>
                          {{ t('clientOrders.ticketOpen') }}
                        </a>
                      }
                    </div>
                    <p class="text-xs text-slate-500 mt-0.5"><bdi dir="ltr">{{ order.sourceLanguage | translateLang }} → {{ order.targetLanguage | translateLang }}</bdi> · {{ order.pageCount }} {{ t('order.pages') }} · {{ formatDate(order.createdAt) }}</p>
                  </div>
                  <div class="flex items-center gap-3 sm:flex-col sm:items-end shrink-0">
                    <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold" [class]="getStatusBadge(clientStatus(order.status))">
                      {{ t('status.' + camelCase(clientStatus(order.status))) }}
                    </span>
                    <p class="text-sm font-bold text-slate-900">{{ order.totalPrice | number }} {{ t('common.currency') }}</p>
                  </div>
                </a>
                <div class="flex items-center gap-3 px-5 py-2.5 border-t border-slate-100 bg-slate-50/50">
                  <a [routerLink]="['/client/orders', order.id]" class="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer transition-colors">{{ t('common.viewDetails') }}</a>
                  @if (canReport(order.status) && !order.hasOpenTicket) {
                    <span class="text-slate-300">|</span>
                    <button (click)="openReportDialog($event, order)" class="text-xs font-semibold text-red-500 hover:text-red-600 cursor-pointer transition-colors">{{ t('clientOrders.report') }}</button>
                  }
                  @if (order.hasOpenTicket) {
                    <span class="text-slate-300">|</span>
                    <a routerLink="/client/support" (click)="$event.stopPropagation()" class="text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer transition-colors">{{ t('clientOrders.viewTicket') }}</a>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div class="flex justify-center items-center gap-3 mt-8">
              <button (click)="goToPage(currentPage() - 1)" [disabled]="currentPage() === 0"
                class="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium border border-slate-200 rounded-xl bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-all">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                {{ t('common.previous') }}
              </button>
              <span class="text-sm text-slate-600 font-medium">{{ currentPage() + 1 }} / {{ totalPages() }}</span>
              <button (click)="goToPage(currentPage() + 1)" [disabled]="currentPage() >= totalPages() - 1"
                class="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium border border-slate-200 rounded-xl bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-all">
                {{ t('common.next') }}
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </button>
            </div>
          }
        }

        <!-- Report Modal -->
        <app-modal [isOpen]="showReportDialog()" title="clientOrders.reportTitle" size="md" (closed)="showReportDialog.set(false)">
          <p class="text-sm text-slate-600 mb-4">{{ t('clientOrders.reportMessage') }}</p>
          <div class="mb-4">
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{{ t('clientOrders.reportSubject') }}</label>
            <input type="text" [(ngModel)]="reportSubject" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" [placeholder]="t('clientOrders.reportSubjectPlaceholder')" />
          </div>
          <div class="mb-4">
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{{ t('clientOrders.reportDescription') }}</label>
            <textarea [(ngModel)]="reportMessage" rows="4" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none" [placeholder]="t('clientOrders.reportDescPlaceholder')"></textarea>
          </div>
          <label class="flex items-start gap-2.5 cursor-pointer select-none">
            <input type="checkbox" [(ngModel)]="reportConfirmed" class="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500" />
            <span class="text-sm text-slate-700">{{ t('clientOrders.reportCheckbox') }}</span>
          </label>
          <div modal-footer class="flex justify-end gap-3">
            <button (click)="showReportDialog.set(false)" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">{{ t('common.cancel') }}</button>
            <button (click)="submitReport()" [disabled]="!reportConfirmed || !reportMessage.trim() || !reportSubject.trim() || submittingReport()"
              class="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
              @if (submittingReport()) { <svg class="w-4 h-4 animate-spin inline mr-1" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> }
              {{ t('clientOrders.reportConfirm') }}
            </button>
          </div>
        </app-modal>

      </div>
    </app-main-layout>
  `,
})
export class ClientOrdersComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);

  loading = signal(true);
  allOrders = signal<Order[]>([]);
  displayOrders = signal<Order[]>([]);
  activeTab = signal<TabKey>('IN_PROGRESS');
  searchInput = signal('');
  activeSearch = signal('');
  currentPage = signal(0);
  totalPages = signal(1);

  tabs: { key: TabKey; label: string }[] = [
    { key: 'IN_PROGRESS', label: 'clientOrders.tabInProgress' },
    { key: 'DONE', label: 'clientOrders.tabDone' },
    { key: 'CANCELLED', label: 'clientOrders.tabCancelled' },
    { key: 'ALL', label: 'clientOrders.tabAll' },
  ];

  showReportDialog = signal(false);
  reportOrder = signal<Order | null>(null);
  reportSubject = '';
  reportMessage = '';
  reportConfirmed = false;
  submittingReport = signal(false);

  ngOnInit() { this.loadOrders(); }

  loadOrders() {
    this.loading.set(true);
    this.api.get<PageResponse<Order>>('/api/v1/client/orders', { page: this.currentPage(), size: 50 }).subscribe({
      next: (res) => {
        const orders = res.data?.content ?? [];
        this.allOrders.set(orders);
        this.totalPages.set(res.data?.totalPages ?? 1);
        this.loading.set(false);
        this.checkTickets(orders);
        this.applyFilters();
      },
      error: () => this.loading.set(false),
    });
  }

  tabCount(key: TabKey): number {
    const statuses = TAB_STATUS_MAP[key];
    const orders = this.allOrders();
    if (statuses.length === 0) return orders.length;
    return orders.filter(o => statuses.includes(o.status)).length;
  }

  selectTab(key: TabKey) {
    this.activeTab.set(key);
    this.applyFilters();
  }

  checkTickets(orders: Order[]) {
    let pending = 0;
    for (const order of orders) {
      if (this.canReport(order.status)) {
        pending++;
        this.api.get<boolean>('/api/v1/client/orders/' + order.id + '/ticket').subscribe({
          next: (res) => { if (res.data) order.hasOpenTicket = true; pending--; if (pending === 0) { this.allOrders.set([...orders]); this.applyFilters(); } },
          error: () => { pending--; if (pending === 0) { this.allOrders.set([...orders]); this.applyFilters(); } },
        });
      }
    }
  }

  onSearchInput(value: string) {
    this.searchInput.set(value);
    if (value.length >= 3) { this.activeSearch.set(value); this.applyFilters(); }
    else if (value.length === 0) { this.activeSearch.set(''); this.applyFilters(); }
  }

  applySearch() { this.activeSearch.set(this.searchInput()); this.applyFilters(); }
  clearSearch() { this.searchInput.set(''); this.activeSearch.set(''); this.applyFilters(); }

  applyFilters() {
    let orders = this.allOrders();
    const statuses = TAB_STATUS_MAP[this.activeTab()];
    if (statuses.length > 0) orders = orders.filter(o => statuses.includes(o.status));
    const q = this.activeSearch().trim().toLowerCase();
    if (q) orders = orders.filter(o => o.documentType?.toLowerCase().includes(q) || o.sourceLanguage?.toLowerCase().includes(q) || o.targetLanguage?.toLowerCase().includes(q) || o.id?.toLowerCase().includes(q));
    this.displayOrders.set(orders);
  }

  goToPage(page: number) { this.currentPage.set(page); this.loadOrders(); }

  canReport(status: string): boolean { return !['DRAFT', 'CANCELLED', 'DELIVERED'].includes(status); }

  openReportDialog(event: Event, order: Order) {
    event.preventDefault(); event.stopPropagation();
    this.reportOrder.set(order); this.reportSubject = 'Signalement: ' + order.documentType;
    this.reportMessage = ''; this.reportConfirmed = false; this.showReportDialog.set(true);
  }

  submitReport() {
    const order = this.reportOrder();
    if (!order || !this.reportConfirmed || !this.reportMessage.trim() || !this.reportSubject.trim()) return;
    this.submittingReport.set(true);
    this.api.post('/api/v1/client/tickets', { orderId: order.id, subject: this.reportSubject, description: this.reportMessage }).subscribe({
      next: () => { this.submittingReport.set(false); this.showReportDialog.set(false); this.toast.success(this.transloco.translate('clientOrders.reportSuccess')); order.hasOpenTicket = true; this.applyFilters(); },
      error: (err: HttpErrorResponse) => { this.submittingReport.set(false); this.toast.error(err.error?.message || this.transloco.translate('common.error')); },
    });
  }

  formatDate(dateStr: string): string { if (!dateStr) return ''; try { return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return dateStr; } }
  clientStatus(s: string): string {
    if (['PENDING_REVIEW', 'IN_REVIEW', 'REVISION_REQUESTED', 'REVIEW_COMPLETE'].includes(s)) return 'IN_PROGRESS';
    if (s === 'APPROVED') return 'DELIVERED';
    return s;
  }

  camelCase(status: string): string { return status.toLowerCase().replaceAll(/_([a-z])/g, (_, c) => c.toUpperCase()); }

  getStatusBg(s: string): string { const m: Record<string,string> = { PENDING_PAYMENT:'bg-amber-100', PAID:'bg-sky-100', ASSIGNED:'bg-sky-100', IN_PROGRESS:'bg-blue-100', PENDING_REVIEW:'bg-amber-100', IN_REVIEW:'bg-amber-100', REVISION_REQUESTED:'bg-red-100', APPROVED:'bg-emerald-100', DELIVERED:'bg-emerald-100', CANCELLED:'bg-red-100', PENDING_DELIVERY:'bg-purple-100' }; return m[s]||'bg-slate-100'; }
  getStatusIcon(s: string): string { const m: Record<string,string> = { PENDING_PAYMENT:'text-amber-600', PAID:'text-sky-600', ASSIGNED:'text-sky-600', IN_PROGRESS:'text-blue-600', PENDING_REVIEW:'text-amber-600', IN_REVIEW:'text-amber-600', REVISION_REQUESTED:'text-red-600', APPROVED:'text-emerald-600', DELIVERED:'text-emerald-600', CANCELLED:'text-red-600', PENDING_DELIVERY:'text-purple-600' }; return m[s]||'text-slate-500'; }
  getStatusBadge(s: string): string { const m: Record<string,string> = { PENDING_PAYMENT:'bg-amber-50 text-amber-700', PAID:'bg-sky-50 text-sky-700', ASSIGNED:'bg-sky-50 text-sky-700', IN_PROGRESS:'bg-blue-50 text-blue-700', PENDING_REVIEW:'bg-amber-50 text-amber-700', IN_REVIEW:'bg-amber-50 text-amber-700', REVISION_REQUESTED:'bg-red-50 text-red-700', APPROVED:'bg-emerald-50 text-emerald-700', DELIVERED:'bg-emerald-50 text-emerald-700', CANCELLED:'bg-red-50 text-red-700', PENDING_DELIVERY:'bg-purple-50 text-purple-700' }; return m[s]||'bg-slate-50 text-slate-700'; }
}
