import { Component, inject, signal, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MainLayoutComponent } from '../../../shared/layouts/main-layout/main-layout.component';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { HttpErrorResponse } from '@angular/common/http';
import { AnalyticsService } from '../../../core/services/analytics.service';

interface WalletSummary { balance: number; totalEarned: number; totalWithdrawn: number; pendingWithdrawals: number; }
interface WalletTransaction { id: string; type: string; amount: number; balanceAfter: number; description: string; referenceId: string; createdAt: string; }

@Component({
  selector: 'app-translator-commissions',
  standalone: true,
  imports: [MainLayoutComponent, TranslocoModule, FormsModule, DecimalPipe],
  styles: [`
    @keyframes fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    .anim { animation: fade-up 0.35s ease-out both; }
    .anim-1 { animation-delay: 0.05s; }
    .anim-2 { animation-delay: 0.1s; }
    .anim-3 { animation-delay: 0.15s; }
  `],
  template: `
    <app-main-layout>
      <div *transloco="let t">
        <!-- Header -->
        <div class="anim flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
          <div>
            <h1 class="text-xl sm:text-2xl font-bold text-slate-900">{{ t('wallet.title') }}</h1>
            <p class="text-sm text-slate-500 mt-0.5">{{ t('wallet.subtitle') }}</p>
          </div>
          <div class="flex gap-2">
            <button (click)="showExportToast()" class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-400 cursor-not-allowed opacity-60" disabled>
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
              {{ t('wallet.export') }}
            </button>
            <button (click)="showWithdrawModal.set(true)" [disabled]="!summary() || summary()!.balance <= 0"
              class="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
              {{ t('wallet.withdraw') }}
            </button>
          </div>
        </div>

        <!-- Summary Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div class="anim anim-1 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4">
            <p class="text-xs font-semibold text-emerald-600 uppercase tracking-wider">{{ t('wallet.balance') }}</p>
            <p class="text-2xl font-black text-emerald-700 mt-1">{{ (summary()?.balance ?? 0) | number }} {{ t('common.currency') }}</p>
          </div>
          <div class="anim anim-1 rounded-2xl border border-slate-200 bg-white p-4">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">{{ t('wallet.totalEarned') }}</p>
            <p class="text-2xl font-black text-slate-800 mt-1">{{ (summary()?.totalEarned ?? 0) | number }} {{ t('common.currency') }}</p>
          </div>
          <div class="anim anim-1 rounded-2xl border border-slate-200 bg-white p-4">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">{{ t('wallet.totalWithdrawn') }}</p>
            <p class="text-2xl font-black text-red-600 mt-1">{{ (summary()?.totalWithdrawn ?? 0) | number }} {{ t('common.currency') }}</p>
          </div>
          <div class="anim anim-1 rounded-2xl border border-slate-200 bg-white p-4">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">{{ t('wallet.pendingWithdrawals') }}</p>
            <p class="text-2xl font-black text-amber-600 mt-1">{{ summary()?.pendingWithdrawals ?? 0 }}</p>
          </div>
        </div>

        <!-- Filters -->
        <div class="anim anim-2 flex flex-col sm:flex-row gap-3 mb-4">
          <div class="relative flex-1">
            <svg class="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            <input type="text" [(ngModel)]="searchQuery" (ngModelChange)="applySearch()" class="w-full ps-9 pe-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500" [placeholder]="t('wallet.searchPlaceholder')" />
          </div>
          <select [(ngModel)]="typeFilter" (ngModelChange)="loadHistory()" class="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500">
            <option value="">{{ t('wallet.allTypes') }}</option>
            <option value="EARNING">{{ t('wallet.earnings') }}</option>
            <option value="WITHDRAWAL">{{ t('wallet.withdrawals') }}</option>
            <option value="ADMIN_DEBIT">{{ t('wallet.debits') }}</option>
          </select>
        </div>

        <!-- Transaction History -->
        <div class="anim anim-3">
          <div class="flex items-center gap-2 mb-3">
            <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <h2 class="text-sm font-bold text-slate-900">{{ t('wallet.history') }}</h2>
            <span class="text-xs text-slate-400 ms-auto">{{ filteredTransactions().length }} {{ t('myOrders.results') }}</span>
          </div>

          @if (loading()) {
            <div class="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <svg class="w-6 h-6 animate-spin text-blue-500 mx-auto" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
            </div>
          } @else if (filteredTransactions().length === 0) {
            <div class="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <svg class="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
              <p class="text-sm font-semibold text-slate-500">{{ t('wallet.noTransactions') }}</p>
              <p class="text-xs text-slate-400 mt-1">{{ t('wallet.noTransactionsDesc') }}</p>
            </div>
          } @else {
            <!-- Mobile Cards -->
            <div class="sm:hidden space-y-2">
              @for (tx of filteredTransactions(); track tx.id) {
                <div class="rounded-xl border border-slate-200 bg-white p-4 cursor-pointer hover:border-slate-300 transition-all" (click)="openOrder(tx)">
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2.5 min-w-0">
                      <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0" [class]="tx.amount >= 0 ? 'bg-emerald-100' : 'bg-red-100'">
                        <svg class="w-4 h-4" [class]="tx.amount >= 0 ? 'text-emerald-600' : 'text-red-600'" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                          @if (tx.amount >= 0) { <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75" /> }
                          @else { <path stroke-linecap="round" stroke-linejoin="round" d="M12 19.5v-15m0 0l-6.75 6.75M12 4.5l6.75 6.75" /> }
                        </svg>
                      </div>
                      <div class="min-w-0">
                        <p class="text-sm font-semibold text-slate-800 truncate">{{ tx.description }}</p>
                        <div class="flex items-center gap-2 mt-0.5">
                          <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full" [class]="typeBadge(tx.type)">{{ t('wallet.' + tx.type) }}</span>
                          <span class="text-[10px] text-slate-400">{{ formatDateTime(tx.createdAt) }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="text-end shrink-0">
                      <p class="text-sm font-black" [class]="tx.amount >= 0 ? 'text-emerald-600' : 'text-red-600'">{{ tx.amount >= 0 ? '+' : '' }}{{ tx.amount | number }} {{ t('common.currency') }}</p>
                      <p class="text-[10px] text-slate-400">{{ tx.balanceAfter | number }} {{ t('common.currency') }}</p>
                    </div>
                  </div>
                </div>
              }
            </div>

            <!-- Desktop Table -->
            <div class="hidden sm:block rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <table class="w-full">
                <thead class="bg-slate-50/80 border-b border-slate-200">
                  <tr>
                    <th class="px-4 py-3 text-start text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('common.date') }}</th>
                    <th class="px-4 py-3 text-start text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type</th>
                    <th class="px-4 py-3 text-start text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('common.description') }}</th>
                    <th class="px-4 py-3 text-end text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('commission.amount') }}</th>
                    <th class="px-4 py-3 text-end text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('wallet.balance') }}</th>
                    <th class="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('common.actions') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (tx of filteredTransactions(); track tx.id) {
                    <tr class="hover:bg-slate-50/50 transition-colors">
                      <td class="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{{ formatDateTime(tx.createdAt) }}</td>
                      <td class="px-4 py-3">
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full" [class]="typeBadge(tx.type)">{{ t('wallet.' + tx.type) }}</span>
                      </td>
                      <td class="px-4 py-3 text-sm text-slate-700 max-w-xs truncate">{{ tx.description }}</td>
                      <td class="px-4 py-3 text-end">
                        <span class="text-sm font-bold" [class]="tx.amount >= 0 ? 'text-emerald-600' : 'text-red-600'">{{ tx.amount >= 0 ? '+' : '' }}{{ tx.amount | number }} {{ t('common.currency') }}</span>
                      </td>
                      <td class="px-4 py-3 text-end text-sm text-slate-500">{{ tx.balanceAfter | number }} {{ t('common.currency') }}</td>
                      <td class="px-4 py-3 text-center">
                        @if (tx.referenceId && tx.type === 'EARNING') {
                          <a [href]="'/translator/orders/' + tx.referenceId + '/workspace'" target="_blank"
                            class="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                            {{ t('wallet.viewOrder') }}
                          </a>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            @if (totalPages() > 1) {
              <div class="flex justify-center gap-2 mt-4">
                <button (click)="changePage(currentPage() - 1)" [disabled]="currentPage() === 0"
                  class="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                  {{ t('table.prev') }}
                </button>
                <span class="px-3 py-1.5 text-sm text-slate-500">{{ currentPage() + 1 }} / {{ totalPages() }}</span>
                <button (click)="changePage(currentPage() + 1)" [disabled]="currentPage() >= totalPages() - 1"
                  class="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                  {{ t('table.next') }}
                </button>
              </div>
            }
          }
        </div>

        <!-- Withdrawal Modal -->
        @if (showWithdrawModal()) {
          <div class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" (click)="showWithdrawModal.set(false)">
            <div class="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl" (click)="$event.stopPropagation()">
              <h2 class="text-lg font-bold text-slate-900 mb-1">{{ t('wallet.withdrawTitle') }}</h2>
              <p class="text-sm text-slate-500 mb-4">{{ t('wallet.withdrawDesc') }}</p>

              <div class="mb-3">
                <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{{ t('wallet.withdrawAmount') }}</label>
                <input type="number" [(ngModel)]="withdrawAmount" min="500" [max]="summary()?.balance ?? 0"
                  class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  [placeholder]="t('wallet.withdrawAmountPlaceholder')" />
              </div>
              <div class="mb-4">
                <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{{ t('wallet.withdrawNote') }}</label>
                <textarea [(ngModel)]="withdrawNote" rows="2"
                  class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                  [placeholder]="t('wallet.withdrawNotePlaceholder')"></textarea>
              </div>

              @if (summary() && withdrawAmount > (summary()?.balance ?? 0)) {
                <p class="text-xs text-red-500 mb-3">{{ t('wallet.insufficientBalance') }}</p>
              }
              @if (withdrawAmount > 0 && withdrawAmount < 500) {
                <p class="text-xs text-red-500 mb-3">{{ t('wallet.withdrawMin') }}</p>
              }

              <div class="flex justify-end gap-2">
                <button (click)="showWithdrawModal.set(false)" class="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">{{ t('common.cancel') }}</button>
                <button (click)="submitWithdrawal()" [disabled]="withdrawing() || withdrawAmount < 500 || withdrawAmount > (summary()?.balance ?? 0)"
                  class="px-4 py-2 rounded-xl bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                  @if (withdrawing()) { <svg class="w-4 h-4 animate-spin inline me-1" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> }
                  {{ t('wallet.withdrawSubmit') }}
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </app-main-layout>
  `,
})
export class TranslatorCommissionsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly analytics = inject(AnalyticsService);

  loading = signal(true);
  summary = signal<WalletSummary | null>(null);
  transactions = signal<WalletTransaction[]>([]);
  filteredTransactions = signal<WalletTransaction[]>([]);
  currentPage = signal(0);
  totalPages = signal(0);

  typeFilter = '';
  searchQuery = '';

  showWithdrawModal = signal(false);
  withdrawing = signal(false);
  withdrawAmount = 0;
  withdrawNote = '';

  ngOnInit() {
    this.loadSummary();
    this.loadHistory();
  }

  loadSummary() {
    this.api.get<WalletSummary>('/api/v1/translator/wallet/summary').subscribe({
      next: (res) => { if (res.data) this.summary.set(res.data); },
    });
  }

  loadHistory() {
    this.loading.set(true);
    const params: any = { page: this.currentPage(), size: 20 };
    if (this.typeFilter) params.type = this.typeFilter;
    this.api.get<any>('/api/v1/translator/wallet/history', params).subscribe({
      next: (res) => {
        const data = res.data;
        const items = Array.isArray(data) ? data : data?.content ?? [];
        this.transactions.set(items);
        this.filteredTransactions.set(this.filterBySearch(items));
        this.totalPages.set(data?.totalPages ?? 1);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  applySearch() {
    this.filteredTransactions.set(this.filterBySearch(this.transactions()));
  }

  private filterBySearch(items: WalletTransaction[]): WalletTransaction[] {
    if (!this.searchQuery.trim()) return items;
    const q = this.searchQuery.toLowerCase();
    return items.filter(tx => tx.description?.toLowerCase().includes(q) || tx.referenceId?.toLowerCase().includes(q));
  }

  changePage(page: number) {
    if (page < 0 || page >= this.totalPages()) return;
    this.currentPage.set(page);
    this.loadHistory();
  }

  submitWithdrawal() {
    this.withdrawing.set(true);
    this.api.post('/api/v1/translator/wallet/withdraw', { amount: this.withdrawAmount, note: this.withdrawNote }).subscribe({
      next: () => {
        this.withdrawing.set(false);
        this.showWithdrawModal.set(false);
        this.withdrawAmount = 0;
        this.withdrawNote = '';
        this.toast.success(this.transloco.translate('wallet.withdrawSuccess'));
        this.analytics.track('translator_withdrawal_requested');
        this.loadSummary();
        this.loadHistory();
      },
      error: (err: HttpErrorResponse) => {
        this.withdrawing.set(false);
        this.toast.error(err.error?.message || this.transloco.translate('common.error'));
      },
    });
  }

  openOrder(tx: WalletTransaction) {
    if (tx.referenceId && tx.type === 'EARNING') {
      window.open('/translator/orders/' + tx.referenceId + '/workspace', '_blank');
    }
  }

  showExportToast() {
    this.toast.info(this.transloco.translate('wallet.exportDisabled'));
  }

  typeBadge(type: string): string {
    const m: Record<string, string> = {
      EARNING: 'bg-emerald-100 text-emerald-700',
      WITHDRAWAL: 'bg-red-100 text-red-700',
      ADMIN_DEBIT: 'bg-amber-100 text-amber-700',
    };
    return m[type] || 'bg-slate-100 text-slate-600';
  }

  formatDateTime(d: string): string {
    if (!d) return '';
    try { return new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
    catch { return d; }
  }
}
