import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MainLayoutComponent } from '../../../shared/layouts/main-layout/main-layout.component';
import { ApiService, PageResponse } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { TranslateLangPipe } from '../../../shared/pipes/translate-lang.pipe';

interface Stats { activeOrders: number; completedOrders: number; totalEarnings: number; rating: number; }
interface Wallet { balance: number; totalEarned: number; totalWithdrawn: number; pendingWithdrawals: number; }
interface Order {
  id: string; documentType: string; sourceLanguage: string; targetLanguage: string;
  status: string; pageCount: number; translatorAmount: number; totalPrice: number;
  createdAt: string; urgency: string;
}

@Component({
  selector: 'app-translator-dashboard',
  standalone: true,
  imports: [MainLayoutComponent, TranslocoModule, RouterLink, DecimalPipe, TranslateLangPipe],
  styles: [`
    @keyframes fade-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
    .anim { animation: fade-up 0.35s ease-out both; }
    .a1 { animation-delay: .05s; } .a2 { animation-delay: .1s; } .a3 { animation-delay: .15s; } .a4 { animation-delay: .2s; }
    .card { transition: all 0.2s ease; }
    .card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px -4px rgba(0,0,0,0.06); }
    .row { transition: background 0.15s; cursor: pointer; }
    .row:hover { background-color: #f8fafc; }
  `],
  template: `
    <app-main-layout>
      <div *transloco="let t">

        <!-- Header -->
        <div class="anim flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 class="text-2xl sm:text-3xl font-bold text-slate-900">{{ t('translatorDashboard.welcome') }}, {{ userName() }}</h1>
            <p class="mt-1 text-sm text-slate-500">{{ t('translatorDashboard.subtitle') }}</p>
          </div>
          <a routerLink="/translator/orders/available"
            class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>
            {{ t('translatorDashboard.findOrders') }}
          </a>
        </div>

        <!-- KPI Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">

          <!-- Wallet balance -->
          <div class="card a1 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-16 h-16 bg-emerald-100/50 rounded-bl-[32px]"></div>
            <div class="relative">
              <p class="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{{ t('translatorDashboard.walletBalance') }}</p>
              <p class="text-2xl font-black text-emerald-700 mt-1">{{ wallet().balance | number }} {{ t('common.currency') }}</p>
            </div>
          </div>

          <!-- Active orders -->
          <div class="card a1 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-16 h-16 bg-blue-100/50 rounded-bl-[32px]"></div>
            <div class="relative">
              <p class="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{{ t('dashboard.activeOrders') }}</p>
              <p class="text-2xl font-black text-blue-700 mt-1">{{ stats().activeOrders }}</p>
            </div>
          </div>

          <!-- Available to take -->
          <div class="card a2 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-16 h-16 bg-amber-100/50 rounded-bl-[32px]"></div>
            <div class="relative">
              <p class="text-[10px] font-bold text-amber-600 uppercase tracking-wider">{{ t('translatorDashboard.availableCount') }}</p>
              <p class="text-2xl font-black text-amber-700 mt-1">{{ availableCount() }}</p>
            </div>
          </div>

          <!-- Rating -->
          <div class="card a2 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-16 h-16 bg-amber-100/50 rounded-bl-[32px]"></div>
            <div class="relative">
              <p class="text-[10px] font-bold text-amber-600 uppercase tracking-wider">{{ t('rating.avgRating') }}</p>
              <div class="flex items-baseline gap-1 mt-1">
                <p class="text-2xl font-black text-amber-700">{{ stats().rating | number:'1.1-1' }}</p>
                <span class="text-sm text-amber-400">/5</span>
                <div class="flex gap-0.5 ms-1">
                  @for (s of [1,2,3,4,5]; track s) {
                    <svg class="w-3 h-3" [class]="s <= Math.round(stats().rating) ? 'text-amber-400' : 'text-slate-200'" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  }
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Wallet summary bar -->
        <div class="a3 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-600 to-purple-700 p-4 mb-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-6">
            <div>
              <p class="text-[10px] font-semibold text-indigo-200 uppercase">{{ t('translatorDashboard.totalEarned') }}</p>
              <p class="text-lg font-black">{{ wallet().totalEarned | number }} {{ t('common.currency') }}</p>
            </div>
            <div>
              <p class="text-[10px] font-semibold text-indigo-200 uppercase">{{ t('translatorDashboard.totalWithdrawn') }}</p>
              <p class="text-lg font-black">{{ wallet().totalWithdrawn | number }} {{ t('common.currency') }}</p>
            </div>
            @if (wallet().pendingWithdrawals > 0) {
              <div>
                <p class="text-[10px] font-semibold text-amber-300 uppercase">{{ t('translatorDashboard.pendingWithdrawals') }}</p>
                <p class="text-lg font-black text-amber-300">{{ wallet().pendingWithdrawals }}</p>
              </div>
            }
          </div>
          <a routerLink="/translator/commissions"
            class="inline-flex items-center gap-1.5 rounded-lg bg-white/15 backdrop-blur-sm px-4 py-2 text-xs font-semibold text-white hover:bg-white/25 transition-all">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/></svg>
            {{ t('translatorDashboard.viewHistory') }}
          </a>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 a4">

          <!-- ====== Active orders (2/3) ====== -->
          <div class="lg:col-span-2 rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div class="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center">
              <h2 class="text-sm font-bold text-slate-800">{{ t('order.myOrders') }}</h2>
              <a routerLink="/translator/orders/mine" class="text-xs font-semibold text-blue-600 hover:text-blue-700">{{ t('common.viewAll') }}</a>
            </div>
            @if (recentOrders().length === 0) {
              <div class="p-10 text-center">
                <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <svg class="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9.75m-4.5 6.75h13.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z"/></svg>
                </div>
                <p class="text-sm text-slate-500 mb-3">{{ t('translatorDashboard.noActiveOrders') }}</p>
                <a routerLink="/translator/orders/available" class="text-sm font-semibold text-blue-600 hover:text-blue-700">{{ t('translatorDashboard.findOrders') }} →</a>
              </div>
            } @else {
              <div class="divide-y divide-slate-50">
                @for (o of recentOrders(); track o.id) {
                  <a [routerLink]="['/translator/orders', o.id, 'workspace']" class="row flex items-center gap-3 px-5 py-3.5">
                    <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" [class]="statusBg(o.status)">
                      <svg class="w-4 h-4" [class]="statusFg(o.status)" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <p class="text-sm font-semibold text-slate-800 truncate">{{ o.documentType }}</p>
                        @if (o.urgency === 'EXPRESS') {
                          <span class="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 uppercase">Express</span>
                        }
                      </div>
                      <p class="text-[11px] text-slate-500"><bdi dir="ltr">{{ o.sourceLanguage | translateLang }} → {{ o.targetLanguage | translateLang }}</bdi> · {{ o.pageCount }} pg</p>
                    </div>
                    <div class="text-end shrink-0">
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full" [class]="statusBadge(o.status)">{{ t('status.' + cc(o.status)) }}</span>
                      <p class="text-[11px] font-semibold text-slate-500 mt-1">{{ o.translatorAmount || 0 | number }} {{ t('common.currency') }}</p>
                    </div>
                  </a>
                }
              </div>
            }
          </div>

          <!-- ====== Right sidebar (1/3) ====== -->
          <div class="space-y-5">

            <!-- Available orders -->
            <div class="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div class="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center">
                <h2 class="text-sm font-bold text-slate-800">{{ t('translatorDashboard.newOrders') }}</h2>
                <a routerLink="/translator/orders/available" class="text-xs font-semibold text-blue-600 hover:text-blue-700">{{ t('common.viewAll') }}</a>
              </div>
              @if (availableOrders().length === 0) {
                <div class="p-8 text-center text-sm text-slate-400">{{ t('order.noAvailable') }}</div>
              } @else {
                <div class="divide-y divide-slate-50">
                  @for (o of availableOrders(); track o.id) {
                    <a [routerLink]="['/translator/orders', o.id, 'workspace']" class="row block px-5 py-3">
                      <div class="flex justify-between items-start">
                        <div>
                          <div class="flex items-center gap-2">
                            <p class="text-sm font-semibold text-slate-800">{{ o.documentType }}</p>
                            @if (o.urgency === 'EXPRESS') {
                              <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 uppercase">Express</span>
                            }
                          </div>
                          <p class="text-[11px] text-slate-500 mt-0.5"><bdi dir="ltr">{{ o.sourceLanguage | translateLang }} → {{ o.targetLanguage | translateLang }}</bdi> · {{ o.pageCount }} pg</p>
                        </div>
                        <span class="text-sm font-bold text-emerald-600">{{ o.translatorAmount || o.totalPrice | number }} {{ t('common.currency') }}</span>
                      </div>
                    </a>
                  }
                </div>
              }
            </div>

            <!-- Recent reviews -->
            <div class="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div class="px-5 py-3.5 border-b border-slate-100">
                <h2 class="text-sm font-bold text-slate-800">{{ t('rating.reviews') }}</h2>
              </div>
              @if (recentRatings().length === 0) {
                <div class="p-6 text-center text-sm text-slate-400">{{ t('rating.noRatings') }}</div>
              } @else {
                <div class="divide-y divide-slate-50">
                  @for (r of recentRatings(); track r.id) {
                    <div class="px-5 py-3">
                      <div class="flex items-center gap-1 mb-1">
                        @for (s of [1,2,3,4,5]; track s) {
                          <svg class="w-3.5 h-3.5" [class]="s <= r.rating ? 'text-amber-400' : 'text-slate-200'" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                        }
                        <span class="text-[10px] text-slate-400 ms-1">{{ r.clientName }}</span>
                      </div>
                      @if (r.comment) { <p class="text-xs text-slate-600">{{ r.comment }}</p> }
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Quick links -->
            <div class="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 class="text-sm font-bold text-slate-800 mb-3">{{ t('translatorDashboard.quickActions') }}</h3>
              <div class="space-y-2">
                <a routerLink="/translator/orders/available" class="flex items-center gap-3 rounded-xl border border-slate-100 px-3.5 py-2.5 text-sm text-slate-700 hover:border-slate-200 hover:bg-slate-50 transition-all">
                  <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100"><svg class="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg></div>
                  <span class="font-medium">{{ t('translatorDashboard.browseOrders') }}</span>
                </a>
                <a routerLink="/translator/orders/mine" class="flex items-center gap-3 rounded-xl border border-slate-100 px-3.5 py-2.5 text-sm text-slate-700 hover:border-slate-200 hover:bg-slate-50 transition-all">
                  <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100"><svg class="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"/></svg></div>
                  <span class="font-medium">{{ t('translatorDashboard.myWork') }}</span>
                </a>
                <a routerLink="/translator/commissions" class="flex items-center gap-3 rounded-xl border border-slate-100 px-3.5 py-2.5 text-sm text-slate-700 hover:border-slate-200 hover:bg-slate-50 transition-all">
                  <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100"><svg class="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/></svg></div>
                  <span class="font-medium">{{ t('translatorDashboard.earnings') }}</span>
                </a>
              </div>
            </div>

          </div>
        </div>

      </div>
    </app-main-layout>
  `,
})
export class TranslatorDashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  stats = signal<Stats>({ activeOrders: 0, completedOrders: 0, totalEarnings: 0, rating: 0 });
  wallet = signal<Wallet>({ balance: 0, totalEarned: 0, totalWithdrawn: 0, pendingWithdrawals: 0 });
  recentOrders = signal<Order[]>([]);
  availableOrders = signal<Order[]>([]);
  availableCount = signal(0);
  recentRatings = signal<any[]>([]);
  userName = signal(this.auth.currentUser()?.firstName || '');
  Math = Math;

  ngOnInit() {
    this.api.get<Stats>('/api/v1/translator/stats').subscribe({
      next: r => { if (r.data) this.stats.set(r.data); },
    });
    this.api.get<Wallet>('/api/v1/translator/wallet/summary').subscribe({
      next: r => { if (r.data) this.wallet.set(r.data); },
    });
    this.api.get<PageResponse<Order>>('/api/v1/translator/orders/mine', { size: 5 }).subscribe({
      next: r => this.recentOrders.set(r.data?.content ?? []),
    });
    this.api.get<PageResponse<Order>>('/api/v1/translator/orders/available', { size: 5 }).subscribe({
      next: r => { this.availableOrders.set(r.data?.content ?? []); this.availableCount.set(r.data?.totalElements ?? 0); },
    });
    this.api.get<any[]>('/api/v1/translator/ratings').subscribe({
      next: r => this.recentRatings.set((r.data ?? []).slice(0, 5)),
    });
  }

  cc(s: string): string { return s?.toLowerCase().replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase()) ?? ''; }

  statusBg(s: string): string {
    const m: Record<string, string> = { IN_PROGRESS: 'bg-blue-100', ASSIGNED: 'bg-cyan-100', PENDING_REVIEW: 'bg-amber-100', REVISION_REQUESTED: 'bg-red-100', DELIVERED: 'bg-emerald-100' };
    return m[s] || 'bg-slate-100';
  }
  statusFg(s: string): string {
    const m: Record<string, string> = { IN_PROGRESS: 'text-blue-600', ASSIGNED: 'text-cyan-600', PENDING_REVIEW: 'text-amber-600', REVISION_REQUESTED: 'text-red-600', DELIVERED: 'text-emerald-600' };
    return m[s] || 'text-slate-500';
  }
  statusBadge(s: string): string {
    const m: Record<string, string> = { IN_PROGRESS: 'bg-blue-50 text-blue-700', ASSIGNED: 'bg-cyan-50 text-cyan-700', PENDING_REVIEW: 'bg-amber-50 text-amber-700', REVISION_REQUESTED: 'bg-red-50 text-red-700', DELIVERED: 'bg-emerald-50 text-emerald-700', PAID: 'bg-sky-50 text-sky-700' };
    return m[s] || 'bg-slate-50 text-slate-700';
  }
}
