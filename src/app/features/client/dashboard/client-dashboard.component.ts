import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MainLayoutComponent } from '../../../shared/layouts/main-layout/main-layout.component';
import { ApiService, PageResponse } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslateLangPipe } from '../../../shared/pipes/translate-lang.pipe';

interface ClientStats {
  totalOrders: number;
  activeOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalSpent: number;
}

interface Order {
  id: string;
  documentType: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: string;
  totalPrice: number;
  pageCount: number;
  urgency: string;
  createdAt: string;
}

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [MainLayoutComponent, TranslocoModule, RouterLink, DecimalPipe, TranslateLangPipe],
  styles: [`
    @keyframes fade-up {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .anim { animation: fade-up 0.5s ease-out both; }
    .anim-1 { animation: fade-up 0.5s ease-out 0.05s both; }
    .anim-2 { animation: fade-up 0.5s ease-out 0.1s both; }
    .anim-3 { animation: fade-up 0.5s ease-out 0.15s both; }
    .anim-4 { animation: fade-up 0.5s ease-out 0.2s both; }
    .stat-card { transition: all 0.3s ease; }
    .stat-card:hover { transform: translateY(-3px); box-shadow: 0 12px 24px -6px rgba(0,0,0,0.08); }
    .order-row { transition: all 0.2s ease; }
    .order-row:hover { background-color: #f8fafc; }
  `],
  template: `
    <app-main-layout>
      <div *transloco="let t">

        <!-- Welcome Header -->
        <div class="anim mb-8">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 class="text-2xl sm:text-3xl font-bold text-slate-900">
                {{ t('clientDashboard.welcome') }}, {{ userName() }} 👋
              </h1>
              <p class="mt-1 text-sm text-slate-500">{{ t('clientDashboard.subtitle') }}</p>
            </div>
            <a routerLink="/client/orders/new"
              class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:from-blue-700 hover:to-indigo-700">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              {{ t('order.newOrder') }}
            </a>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <!-- Total Orders -->
          <div class="stat-card anim-1 rounded-2xl border border-slate-200 bg-white p-5 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-20 h-20 bg-slate-50 rounded-bl-[40px]"></div>
            <div class="relative">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 mb-3">
                <svg class="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
              </div>
              <p class="text-xs font-medium text-slate-500 uppercase tracking-wider">{{ t('dashboard.totalOrders') }}</p>
              <p class="text-2xl font-black text-slate-900 mt-1">{{ stats().totalOrders }}</p>
            </div>
          </div>

          <!-- Active -->
          <div class="stat-card anim-1 rounded-2xl border border-slate-200 bg-white p-5 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-bl-[40px]"></div>
            <div class="relative">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 mb-3">
                <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>
              </div>
              <p class="text-xs font-medium text-slate-500 uppercase tracking-wider">{{ t('dashboard.activeOrders') }}</p>
              <p class="text-2xl font-black text-blue-600 mt-1">{{ stats().activeOrders }}</p>
            </div>
          </div>

          <!-- Delivered -->
          <div class="stat-card anim-2 rounded-2xl border border-slate-200 bg-white p-5 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-bl-[40px]"></div>
            <div class="relative">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 mb-3">
                <svg class="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p class="text-xs font-medium text-slate-500 uppercase tracking-wider">{{ t('dashboard.completed') }}</p>
              <p class="text-2xl font-black text-emerald-600 mt-1">{{ stats().deliveredOrders }}</p>
            </div>
          </div>

          <!-- Total Spent -->
          <div class="stat-card anim-2 rounded-2xl border border-slate-200 bg-white p-5 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-20 h-20 bg-amber-50 rounded-bl-[40px]"></div>
            <div class="relative">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 mb-3">
                <svg class="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p class="text-xs font-medium text-slate-500 uppercase tracking-wider">{{ t('clientDashboard.totalSpent') }}</p>
              <p class="text-2xl font-black text-slate-900 mt-1">{{ stats().totalSpent | number }} {{ t('common.currency') }}</p>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="anim-3 mb-8">
          <h2 class="text-lg font-bold text-slate-900 mb-4">{{ t('clientDashboard.quickActions') }}</h2>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <a routerLink="/client/orders/new"
              class="group flex flex-col items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-5 text-center transition-all duration-200 hover:border-blue-200 hover:shadow-lg hover:-translate-y-1">
              <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 group-hover:bg-blue-200 transition-colors">
                <svg class="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              </div>
              <span class="text-sm font-semibold text-slate-700">{{ t('order.newOrder') }}</span>
            </a>
            <a routerLink="/client/orders"
              class="group flex flex-col items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-5 text-center transition-all duration-200 hover:border-indigo-200 hover:shadow-lg hover:-translate-y-1">
              <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 group-hover:bg-indigo-200 transition-colors">
                <svg class="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
              </div>
              <span class="text-sm font-semibold text-slate-700">{{ t('clientDashboard.myOrders') }}</span>
            </a>
            <a routerLink="/client/profile"
              class="group flex flex-col items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-5 text-center transition-all duration-200 hover:border-purple-200 hover:shadow-lg hover:-translate-y-1">
              <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 group-hover:bg-purple-200 transition-colors">
                <svg class="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
              </div>
              <span class="text-sm font-semibold text-slate-700">{{ t('nav.profile') }}</span>
            </a>
            <a routerLink="/client/notifications"
              class="group flex flex-col items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-5 text-center transition-all duration-200 hover:border-amber-200 hover:shadow-lg hover:-translate-y-1">
              <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 group-hover:bg-amber-200 transition-colors">
                <svg class="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
              </div>
              <span class="text-sm font-semibold text-slate-700">{{ t('nav.notifications') }}</span>
            </a>
          </div>
        </div>

        <!-- Main content grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 anim-4">

          <!-- Recent Orders -->
          <div class="lg:col-span-2 rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div class="flex items-center gap-2">
                <svg class="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <h2 class="text-base font-bold text-slate-900">{{ t('dashboard.recentOrders') }}</h2>
              </div>
              <a routerLink="/client/orders" class="text-sm font-semibold text-blue-600 hover:text-blue-700">{{ t('common.viewAll') }}</a>
            </div>
            @if (loading()) {
              <div class="p-10 text-center text-slate-400">
                <svg class="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                {{ t('common.loading') }}
              </div>
            } @else if (recentOrders().length === 0) {
              <div class="p-10 text-center">
                <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                  <svg class="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9.75m-4.5 6.75h13.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" /></svg>
                </div>
                <p class="text-sm text-slate-500 mb-4">{{ t('clientDashboard.noOrders') }}</p>
                <a routerLink="/client/orders/new" class="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700">
                  {{ t('clientDashboard.createFirst') }}
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                </a>
              </div>
            } @else {
              <div class="divide-y divide-slate-100">
                @for (order of recentOrders(); track order.id) {
                  <a [routerLink]="['/client/orders', order.id]" class="order-row flex items-center gap-4 px-6 py-4">
                    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" [class]="getStatusBg(order.status)">
                      <svg class="w-5 h-5" [class]="getStatusIcon(order.status)" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <p class="text-sm font-semibold text-slate-900 truncate">{{ order.documentType }}</p>
                        @if (order.urgency === 'EXPRESS') {
                          <span class="shrink-0 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 uppercase">Express</span>
                        }
                      </div>
                      <p class="text-xs text-slate-500"><bdi dir="ltr">{{ order.sourceLanguage | translateLang }} → {{ order.targetLanguage | translateLang }}</bdi> · {{ order.pageCount }} {{ t('order.pages') }}</p>
                    </div>
                    <div class="text-end shrink-0">
                      <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold" [class]="getStatusBadge(clientStatus(order.status))">
                        {{ t('status.' + camelCase(clientStatus(order.status))) }}
                      </span>
                      <p class="text-xs text-slate-500 mt-1">{{ order.totalPrice | number }} {{ t('common.currency') }}</p>
                    </div>
                  </a>
                }
              </div>
            }
          </div>

          <!-- Right sidebar -->
          <div class="space-y-6">

            <!-- Order Status Breakdown -->
            <div class="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 class="text-base font-bold text-slate-900 mb-4">{{ t('clientDashboard.orderBreakdown') }}</h3>
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <div class="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                    <span class="text-sm text-slate-600">{{ t('clientDashboard.active') }}</span>
                  </div>
                  <span class="text-sm font-bold text-slate-900">{{ stats().activeOrders }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <div class="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                    <span class="text-sm text-slate-600">{{ t('clientDashboard.delivered') }}</span>
                  </div>
                  <span class="text-sm font-bold text-slate-900">{{ stats().deliveredOrders }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <div class="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                    <span class="text-sm text-slate-600">{{ t('clientDashboard.cancelled') }}</span>
                  </div>
                  <span class="text-sm font-bold text-slate-900">{{ stats().cancelledOrders }}</span>
                </div>
              </div>
              <!-- Progress bar -->
              @if (stats().totalOrders > 0) {
                <div class="mt-4 flex h-2 overflow-hidden rounded-full bg-slate-100">
                  @if (stats().activeOrders > 0) {
                    <div class="bg-blue-500 transition-all" [style.width.%]="stats().activeOrders / stats().totalOrders * 100"></div>
                  }
                  @if (stats().deliveredOrders > 0) {
                    <div class="bg-emerald-500 transition-all" [style.width.%]="stats().deliveredOrders / stats().totalOrders * 100"></div>
                  }
                  @if (stats().cancelledOrders > 0) {
                    <div class="bg-red-400 transition-all" [style.width.%]="stats().cancelledOrders / stats().totalOrders * 100"></div>
                  }
                </div>
              }
            </div>

            <!-- Total Spent Card -->
            <div class="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white overflow-hidden relative">
              <div class="absolute top-0 right-0 w-28 h-28 bg-white/5 rounded-bl-full"></div>
              <div class="relative">
                <p class="text-sm font-medium text-blue-200 mb-1">{{ t('clientDashboard.totalSpent') }}</p>
                <p class="text-3xl font-black mb-4">{{ stats().totalSpent | number }} {{ t('common.currency') }}</p>
                <a routerLink="/client/orders"
                  class="inline-flex items-center gap-1.5 rounded-lg bg-white/15 backdrop-blur-sm px-3.5 py-2 text-xs font-semibold text-white transition-all hover:bg-white/25">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                  {{ t('clientDashboard.viewAllOrders') }}
                </a>
              </div>
            </div>

            <!-- Help -->
            <div class="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 class="text-base font-bold text-slate-900 mb-4">{{ t('clientDashboard.needHelp') }}</h3>
              <div class="space-y-2.5">
                <a href="mailto:support&#64;tarjem.dz" class="flex items-center gap-3 rounded-xl border border-slate-100 px-4 py-3 text-sm text-slate-700 transition-all hover:border-slate-200 hover:bg-slate-50">
                  <svg class="w-5 h-5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                  <div>
                    <p class="font-semibold">support&#64;tarjem.dz</p>
                    <p class="text-xs text-slate-500">{{ t('clientDashboard.emailDesc') }}</p>
                  </div>
                </a>
                <a href="tel:+213555000000" class="flex items-center gap-3 rounded-xl border border-slate-100 px-4 py-3 text-sm text-slate-700 transition-all hover:border-slate-200 hover:bg-slate-50">
                  <svg class="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                  <div>
                    <p class="font-semibold">+213 555 000 000</p>
                    <p class="text-xs text-slate-500">{{ t('clientDashboard.phoneDesc') }}</p>
                  </div>
                </a>
              </div>
            </div>

          </div>
        </div>

      </div>
    </app-main-layout>
  `,
})
export class ClientDashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  loading = signal(true);
  recentOrders = signal<Order[]>([]);
  stats = signal<ClientStats>({ totalOrders: 0, activeOrders: 0, deliveredOrders: 0, cancelledOrders: 0, totalSpent: 0 });
  userName = signal(this.auth.currentUser()?.firstName || '');

  ngOnInit() {
    this.api.get<ClientStats>('/api/v1/client/stats').subscribe({
      next: (res) => { if (res.data) this.stats.set(res.data); },
    });
    this.api.get<PageResponse<Order>>('/api/v1/client/orders', { size: 6 }).subscribe({
      next: (res) => {
        this.recentOrders.set(res.data?.content ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  clientStatus(s: string): string {
    if (s === 'PENDING_REVIEW' || s === 'REVISION_REQUESTED') return 'IN_PROGRESS';
    if (s === 'APPROVED') return 'DELIVERED';
    return s;
  }

  camelCase(status: string): string {
    return status.toLowerCase().replaceAll(/_([a-z])/g, (_, c) => c.toUpperCase());
  }

  getStatusBg(status: string): string {
    const map: Record<string, string> = {
      PAID: 'bg-sky-100', ASSIGNED: 'bg-sky-100', IN_PROGRESS: 'bg-blue-100',
      PENDING_REVIEW: 'bg-amber-100', IN_REVIEW: 'bg-amber-100',
      REVISION_REQUESTED: 'bg-red-100', APPROVED: 'bg-emerald-100',
      DELIVERED: 'bg-emerald-100', CANCELLED: 'bg-red-100',
    };
    return map[status] || 'bg-slate-100';
  }

  getStatusIcon(status: string): string {
    const map: Record<string, string> = {
      PAID: 'text-sky-600', ASSIGNED: 'text-sky-600', IN_PROGRESS: 'text-blue-600',
      PENDING_REVIEW: 'text-amber-600', IN_REVIEW: 'text-amber-600',
      REVISION_REQUESTED: 'text-red-600', APPROVED: 'text-emerald-600',
      DELIVERED: 'text-emerald-600', CANCELLED: 'text-red-600',
    };
    return map[status] || 'text-slate-500';
  }

  getStatusBadge(status: string): string {
    const map: Record<string, string> = {
      PAID: 'bg-sky-50 text-sky-700', ASSIGNED: 'bg-sky-50 text-sky-700',
      IN_PROGRESS: 'bg-blue-50 text-blue-700', PENDING_REVIEW: 'bg-amber-50 text-amber-700',
      IN_REVIEW: 'bg-amber-50 text-amber-700', REVISION_REQUESTED: 'bg-red-50 text-red-700',
      APPROVED: 'bg-emerald-50 text-emerald-700', DELIVERED: 'bg-emerald-50 text-emerald-700',
      PENDING_DELIVERY: 'bg-purple-50 text-purple-700',
      CANCELLED: 'bg-red-50 text-red-700', DRAFT: 'bg-slate-50 text-slate-700',
    };
    return map[status] || 'bg-slate-50 text-slate-700';
  }
}
