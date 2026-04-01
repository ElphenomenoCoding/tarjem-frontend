import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MainLayoutComponent } from '../../../shared/layouts/main-layout/main-layout.component';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { HttpErrorResponse } from '@angular/common/http';

interface FinanceSummary { totalRevenue: number; pendingCommissions: number; paidCommissions: number; totalOrders: number; activeTranslators: number; }
interface Commission { id: string; orderId: string; userId: string; type: string; amount: number; status: string; paidAt: string | null; createdAt: string; }
interface Withdrawal { id: string; userId: string; userName: string; amount: number; status: string; note: string; adminNote: string; createdAt: string; }

@Component({
  selector: 'app-admin-finance',
  standalone: true,
  imports: [MainLayoutComponent, TranslocoModule, RouterLink, DecimalPipe, FormsModule],
  styles: [`@keyframes fade-up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}.anim{animation:fade-up .35s ease-out both}.anim-1{animation-delay:.05s}.anim-2{animation-delay:.1s}.anim-3{animation-delay:.15s}`],
  template: `
    <app-main-layout>
      <div *transloco="let t">
        <div class="anim mb-6">
          <h1 class="text-xl sm:text-2xl font-bold text-slate-900">{{ t('nav.finance') }}</h1>
          <p class="text-sm text-slate-500 mt-0.5">{{ t('adminFinance.subtitle') }}</p>
        </div>

        <!-- KPI Cards -->
        <div class="anim anim-1 grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <div class="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4">
            <p class="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{{ t('finance.totalRevenue') }}</p>
            <p class="text-2xl font-black text-emerald-700 mt-1">{{ summary()?.totalRevenue ?? 0 | number }} {{ t('common.currency') }}</p>
          </div>
          <div class="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4">
            <p class="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{{ t('adminFinance.platformRevenue') }}</p>
            <p class="text-2xl font-black text-blue-700 mt-1">{{ platformRevenue() | number }} {{ t('common.currency') }}</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white p-4">
            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('finance.paidCommissions') }}</p>
            <p class="text-2xl font-black text-slate-800 mt-1">{{ summary()?.paidCommissions ?? 0 | number }} {{ t('common.currency') }}</p>
          </div>
          <div class="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p class="text-[10px] font-bold text-amber-600 uppercase tracking-wider">{{ t('adminFinance.pendingWithdrawals') }}</p>
            <p class="text-2xl font-black text-amber-700 mt-1">{{ pendingWithdrawals().length }}</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white p-4">
            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('admin.totalOrders') }}</p>
            <p class="text-2xl font-black text-slate-800 mt-1">{{ summary()?.totalOrders ?? 0 }}</p>
          </div>
        </div>

        <!-- Tabs -->
        <div class="anim anim-2 flex gap-1 mb-4 border-b border-slate-200">
          @for (tab of tabs; track tab.key) {
            <button (click)="activeTab = tab.key"
              class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer"
              [class]="activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'">
              {{ t(tab.label) }}
              @if (tab.key === 'withdrawals' && pendingWithdrawals().length > 0) {
                <span class="ms-1.5 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-red-500 text-white">{{ pendingWithdrawals().length }}</span>
              }
            </button>
          }
        </div>

        <!-- Tab: Withdrawal Requests -->
        @if (activeTab === 'withdrawals') {
          <div class="anim anim-3">
            <div class="flex gap-2 mb-4">
              <select [(ngModel)]="withdrawalStatusFilter" (ngModelChange)="loadWithdrawals()" class="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500">
                <option value="">{{ t('common.allStatuses') }}</option>
                <option value="PENDING">{{ t('status.pending') }}</option>
                <option value="COMPLETED">{{ t('adminFinance.completed') }}</option>
                <option value="REJECTED">{{ t('admin.reject') }}</option>
              </select>
            </div>
            @if (withdrawals().length === 0) {
              <div class="rounded-2xl border border-slate-200 bg-white p-12 text-center"><p class="text-sm text-slate-500">{{ t('common.noData') }}</p></div>
            } @else {
              <div class="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <table class="w-full">
                  <thead class="bg-slate-50/80 border-b border-slate-200"><tr>
                    <th class="px-4 py-2.5 text-start text-[10px] font-bold text-slate-500 uppercase">{{ t('admin.translator') }}</th>
                    <th class="px-4 py-2.5 text-end text-[10px] font-bold text-slate-500 uppercase">{{ t('commission.amount') }}</th>
                    <th class="px-4 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase">{{ t('common.status') }}</th>
                    <th class="px-4 py-2.5 text-start text-[10px] font-bold text-slate-500 uppercase">{{ t('adminFinance.note') }}</th>
                    <th class="px-4 py-2.5 text-end text-[10px] font-bold text-slate-500 uppercase">{{ t('common.date') }}</th>
                    <th class="px-4 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase">{{ t('admin.actions') }}</th>
                  </tr></thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (w of withdrawals(); track w.id) {
                      <tr class="hover:bg-slate-50/50">
                        <td class="px-4 py-3">
                          <a [routerLink]="['/admin/translators', w.userId]" class="text-sm text-blue-600 hover:underline font-medium">{{ w.userName }}</a>
                        </td>
                        <td class="px-4 py-3 text-sm font-bold text-red-600 text-end">{{ w.amount | number }} {{ t('common.currency') }}</td>
                        <td class="px-4 py-3 text-center">
                          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full" [class]="withdrawalBadge(w.status)">{{ w.status }}</span>
                        </td>
                        <td class="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate">{{ w.note || w.adminNote || '-' }}</td>
                        <td class="px-4 py-3 text-xs text-slate-500 text-end">{{ formatDate(w.createdAt) }}</td>
                        <td class="px-4 py-3 text-center">
                          @if (w.status === 'PENDING') {
                            <div class="flex gap-1 justify-center">
                              <button (click)="approveWithdrawal(w.id)" [disabled]="processing()" class="px-2.5 py-1 text-[10px] font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 cursor-pointer">{{ t('adminFinance.approveBtn') }}</button>
                              <button (click)="openRejectWithdrawal(w.id)" class="px-2.5 py-1 text-[10px] font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 cursor-pointer">{{ t('adminFinance.rejectBtn') }}</button>
                            </div>
                          }
                          @if (w.status === 'REJECTED' && w.adminNote) {
                            <span class="text-[10px] text-red-500">{{ w.adminNote }}</span>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }

        <!-- Tab: Commissions -->
        @if (activeTab === 'commissions') {
          <div class="anim anim-3 rounded-2xl border border-slate-200 bg-white overflow-hidden">
            @if (commissions().length === 0) {
              <p class="text-sm text-slate-400 text-center py-8">{{ t('common.noData') }}</p>
            } @else {
              <table class="w-full">
                <thead class="bg-slate-50/80 border-b border-slate-200"><tr>
                  <th class="px-4 py-2.5 text-start text-[10px] font-bold text-slate-500 uppercase">{{ t('order.order') }}</th>
                  <th class="px-4 py-2.5 text-start text-[10px] font-bold text-slate-500 uppercase">{{ t('admin.translator') }}</th>
                  <th class="px-4 py-2.5 text-end text-[10px] font-bold text-slate-500 uppercase">{{ t('commission.amount') }}</th>
                  <th class="px-4 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase">{{ t('common.status') }}</th>
                  <th class="px-4 py-2.5 text-end text-[10px] font-bold text-slate-500 uppercase">{{ t('common.date') }}</th>
                </tr></thead>
                <tbody class="divide-y divide-slate-100">
                  @for (c of commissions(); track c.id) {
                    <tr class="hover:bg-slate-50/50">
                      <td class="px-4 py-2.5"><a [routerLink]="['/admin/orders', c.orderId]" class="text-xs font-mono text-blue-600 hover:underline">#{{ c.orderId.substring(0,8) }}</a></td>
                      <td class="px-4 py-2.5"><a [routerLink]="['/admin/translators', c.userId]" class="text-sm text-blue-600 hover:underline">{{ c.userId.substring(0,8) }}</a></td>
                      <td class="px-4 py-2.5 text-sm font-bold text-emerald-600 text-end">{{ c.amount | number }} {{ t('common.currency') }}</td>
                      <td class="px-4 py-2.5 text-center"><span class="text-[10px] font-bold px-2 py-0.5 rounded-full" [class]="c.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'">{{ c.status }}</span></td>
                      <td class="px-4 py-2.5 text-xs text-slate-500 text-end">{{ formatDate(c.paidAt ?? c.createdAt) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>
        }

        <!-- Reject Withdrawal Modal -->
        @if (showRejectModal()) {
          <div class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" (click)="showRejectModal.set(false)">
            <div class="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl" (click)="$event.stopPropagation()">
              <h2 class="text-lg font-bold text-slate-900 mb-1">{{ t('adminFinance.rejectWithdrawalTitle') }}</h2>
              <p class="text-sm text-slate-500 mb-4">{{ t('adminFinance.rejectWithdrawalDesc') }}</p>
              <textarea [(ngModel)]="rejectReason" rows="3" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 resize-none mb-4" [placeholder]="t('adminFinance.rejectReasonPlaceholder')"></textarea>
              <div class="flex justify-end gap-2">
                <button (click)="showRejectModal.set(false)" class="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">{{ t('common.cancel') }}</button>
                <button (click)="rejectWithdrawal()" [disabled]="processing() || !rejectReason.trim()" class="px-4 py-2 rounded-xl bg-red-600 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-40 cursor-pointer">{{ t('adminFinance.rejectBtn') }}</button>
              </div>
            </div>
          </div>
        }
      </div>
    </app-main-layout>
  `,
})
export class AdminFinanceComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  summary = signal<FinanceSummary | null>(null);
  commissions = signal<Commission[]>([]);
  withdrawals = signal<Withdrawal[]>([]);
  pendingWithdrawals = signal<Withdrawal[]>([]);
  processing = signal(false);
  showRejectModal = signal(false);
  rejectingId = '';
  rejectReason = '';
  activeTab = 'withdrawals';
  withdrawalStatusFilter = '';

  tabs = [
    { key: 'withdrawals', label: 'adminFinance.withdrawals' },
    { key: 'commissions', label: 'nav.commissions' },
  ];

  ngOnInit() {
    this.loadSummary();
    this.loadWithdrawals();
    this.loadCommissions();
  }

  loadSummary() {
    this.api.get<FinanceSummary>('/api/v1/admin/finance/summary').subscribe({
      next: (r) => { if (r.data) this.summary.set(r.data); },
    });
  }

  loadWithdrawals() {
    const p: any = { size: 50, sort: 'createdAt,desc' };
    if (this.withdrawalStatusFilter) p.status = this.withdrawalStatusFilter;
    this.api.get<any>('/api/v1/admin/withdrawals', p).subscribe({
      next: (r) => {
        const items = r.data?.content ?? [];
        this.withdrawals.set(items);
        this.pendingWithdrawals.set(items.filter((w: Withdrawal) => w.status === 'PENDING'));
      },
    });
  }

  loadCommissions() {
    this.api.get<any>('/api/v1/admin/commissions', { size: 50, sort: 'createdAt,desc' }).subscribe({
      next: (r) => this.commissions.set(r.data?.content ?? []),
    });
  }

  platformRevenue(): number {
    const s = this.summary();
    if (!s) return 0;
    return s.totalRevenue - s.paidCommissions - (s.pendingCommissions ?? 0);
  }

  approveWithdrawal(id: string) {
    this.processing.set(true);
    this.api.patch(`/api/v1/admin/withdrawals/${id}/approve`, {}).subscribe({
      next: () => {
        this.processing.set(false);
        this.toast.success(this.transloco.translate('adminFinance.approvedSuccess'));
        this.loadWithdrawals();
        this.loadSummary();
      },
      error: (e: HttpErrorResponse) => { this.processing.set(false); this.toast.error(e.error?.message || 'Error'); },
    });
  }

  openRejectWithdrawal(id: string) {
    this.rejectingId = id;
    this.rejectReason = '';
    this.showRejectModal.set(true);
  }

  rejectWithdrawal() {
    this.processing.set(true);
    this.api.patch(`/api/v1/admin/withdrawals/${this.rejectingId}/reject`, { reason: this.rejectReason }).subscribe({
      next: () => {
        this.processing.set(false);
        this.showRejectModal.set(false);
        this.toast.success(this.transloco.translate('adminFinance.rejectedSuccess'));
        this.loadWithdrawals();
        this.loadSummary();
      },
      error: (e: HttpErrorResponse) => { this.processing.set(false); this.toast.error(e.error?.message || 'Error'); },
    });
  }

  withdrawalBadge(s: string): string {
    const m: Record<string, string> = { PENDING: 'bg-amber-100 text-amber-700', COMPLETED: 'bg-emerald-100 text-emerald-700', REJECTED: 'bg-red-100 text-red-700', APPROVED: 'bg-emerald-100 text-emerald-700' };
    return m[s] || 'bg-slate-100 text-slate-600';
  }

  formatDate(d: string): string { if (!d) return ''; try { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' }); } catch { return d; } }
}
