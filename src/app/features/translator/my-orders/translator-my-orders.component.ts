import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MainLayoutComponent } from '../../../shared/layouts/main-layout/main-layout.component';
import { ApiService, PageResponse } from '../../../core/services/api.service';
import { TranslateLangPipe } from '../../../shared/pipes/translate-lang.pipe';

interface TranslatorOrder {
  id: string; documentType: string; sourceLanguage: string; targetLanguage: string;
  tier: string; status: string; totalPrice: number; translatorAmount: number;
  pageCount: number; clientNotes: string; deliveryType: string; urgency: string;
  createdAt: string; estimatedDeliveryDate: string;
}

type TabKey = 'ALL' | 'ACTIVE' | 'REVIEW' | 'DONE';

const TAB_MAP: Record<TabKey, string[]> = {
  ALL: [],
  ACTIVE: ['IN_PROGRESS', 'REVISION_REQUESTED'],
  REVIEW: ['PENDING_REVIEW', 'IN_REVIEW', 'APPROVED'],
  DONE: ['DELIVERED', 'APPROVED', 'PENDING_DELIVERY'],
};

@Component({
  selector: 'app-translator-my-orders',
  standalone: true,
  imports: [MainLayoutComponent, TranslocoModule, RouterLink, FormsModule, DecimalPipe, TranslateLangPipe],
  styles: [`
    @keyframes fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    .anim { animation: fade-up 0.4s ease-out both; }
    .order-card { transition: all 0.2s ease; }
    .order-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px -6px rgba(0,0,0,0.1); }
    .tab { transition: all 0.15s ease; cursor: pointer; position: relative; }
    .tab:hover { color: #334155; }
    .tab-active { color: #3b82f6 !important; font-weight: 700; }
    .tab-active::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background: #3b82f6; border-radius: 1px; }
  `],
  template: `
    <app-main-layout>
      <div *transloco="let t">

        <div class="anim mb-6">
          <h1 class="text-2xl sm:text-3xl font-bold text-slate-900">{{ t('order.myOrders') }}</h1>
          <p class="mt-1 text-sm text-slate-500">{{ t('myOrders.subtitle') }}</p>
        </div>

        <!-- Tabs + Search -->
        <div class="anim rounded-2xl border border-slate-200 bg-white mb-6">
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
          <div class="px-4 py-3">
            <div class="relative">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
              <input type="text" [ngModel]="searchInput()" (ngModelChange)="onSearchInput($event)" (keydown.enter)="applySearch()"
                class="w-full pl-9 pr-9 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                [placeholder]="t('myOrders.searchPlaceholder')" />
              @if (searchInput()) {
                <button (click)="clearSearch()" class="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              }
            </div>
          </div>
        </div>

        @if (!loading()) {
          <p class="anim text-xs text-slate-400 mb-4">{{ displayOrders().length }} {{ t('myOrders.results') }}</p>
        }

        @if (loading()) {
          <div class="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <svg class="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
          </div>
        } @else if (displayOrders().length === 0) {
          <div class="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <svg class="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9.75m-4.5 6.75h13.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" /></svg>
            </div>
            <p class="text-sm text-slate-500 mb-2">{{ t('myOrders.noOrders') }}</p>
            <a routerLink="/translator/orders/available" class="text-sm font-semibold text-blue-600 hover:text-blue-700">{{ t('translatorDashboard.findOrders') }}</a>
          </div>
        } @else {
          <div class="space-y-3">
            @for (order of displayOrders(); track order.id) {
              <a [routerLink]="['/translator/orders', order.id, 'workspace']" class="order-card block rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div class="p-5">
                  <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div class="flex gap-4 flex-1 min-w-0">
                      <!-- Status icon -->
                      <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" [class]="getStatusBg(order.status)">
                        <svg class="w-5 h-5" [class]="getStatusIcon(order.status)" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                          @if (order.status === 'DELIVERED') { <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> }
                          @else if (order.status === 'REVISION_REQUESTED') { <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /> }
                          @else { <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /> }
                        </svg>
                      </div>
                      <div class="min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                          <p class="text-sm font-bold text-slate-900">{{ order.documentType }}</p>
                          @if (order.urgency === 'EXPRESS') { <span class="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 uppercase">Express</span> }
                          @if (order.tier === 'OFFICIAL') { <span class="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 uppercase">{{ t('order.official') }}</span> }
                        </div>
                        <p class="text-xs text-slate-500 mt-0.5"><bdi dir="ltr">{{ order.sourceLanguage | translateLang }} → {{ order.targetLanguage | translateLang }}</bdi> · {{ order.pageCount }} {{ t('order.pages') }}</p>
                        <div class="flex items-center gap-3 mt-2 text-xs">
                          <span class="inline-flex items-center rounded-full px-2.5 py-1 font-semibold" [class]="getStatusBadge(order.status)">{{ t('status.' + camelCase(order.status)) }}</span>
                          @if (order.estimatedDeliveryDate) {
                            <span class="text-slate-400 flex items-center gap-1">
                              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              {{ order.estimatedDeliveryDate }}
                            </span>
                          }
                          <span class="text-slate-400">{{ formatDate(order.createdAt) }}</span>
                        </div>
                      </div>
                    </div>
                    <!-- Earnings -->
                    <div class="sm:text-end shrink-0">
                      <p class="text-xs text-slate-400">{{ t('myOrders.earnings') }}</p>
                      <p class="text-lg font-black text-emerald-600">{{ order.translatorAmount | number }} {{ t('common.currency') }}</p>
                    </div>
                  </div>
                </div>
                <!-- Action hint bar -->
                <div class="px-5 py-2 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <span class="text-xs text-slate-400">{{ t('myOrders.clickToOpen') }}</span>
                  @if (order.status === 'IN_PROGRESS') {
                    <span class="text-xs font-semibold text-blue-600">{{ t('myOrders.actionTranslate') }}</span>
                  } @else if (order.status === 'REVISION_REQUESTED') {
                    <span class="text-xs font-semibold text-red-600">{{ t('myOrders.actionRevise') }}</span>
                  } @else if (order.status === 'PENDING_REVIEW' || order.status === 'IN_REVIEW') {
                    <span class="text-xs font-semibold text-amber-600">{{ t('myOrders.actionWaiting') }}</span>
                  } @else if (order.status === 'DELIVERED') {
                    <span class="text-xs font-semibold text-emerald-600">{{ t('myOrders.actionDone') }}</span>
                  }
                </div>
              </a>
            }
          </div>

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
      </div>
    </app-main-layout>
  `,
})
export class TranslatorMyOrdersComponent implements OnInit {
  private readonly api = inject(ApiService);

  loading = signal(true);
  allOrders = signal<TranslatorOrder[]>([]);
  displayOrders = signal<TranslatorOrder[]>([]);
  activeTab = signal<TabKey>('ACTIVE');
  searchInput = signal('');
  activeSearch = signal('');
  currentPage = signal(0);
  totalPages = signal(1);

  tabs: { key: TabKey; label: string }[] = [
    { key: 'ACTIVE', label: 'myOrders.tabActive' },
    { key: 'REVIEW', label: 'myOrders.tabReview' },
    { key: 'DONE', label: 'myOrders.tabDone' },
    { key: 'ALL', label: 'myOrders.tabAll' },
  ];

  ngOnInit() { this.loadOrders(); }

  loadOrders() {
    this.loading.set(true);
    this.api.get<PageResponse<TranslatorOrder>>('/api/v1/translator/orders/mine', { page: this.currentPage(), size: 50 }).subscribe({
      next: (res) => { this.allOrders.set(res.data?.content ?? []); this.totalPages.set(res.data?.totalPages ?? 1); this.loading.set(false); this.applyFilters(); },
      error: () => this.loading.set(false),
    });
  }

  tabCount(key: TabKey): number {
    const statuses = TAB_MAP[key];
    if (statuses.length === 0) return this.allOrders().length;
    return this.allOrders().filter(o => statuses.includes(o.status)).length;
  }

  selectTab(key: TabKey) { this.activeTab.set(key); this.applyFilters(); }

  onSearchInput(value: string) {
    this.searchInput.set(value);
    if (value.length >= 3) { this.activeSearch.set(value); this.applyFilters(); }
    else if (value.length === 0) { this.activeSearch.set(''); this.applyFilters(); }
  }
  applySearch() { this.activeSearch.set(this.searchInput()); this.applyFilters(); }
  clearSearch() { this.searchInput.set(''); this.activeSearch.set(''); this.applyFilters(); }

  applyFilters() {
    let orders = this.allOrders();
    const statuses = TAB_MAP[this.activeTab()];
    if (statuses.length > 0) orders = orders.filter(o => statuses.includes(o.status));
    const q = this.activeSearch().trim().toLowerCase();
    if (q) orders = orders.filter(o => o.documentType?.toLowerCase().includes(q) || o.sourceLanguage?.toLowerCase().includes(q) || o.targetLanguage?.toLowerCase().includes(q));
    this.displayOrders.set(orders);
  }

  goToPage(page: number) { this.currentPage.set(page); this.loadOrders(); }

  formatDate(d: string): string { if (!d) return ''; try { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); } catch { return d; } }
  camelCase(s: string): string { return s.toLowerCase().replaceAll(/_([a-z])/g, (_, c) => c.toUpperCase()); }

  getStatusBg(s: string): string { const m: Record<string,string> = { IN_PROGRESS:'bg-blue-100', PENDING_REVIEW:'bg-amber-100', IN_REVIEW:'bg-amber-100', REVISION_REQUESTED:'bg-red-100', APPROVED:'bg-emerald-100', DELIVERED:'bg-emerald-100' }; return m[s]||'bg-slate-100'; }
  getStatusIcon(s: string): string { const m: Record<string,string> = { IN_PROGRESS:'text-blue-600', PENDING_REVIEW:'text-amber-600', IN_REVIEW:'text-amber-600', REVISION_REQUESTED:'text-red-600', APPROVED:'text-emerald-600', DELIVERED:'text-emerald-600' }; return m[s]||'text-slate-500'; }
  getStatusBadge(s: string): string { const m: Record<string,string> = { IN_PROGRESS:'bg-blue-50 text-blue-700', PENDING_REVIEW:'bg-amber-50 text-amber-700', IN_REVIEW:'bg-amber-50 text-amber-700', REVISION_REQUESTED:'bg-red-50 text-red-700', APPROVED:'bg-emerald-50 text-emerald-700', DELIVERED:'bg-emerald-50 text-emerald-700' }; return m[s]||'bg-slate-50 text-slate-700'; }
}
