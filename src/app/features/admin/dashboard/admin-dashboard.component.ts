import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { TranslocoModule } from '@jsverse/transloco';
import { MainLayoutComponent } from '../../../shared/layouts/main-layout/main-layout.component';
import { ApiService } from '../../../core/services/api.service';
import { TranslateLangPipe } from '../../../shared/pipes/translate-lang.pipe';

interface RecentOrder {
  id: string; documentType: string; sourceLanguage: string; targetLanguage: string;
  status: string; totalPrice: number; createdAt: string; estimatedDeliveryDate: string | null;
}

interface DashboardStats {
  totalUsers: number; totalClients: number; totalTranslators: number;
  activeTranslators: number; pendingTranslators: number;
  totalOrders: number; pendingReviewOrders: number; inProgressOrders: number;
  deliveredOrders: number; cancelledOrders: number;
  totalRevenue: number; totalCommissionsPaid: number; platformEarnings: number;
  pendingWithdrawals: number;
  languagePairs: { sourceLanguage: string; targetLanguage: string; status: string; translatorCount: number }[];
  topTranslators: { id: string; firstName: string; lastName: string; completedOrders: number; totalEarnings: number }[];
  recentOrders: RecentOrder[];
  ordersByStatus: { status: string; count: number }[];
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [MainLayoutComponent, TranslocoModule, RouterLink, DecimalPipe, TranslateLangPipe],
  styles: [`
    @keyframes fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    .anim { animation: fade-up 0.35s ease-out both; }
    .anim-1 { animation-delay: 0.05s; } .anim-2 { animation-delay: 0.1s; } .anim-3 { animation-delay: 0.15s; } .anim-4 { animation-delay: 0.2s; }
  `],
  template: `
    <app-main-layout>
      <div *transloco="let t">
        <div class="anim mb-6">
          <h1 class="text-xl sm:text-2xl font-bold text-slate-900">{{ t('admin.dashboard') }}</h1>
          <p class="text-sm text-slate-500 mt-0.5">Vue d'ensemble de la plateforme Tarjem</p>
        </div>

        @if (loading()) {
          <div class="flex items-center justify-center py-20"><svg class="w-6 h-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg></div>
        } @else if (stats()) {
          <!-- KPI Cards Row 1: Finance -->
          <div class="anim anim-1 grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div class="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4">
              <p class="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{{ t('admin.revenue') }}</p>
              <p class="text-2xl font-black text-emerald-700 mt-1">{{ stats()!.totalRevenue | number }} {{ t('common.currency') }}</p>
            </div>
            <div class="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4">
              <p class="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{{ t('admin.platformEarnings') }}</p>
              <p class="text-2xl font-black text-blue-700 mt-1">{{ stats()!.platformEarnings | number }} {{ t('common.currency') }}</p>
            </div>
            <div class="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4">
              <p class="text-[10px] font-bold text-amber-600 uppercase tracking-wider">{{ t('finance.totalCommissions') }}</p>
              <p class="text-2xl font-black text-amber-700 mt-1">{{ stats()!.totalCommissionsPaid | number }} {{ t('common.currency') }}</p>
            </div>
            <div class="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-4">
              <p class="text-[10px] font-bold text-red-600 uppercase tracking-wider">{{ t('admin.pendingWithdrawals') }}</p>
              <p class="text-2xl font-black text-red-700 mt-1">{{ stats()!.pendingWithdrawals }}</p>
            </div>
          </div>

          <!-- KPI Cards Row 2: Users & Orders -->
          <div class="anim anim-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <div class="rounded-xl border border-slate-200 bg-white p-3">
              <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('admin.totalUsers') }}</p>
              <p class="text-xl font-black text-slate-800 mt-0.5">{{ stats()!.totalUsers }}</p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-white p-3">
              <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('admin.totalClients') }}</p>
              <p class="text-xl font-black text-slate-800 mt-0.5">{{ stats()!.totalClients }}</p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-white p-3">
              <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('admin.activeTranslators') }}</p>
              <p class="text-xl font-black text-blue-600 mt-0.5">{{ stats()!.activeTranslators }}</p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-white p-3">
              <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('admin.totalOrders') }}</p>
              <p class="text-xl font-black text-slate-800 mt-0.5">{{ stats()!.totalOrders }}</p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-white p-3">
              <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('admin.pendingReview') }}</p>
              <p class="text-xl font-black text-purple-600 mt-0.5">{{ stats()!.pendingReviewOrders }}</p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-white p-3">
              <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('admin.pendingTranslators') }}</p>
              <p class="text-xl font-black text-amber-600 mt-0.5">{{ stats()!.pendingTranslators }}</p>
            </div>
          </div>

          <!-- Deadline Warnings -->
          @if (overdueOrders().length > 0 || approachingOrders().length > 0) {
            <div class="anim anim-1 rounded-2xl border border-slate-200 bg-white p-5 mb-6">
              <div class="flex items-center gap-2 mb-3">
                <svg class="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
                <h2 class="text-sm font-bold text-slate-900">{{ t('admin.deadlines') }}</h2>
              </div>
              <div class="space-y-2">
                @for (o of overdueOrders(); track o.id) {
                  <a [routerLink]="['/admin/orders', o.id]" class="flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-200 hover:border-red-300 transition-colors">
                    <div class="flex items-center gap-3 min-w-0">
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 shrink-0">{{ t('admin.overdue') }}</span>
                      <span class="text-sm font-medium text-slate-800 truncate">{{ o.documentType }}</span>
                      <span class="text-xs text-slate-500 shrink-0"><bdi dir="ltr">{{ o.sourceLanguage | translateLang }} &rarr; {{ o.targetLanguage | translateLang }}</bdi></span>
                    </div>
                    <div class="text-end shrink-0 ms-3">
                      <p class="text-xs font-bold text-red-600">{{ o.estimatedDeliveryDate }}</p>
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full" [class]="statusBadge(o.status)">{{ t('status.' + camelCase(o.status)) }}</span>
                    </div>
                  </a>
                }
                @for (o of approachingOrders(); track o.id) {
                  <a [routerLink]="['/admin/orders', o.id]" class="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200 hover:border-amber-300 transition-colors">
                    <div class="flex items-center gap-3 min-w-0">
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">{{ t('admin.approaching') }}</span>
                      <span class="text-sm font-medium text-slate-800 truncate">{{ o.documentType }}</span>
                      <span class="text-xs text-slate-500 shrink-0"><bdi dir="ltr">{{ o.sourceLanguage | translateLang }} &rarr; {{ o.targetLanguage | translateLang }}</bdi></span>
                    </div>
                    <div class="text-end shrink-0 ms-3">
                      <p class="text-xs font-bold text-amber-600">{{ o.estimatedDeliveryDate }}</p>
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full" [class]="statusBadge(o.status)">{{ t('status.' + camelCase(o.status)) }}</span>
                    </div>
                  </a>
                }
              </div>
            </div>
          } @else if (!loading()) {
            <div class="anim anim-1 rounded-2xl border border-slate-200 bg-white p-5 mb-6">
              <div class="flex items-center gap-2">
                <svg class="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <h2 class="text-sm font-bold text-slate-900">{{ t('admin.deadlines') }}</h2>
                <span class="text-xs text-slate-400 ms-2">{{ t('admin.noDeadlines') }}</span>
              </div>
            </div>
          }

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <!-- Order Status Breakdown -->
            <div class="anim anim-2 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 class="text-sm font-bold text-slate-900 mb-3">{{ t('admin.orderBreakdown') }}</h2>
              @if (stats()!.ordersByStatus.length === 0) {
                <p class="text-sm text-slate-400 text-center py-4">{{ t('admin.noOrders') }}</p>
              } @else {
                <div class="space-y-2">
                  @for (s of stats()!.ordersByStatus; track s.status) {
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <div class="w-2.5 h-2.5 rounded-full" [class]="statusDot(s.status)"></div>
                        <span class="text-sm text-slate-700">{{ t('status.' + camelCase(s.status)) }}</span>
                      </div>
                      <span class="text-sm font-bold text-slate-900">{{ s.count }}</span>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Language Pairs -->
            <div class="anim anim-2 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 class="text-sm font-bold text-slate-900 mb-3">{{ t('admin.languagePairs') }}</h2>
              @if (stats()!.languagePairs.length === 0) {
                <p class="text-sm text-slate-400 text-center py-4">{{ t('admin.noLanguagePairs') }}</p>
              } @else {
                <div class="space-y-2">
                  @for (lp of stats()!.languagePairs; track lp.sourceLanguage + lp.targetLanguage) {
                    <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                      <span class="text-sm font-medium text-slate-700"><bdi dir="ltr">{{ lp.sourceLanguage | translateLang }} &rarr; {{ lp.targetLanguage | translateLang }}</bdi></span>
                      <span class="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{{ lp.translatorCount }} {{ t('admin.translatorCount') }}</span>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Top Translators -->
            <div class="anim anim-2 rounded-2xl border border-slate-200 bg-white p-5">
              <div class="flex items-center justify-between mb-3">
                <h2 class="text-sm font-bold text-slate-900">{{ t('admin.topTranslators') }}</h2>
                <a routerLink="/admin/users" class="text-xs text-blue-600 hover:text-blue-700 font-medium">{{ t('common.viewAll') }}</a>
              </div>
              @if (stats()!.topTranslators.length === 0) {
                <p class="text-sm text-slate-400 text-center py-4">{{ t('admin.noTranslators') }}</p>
              } @else {
                <div class="space-y-2">
                  @for (tr of stats()!.topTranslators; track tr.id; let i = $index) {
                    <a [routerLink]="['/admin/users', tr.id]" class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                      <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" [class]="i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'">{{ i + 1 }}</div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-slate-800 truncate">{{ tr.firstName }} {{ tr.lastName }}</p>
                        <p class="text-[10px] text-slate-500">{{ tr.completedOrders }} {{ t('admin.completedOrders') }}</p>
                      </div>
                      <span class="text-xs font-bold text-emerald-600">{{ tr.totalEarnings | number }} {{ t('common.currency') }}</span>
                    </a>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Recent Orders -->
          <div class="anim anim-3 rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 class="text-sm font-bold text-slate-900">{{ t('admin.recentOrders') }}</h2>
              <a routerLink="/admin/orders" class="text-xs text-blue-600 hover:text-blue-700 font-medium">{{ t('common.viewAll') }}</a>
            </div>
            @if (stats()!.recentOrders.length === 0) {
              <p class="text-sm text-slate-400 text-center py-8">{{ t('admin.noOrders') }}</p>
            } @else {
              <!-- Mobile Cards -->
              <div class="sm:hidden p-4 space-y-2">
                @for (o of stats()!.recentOrders; track o.id) {
                  <a [routerLink]="['/admin/orders', o.id]" class="block rounded-xl border border-slate-200 p-3 hover:border-blue-300 transition-colors">
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-sm font-medium text-slate-800 truncate">{{ o.documentType }}</span>
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full" [class]="statusBadge(o.status)">{{ t('status.' + camelCase(o.status)) }}</span>
                    </div>
                    <div class="flex items-center justify-between text-xs text-slate-500">
                      <span><bdi dir="ltr">{{ o.sourceLanguage | translateLang }} &rarr; {{ o.targetLanguage | translateLang }}</bdi></span>
                      <span class="font-bold text-slate-700">{{ o.totalPrice | number }} {{ t('common.currency') }}</span>
                    </div>
                  </a>
                }
              </div>
              <!-- Desktop Table -->
              <div class="hidden sm:block">
                <table class="w-full">
                  <thead class="bg-slate-50/80">
                    <tr>
                      <th class="px-4 py-2.5 text-start text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('order.documentType') }}</th>
                      <th class="px-4 py-2.5 text-start text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('order.languages') }}</th>
                      <th class="px-4 py-2.5 text-start text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('common.status') }}</th>
                      <th class="px-4 py-2.5 text-end text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('order.price') }}</th>
                      <th class="px-4 py-2.5 text-end text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('common.date') }}</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (o of stats()!.recentOrders; track o.id) {
                      <tr class="hover:bg-slate-50/50 cursor-pointer transition-colors" [routerLink]="['/admin/orders', o.id]">
                        <td class="px-4 py-3 text-sm text-slate-800 font-medium">{{ o.documentType }}</td>
                        <td class="px-4 py-3 text-sm text-slate-600"><bdi dir="ltr">{{ o.sourceLanguage | translateLang }} &rarr; {{ o.targetLanguage | translateLang }}</bdi></td>
                        <td class="px-4 py-3"><span class="text-[10px] font-bold px-2 py-0.5 rounded-full" [class]="statusBadge(o.status)">{{ t('status.' + camelCase(o.status)) }}</span></td>
                        <td class="px-4 py-3 text-sm text-end font-bold text-slate-800">{{ o.totalPrice | number }} {{ t('common.currency') }}</td>
                        <td class="px-4 py-3 text-xs text-end text-slate-500">{{ formatDateTime(o.createdAt) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }
      </div>
    </app-main-layout>
  `,
})
export class AdminDashboardComponent implements OnInit {
  private readonly api = inject(ApiService);

  loading = signal(true);
  stats = signal<DashboardStats | null>(null);

  private readonly terminalStatuses = ['DELIVERED', 'CANCELLED'];

  overdueOrders = computed(() => {
    const s = this.stats();
    if (!s) return [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return s.recentOrders.filter(o =>
      o.estimatedDeliveryDate &&
      !this.terminalStatuses.includes(o.status) &&
      new Date(o.estimatedDeliveryDate) < now
    );
  });

  approachingOrders = computed(() => {
    const s = this.stats();
    if (!s) return [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);
    return s.recentOrders.filter(o => {
      if (!o.estimatedDeliveryDate || this.terminalStatuses.includes(o.status)) return false;
      const d = new Date(o.estimatedDeliveryDate);
      return d >= now && d <= tomorrow;
    });
  });

  ngOnInit() {
    this.api.get<DashboardStats>('/api/v1/admin/dashboard/stats').subscribe({
      next: (res) => { if (res.data) this.stats.set(res.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  statusDot(status: string): string {
    const m: Record<string, string> = {
      PAID: 'bg-green-400', IN_PROGRESS: 'bg-blue-400', ASSIGNED: 'bg-blue-300',
      PENDING_REVIEW: 'bg-purple-400', IN_REVIEW: 'bg-purple-500',
      REVISION_REQUESTED: 'bg-red-400', APPROVED: 'bg-emerald-400',
      PENDING_DELIVERY: 'bg-amber-400', DELIVERED: 'bg-emerald-500',
      CANCELLED: 'bg-red-500', DISPUTED: 'bg-orange-400', SUSPENDED: 'bg-slate-400',
    };
    return m[status] || 'bg-slate-300';
  }

  statusBadge(status: string): string {
    const m: Record<string, string> = {
      PAID: 'bg-green-100 text-green-700', IN_PROGRESS: 'bg-blue-100 text-blue-700',
      PENDING_REVIEW: 'bg-purple-100 text-purple-700', IN_REVIEW: 'bg-purple-100 text-purple-700',
      REVISION_REQUESTED: 'bg-red-100 text-red-700', APPROVED: 'bg-emerald-100 text-emerald-700',
      DELIVERED: 'bg-emerald-100 text-emerald-700', CANCELLED: 'bg-red-100 text-red-700',
      PENDING_DELIVERY: 'bg-amber-100 text-amber-700',
    };
    return m[status] || 'bg-slate-100 text-slate-600';
  }

  camelCase(s: string): string { return s.toLowerCase().replaceAll(/_([a-z])/g, (_: string, c: string) => c.toUpperCase()); }
  formatDateTime(d: string): string { if (!d) return ''; try { return new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return d; } }
}
