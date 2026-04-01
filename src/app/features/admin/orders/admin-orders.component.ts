import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MainLayoutComponent } from '../../../shared/layouts/main-layout/main-layout.component';
import { ApiService } from '../../../core/services/api.service';
import { TranslateLangPipe } from '../../../shared/pipes/translate-lang.pipe';

interface AdminOrder {
  id: string; clientId: string; clientName: string; translatorId: string | null; translatorName: string | null;
  documentType: string; sourceLanguage: string; targetLanguage: string;
  status: string; tier: string; urgency: string; deliveryType: string;
  totalPrice: number; translatorAmount: number; platformAmount: number;
  pageCount: number; createdAt: string; updatedAt: string;
}

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [MainLayoutComponent, TranslocoModule, RouterLink, FormsModule, DecimalPipe, TranslateLangPipe],
  styles: [`
    @keyframes fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    .anim { animation: fade-up 0.35s ease-out both; }
    .anim-1 { animation-delay: 0.05s; }
    .anim-2 { animation-delay: 0.1s; }
  `],
  template: `
    <app-main-layout>
      <div *transloco="let t">
        <!-- Header -->
        <div class="anim flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-3">
          <div>
            <h1 class="text-xl sm:text-2xl font-bold text-slate-900">{{ t('nav.orders') }}</h1>
            <p class="text-sm text-slate-500 mt-0.5">{{ totalElements() }} {{ t('adminOrders.results') }}</p>
          </div>
          <button (click)="exportCsv()" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            {{ t('admin.exportCsv') }}
          </button>
        </div>

        <!-- Filters Row 1: Search + Status -->
        <div class="anim anim-1 flex flex-col sm:flex-row gap-2 mb-3">
          <div class="relative flex-1">
            <svg class="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            <input type="text" [(ngModel)]="searchQuery" (ngModelChange)="onSearchInput()" (keyup.enter)="applyFilters()"
              class="w-full ps-9 pe-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              [placeholder]="t('adminOrders.searchPlaceholder')" />
          </div>
          <select [(ngModel)]="statusFilter" (ngModelChange)="applyFilters()" class="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 min-w-[160px]">
            <option value="">{{ t('common.allStatuses') }}</option>
            <option value="PAID">{{ t('status.paid') }}</option>
            <option value="ASSIGNED">{{ t('status.assigned') }}</option>
            <option value="IN_PROGRESS">{{ t('status.inProgress') }}</option>
            <option value="PENDING_REVIEW">{{ t('status.pendingReview') }}</option>
            <option value="IN_REVIEW">{{ t('status.inReview') }}</option>
            <option value="REVISION_REQUESTED">{{ t('status.revisionRequested') }}</option>
            <option value="APPROVED">{{ t('status.approved') }}</option>
            <option value="PENDING_DELIVERY">{{ t('status.pendingDelivery') }}</option>
            <option value="DELIVERED">{{ t('status.delivered') }}</option>
            <option value="CANCELLED">{{ t('status.cancelled') }}</option>
          </select>
        </div>

        <!-- Filters Row 2: Tier + Urgency + Delivery -->
        <div class="anim anim-1 flex flex-col sm:flex-row gap-2 mb-5">
          <select [(ngModel)]="tierFilter" (ngModelChange)="applyFilters()" class="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500">
            <option value="">{{ t('adminOrders.allTiers') }}</option>
            <option value="OFFICIAL">{{ t('order.official') }}</option>
            <option value="STANDARD">{{ t('order.standard') }}</option>
          </select>
          <select [(ngModel)]="urgencyFilter" (ngModelChange)="applyFilters()" class="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500">
            <option value="">{{ t('adminOrders.allUrgencies') }}</option>
            <option value="NORMAL">{{ t('order.normal') }}</option>
            <option value="EXPRESS">{{ t('order.express') }}</option>
          </select>
          <select [(ngModel)]="deliveryFilter" (ngModelChange)="applyFilters()" class="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500">
            <option value="">{{ t('adminOrders.allDelivery') }}</option>
            <option value="DIGITAL">{{ t('order.digital') }}</option>
            <option value="PHYSICAL">{{ t('order.physical') }}</option>
            <option value="PICKUP">{{ t('order.pickup') }}</option>
          </select>
          <select [(ngModel)]="sortOrder" (ngModelChange)="applyFilters()" class="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500">
            <option value="createdAt,desc">{{ t('adminOrders.sortNewest') }}</option>
            <option value="createdAt,asc">{{ t('adminOrders.sortOldest') }}</option>
            <option value="totalPrice,desc">{{ t('adminOrders.sortPriceHigh') }}</option>
            <option value="totalPrice,asc">{{ t('adminOrders.sortPriceLow') }}</option>
          </select>
          @if (hasActiveFilters()) {
            <button (click)="clearFilters()" class="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition-colors cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              {{ t('adminOrders.clearFilters') }}
            </button>
          }
        </div>

        <!-- Content -->
        @if (loading()) {
          <div class="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <svg class="w-6 h-6 animate-spin text-blue-500 mx-auto" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
          </div>
        } @else if (orders().length === 0) {
          <div class="anim anim-2 rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <svg class="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
            <p class="text-sm font-semibold text-slate-500">{{ t('common.noData') }}</p>
          </div>
        } @else {
          <!-- Mobile Cards -->
          <div class="anim anim-2 sm:hidden space-y-2">
            @for (o of orders(); track o.id) {
              <a [routerLink]="['/admin/orders', o.id]" class="block rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-300 transition-colors">
                <div class="flex items-start justify-between gap-2 mb-2">
                  <div class="min-w-0">
                    <p class="text-sm font-bold text-slate-800 truncate">{{ o.documentType }}</p>
                    <p class="text-xs text-slate-500"><bdi dir="ltr">{{ o.sourceLanguage | translateLang }} &rarr; {{ o.targetLanguage | translateLang }}</bdi></p>
                  </div>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" [class]="statusBadge(o.status)">{{ t('status.' + camelCase(o.status)) }}</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-500">{{ o.clientName }}</span>
                  <span class="font-bold text-slate-800">{{ o.totalPrice | number }} {{ t('common.currency') }}</span>
                </div>
                <div class="flex items-center justify-between text-xs mt-1">
                  <span class="text-slate-400">{{ o.translatorName ?? t('adminOrders.unassigned') }}</span>
                  <span class="text-slate-400">{{ formatDate(o.createdAt) }}</span>
                </div>
              </a>
            }
          </div>

          <!-- Desktop Table -->
          <div class="anim anim-2 hidden sm:block rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-slate-50/80 border-b border-slate-200">
                  <tr>
                    <th class="px-3 py-2.5 text-start text-[10px] font-bold text-slate-500 uppercase tracking-wider">ID</th>
                    <th class="px-3 py-2.5 text-start text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('admin.client') }}</th>
                    <th class="px-3 py-2.5 text-start text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('order.documentType') }}</th>
                    <th class="px-3 py-2.5 text-start text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('order.languages') }}</th>
                    <th class="px-3 py-2.5 text-start text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('common.status') }}</th>
                    <th class="px-3 py-2.5 text-start text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('admin.translator') }}</th>
                    <th class="px-3 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('order.tier') }}</th>
                    <th class="px-3 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('order.urgency') }}</th>
                    <th class="px-3 py-2.5 text-end text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('order.price') }}</th>
                    <th class="px-3 py-2.5 text-end text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('common.date') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (o of orders(); track o.id) {
                    <tr class="hover:bg-slate-50/50 transition-colors group">
                      <!-- ID -->
                      <td class="px-3 py-2.5">
                        <a [routerLink]="['/admin/orders', o.id]" class="text-xs font-mono text-blue-600 hover:text-blue-700 hover:underline">#{{ o.id.substring(0, 8) }}</a>
                      </td>
                      <!-- Client -->
                      <td class="px-3 py-2.5">
                        <a [routerLink]="['/admin/users', o.clientId]" class="text-sm text-slate-700 hover:text-blue-600 hover:underline" (click)="$event.stopPropagation()">{{ o.clientName }}</a>
                      </td>
                      <!-- Document -->
                      <td class="px-3 py-2.5 text-sm text-slate-700 max-w-[140px] truncate">{{ o.documentType }}</td>
                      <!-- Languages -->
                      <td class="px-3 py-2.5 text-sm text-slate-600 whitespace-nowrap"><bdi dir="ltr">{{ o.sourceLanguage | translateLang }} &rarr; {{ o.targetLanguage | translateLang }}</bdi></td>
                      <!-- Status -->
                      <td class="px-3 py-2.5">
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" [class]="statusBadge(o.status)">{{ t('status.' + camelCase(o.status)) }}</span>
                      </td>
                      <!-- Translator -->
                      <td class="px-3 py-2.5">
                        @if (o.translatorId) {
                          <a [routerLink]="['/admin/users', o.translatorId]" class="text-sm text-slate-700 hover:text-blue-600 hover:underline" (click)="$event.stopPropagation()">{{ o.translatorName }}</a>
                        } @else {
                          <span class="text-xs text-slate-400 italic">{{ t('adminOrders.unassigned') }}</span>
                        }
                      </td>
                      <!-- Tier -->
                      <td class="px-3 py-2.5 text-center">
                        <span class="text-[10px] font-bold px-1.5 py-0.5 rounded" [class]="o.tier === 'OFFICIAL' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'">{{ o.tier }}</span>
                      </td>
                      <!-- Urgency -->
                      <td class="px-3 py-2.5 text-center">
                        @if (o.urgency === 'EXPRESS') {
                          <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">EXPRESS</span>
                        } @else {
                          <span class="text-xs text-slate-400">Normal</span>
                        }
                      </td>
                      <!-- Price -->
                      <td class="px-3 py-2.5 text-end text-sm font-bold text-slate-800 whitespace-nowrap">{{ o.totalPrice | number }} {{ t('common.currency') }}</td>
                      <!-- Date -->
                      <td class="px-3 py-2.5 text-end text-xs text-slate-500 whitespace-nowrap">{{ formatDate(o.createdAt) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div class="flex items-center justify-between mt-4 px-1">
              <p class="text-xs text-slate-500">
                {{ t('table.showing') }} {{ currentPage() * pageSize + 1 }}-{{ min((currentPage() + 1) * pageSize, totalElements()) }} {{ t('table.of') }} {{ totalElements() }}
              </p>
              <div class="flex gap-1">
                <button (click)="goToPage(0)" [disabled]="currentPage() === 0"
                  class="px-2 py-1 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed">
                  &laquo;
                </button>
                <button (click)="goToPage(currentPage() - 1)" [disabled]="currentPage() === 0"
                  class="px-3 py-1 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed">
                  {{ t('table.prev') }}
                </button>
                @for (p of visiblePages(); track p) {
                  <button (click)="goToPage(p)" class="px-3 py-1 rounded-lg border text-xs font-medium transition-colors"
                    [class]="p === currentPage() ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'">
                    {{ p + 1 }}
                  </button>
                }
                <button (click)="goToPage(currentPage() + 1)" [disabled]="currentPage() >= totalPages() - 1"
                  class="px-3 py-1 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed">
                  {{ t('table.next') }}
                </button>
                <button (click)="goToPage(totalPages() - 1)" [disabled]="currentPage() >= totalPages() - 1"
                  class="px-2 py-1 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed">
                  &raquo;
                </button>
              </div>
            </div>
          }
        }
      </div>
    </app-main-layout>
  `,
})
export class AdminOrdersComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly transloco = inject(TranslocoService);

  loading = signal(true);
  orders = signal<AdminOrder[]>([]);
  currentPage = signal(0);
  totalPages = signal(1);
  totalElements = signal(0);
  pageSize = 15;

  statusFilter = '';
  tierFilter = '';
  urgencyFilter = '';
  deliveryFilter = '';
  searchQuery = '';

  private searchTimeout: any;
  sortOrder = 'createdAt,desc';

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.loading.set(true);
    const params: Record<string, string | number> = {
      page: this.currentPage(),
      size: this.pageSize,
      sort: this.sortOrder,
    };
    if (this.statusFilter) params['status'] = this.statusFilter;
    if (this.tierFilter) params['tier'] = this.tierFilter;
    if (this.urgencyFilter) params['urgency'] = this.urgencyFilter;
    if (this.deliveryFilter) params['deliveryType'] = this.deliveryFilter;
    if (this.searchQuery.trim()) params['search'] = this.searchQuery.trim();

    this.api.get<any>('/api/v1/admin/orders', params).subscribe({
      next: (res) => {
        const data = res.data;
        this.orders.set(data?.content ?? []);
        this.totalPages.set(data?.totalPages ?? 1);
        this.totalElements.set(data?.totalElements ?? 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  applyFilters() {
    this.currentPage.set(0);
    this.loadOrders();
  }

  clearFilters() {
    this.statusFilter = '';
    this.tierFilter = '';
    this.urgencyFilter = '';
    this.deliveryFilter = '';
    this.searchQuery = '';
    this.applyFilters();
  }

  onSearchInput() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.applyFilters(), 400);
  }

  hasActiveFilters(): boolean {
    return !!(this.statusFilter || this.tierFilter || this.urgencyFilter || this.deliveryFilter || this.searchQuery.trim());
  }

  goToPage(page: number) {
    if (page < 0 || page >= this.totalPages()) return;
    this.currentPage.set(page);
    this.loadOrders();
  }

  visiblePages(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    const start = Math.max(0, current - 2);
    const end = Math.min(total - 1, current + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  exportCsv() {
    window.open('/api/v1/admin/orders/export', '_blank');
  }

  min(a: number, b: number): number { return Math.min(a, b); }

  statusBadge(status: string): string {
    const m: Record<string, string> = {
      PAID: 'bg-green-100 text-green-700', ASSIGNED: 'bg-blue-100 text-blue-700',
      IN_PROGRESS: 'bg-blue-100 text-blue-700', PENDING_REVIEW: 'bg-purple-100 text-purple-700',
      IN_REVIEW: 'bg-purple-100 text-purple-700', REVISION_REQUESTED: 'bg-red-100 text-red-700',
      APPROVED: 'bg-emerald-100 text-emerald-700', PENDING_DELIVERY: 'bg-amber-100 text-amber-700',
      DELIVERED: 'bg-emerald-100 text-emerald-700', CANCELLED: 'bg-red-100 text-red-700',
      DISPUTED: 'bg-orange-100 text-orange-700', SUSPENDED: 'bg-slate-200 text-slate-600',
    };
    return m[status] || 'bg-slate-100 text-slate-600';
  }

  camelCase(s: string): string { return s.toLowerCase().replaceAll(/_([a-z])/g, (_: string, c: string) => c.toUpperCase()); }

  formatDate(d: string): string {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' }); }
    catch { return d; }
  }
}
