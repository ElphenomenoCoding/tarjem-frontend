import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MainLayoutComponent } from '../../../shared/layouts/main-layout/main-layout.component';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateLangPipe } from '../../../shared/pipes/translate-lang.pipe';

interface UserDetail { id: string; firstName: string; lastName: string; email: string; phone: string | null; role: string; status: string; wilaya: string | null; address: string | null; agrementNumber: string | null; specializations: string | null; bio: string | null; interviewStatus: string | null; completedOrdersCount: number | null; isVerified: boolean; createdAt: string; preferredLanguage: string | null; }
interface OrderItem { id: string; documentType: string; sourceLanguage: string; targetLanguage: string; status: string; totalPrice: number; translatorAmount: number; createdAt: string; }
interface CommissionItem { id: string; orderId: string; amount: number; status: string; paidAt: string | null; createdAt: string; }
interface WalletTx { id: string; type: string; amount: number; balanceAfter: number; description: string; createdAt: string; }
interface WalletSummary { balance: number; totalEarned: number; totalWithdrawn: number; pendingWithdrawals: number; }
interface LangPair { id: string; translatorId: string; translatorName: string; sourceLanguage: string; targetLanguage: string; status: string; createdAt: string; completedOrders: number; }
interface ActiveLanguage { id: string; code: string; name: string; countryCode: string; isActive: boolean; }

@Component({
  selector: 'app-admin-translator-detail',
  standalone: true,
  imports: [MainLayoutComponent, TranslocoModule, RouterLink, DecimalPipe, FormsModule, TranslateLangPipe],
  styles: [`@keyframes fade-up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}.anim{animation:fade-up .35s ease-out both}.anim-1{animation-delay:.05s}.anim-2{animation-delay:.1s}.anim-3{animation-delay:.15s}`],
  template: `
    <app-main-layout>
      <div *transloco="let t">
        <a routerLink="/admin/translators" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4 cursor-pointer">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>
          {{ t('nav.translators') }}
        </a>

        @if (loading()) {
          <div class="rounded-2xl border border-slate-200 bg-white p-12 text-center"><svg class="w-6 h-6 animate-spin text-blue-500 mx-auto" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg></div>
        } @else if (user()) {
          <!-- Profile Card -->
          <div class="anim rounded-2xl border border-slate-200 bg-white p-6 mb-6">
            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
              <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0" [class]="user()!.isVerified ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'">{{ initials() }}</div>
                <div>
                  <h1 class="text-xl font-bold text-slate-900">{{ user()!.firstName }} {{ user()!.lastName }}</h1>
                  <p class="text-sm text-slate-500">{{ user()!.email }}</p>
                  @if (user()!.agrementNumber) { <p class="text-xs text-slate-400 mt-0.5">{{ t('auth.agrementNumber') }}: {{ user()!.agrementNumber }}</p> }
                </div>
              </div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-[10px] font-bold px-2.5 py-1 rounded-full" [class]="statusBadge(user()!.status)">{{ user()!.status }}</span>
                @if (user()!.isVerified) {
                  <span class="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">{{ t('adminTranslators.verified') }}</span>
                }
                <!-- Actions for PENDING translator -->
                @if (user()!.status === 'PENDING') {
                  <button (click)="approveTranslator()" [disabled]="updating()" class="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 cursor-pointer">{{ t('admin.verify') }}</button>
                  <button (click)="showRejectModal.set(true)" class="px-3 py-1.5 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 cursor-pointer">{{ t('admin.reject') }}</button>
                }
                @if (user()!.status === 'ACTIVE') {
                  <button (click)="updateStatus('SUSPENDED')" [disabled]="updating()" class="px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 cursor-pointer">{{ t('admin.suspend') }}</button>
                }
                @if (user()!.status === 'SUSPENDED') {
                  <button (click)="updateStatus('ACTIVE')" [disabled]="updating()" class="px-3 py-1.5 text-xs font-semibold text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 cursor-pointer">{{ t('admin.activate') }}</button>
                }
              </div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
              <div><p class="text-slate-400 text-xs">{{ t('auth.phone') }}</p><p class="font-medium text-slate-800">{{ user()!.phone ?? '-' }}</p></div>
              <div><p class="text-slate-400 text-xs">{{ t('auth.wilaya') }}</p><p class="font-medium text-slate-800">{{ user()!.wilaya ?? '-' }}</p></div>
              <div><p class="text-slate-400 text-xs">{{ t('profile.address') }}</p><p class="font-medium text-slate-800">{{ user()!.address || '-' }}</p></div>
              <div><p class="text-slate-400 text-xs">{{ t('auth.agrementNumber') }}</p><p class="font-medium text-slate-800 font-mono">{{ user()!.agrementNumber || '-' }}</p></div>
              <div><p class="text-slate-400 text-xs">{{ t('admin.joinedAt') }}</p><p class="font-medium text-slate-800">{{ formatDate(user()!.createdAt) }}</p></div>
              <div><p class="text-slate-400 text-xs">{{ t('dashboard.completed') }}</p><p class="font-medium text-slate-800">{{ user()!.completedOrdersCount ?? 0 }} {{ t('nav.orders') }}</p></div>
              <div><p class="text-slate-400 text-xs">{{ t('admin.interviewStatus') }}</p><p class="font-medium text-slate-800">{{ user()!.interviewStatus || '-' }}</p></div>
              <div><p class="text-slate-400 text-xs">{{ t('profile.preferredLanguage') }}</p><p class="font-medium text-slate-800">{{ user()!.preferredLanguage || '-' }}</p></div>
            </div>
            <div class="mt-3 pt-3 border-t border-slate-100">
              <p class="text-xs text-slate-400 mb-2">{{ t('auth.specializations') }}</p>
              @if (parseSpecs(user()!.specializations).length > 0) {
                <div class="flex flex-wrap gap-1.5">
                  @for (spec of parseSpecs(user()!.specializations); track spec) {
                    <span class="px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{{ spec }}</span>
                  }
                </div>
              } @else {
                <p class="text-sm text-slate-400">-</p>
              }
            </div>
            <div class="mt-3 pt-3 border-t border-slate-100">
              <p class="text-xs text-slate-400 mb-1">{{ t('auth.bio') }}</p>
              <p class="text-sm text-slate-700">{{ user()!.bio || '-' }}</p>
            </div>
          </div>

          <!-- Wallet Summary -->
          @if (wallet()) {
            <div class="anim anim-1 grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p class="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{{ t('wallet.balance') }}</p>
                <p class="text-xl font-black text-emerald-700 mt-0.5">{{ wallet()!.balance | number }} {{ t('common.currency') }}</p>
              </div>
              <div class="rounded-xl border border-slate-200 bg-white p-3">
                <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('wallet.totalEarned') }}</p>
                <p class="text-xl font-black text-slate-800 mt-0.5">{{ wallet()!.totalEarned | number }} {{ t('common.currency') }}</p>
              </div>
              <div class="rounded-xl border border-slate-200 bg-white p-3">
                <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('wallet.totalWithdrawn') }}</p>
                <p class="text-xl font-black text-red-600 mt-0.5">{{ wallet()!.totalWithdrawn | number }} {{ t('common.currency') }}</p>
              </div>
              <div class="rounded-xl border border-slate-200 bg-white p-3">
                <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('wallet.pendingWithdrawals') }}</p>
                <p class="text-xl font-black text-amber-600 mt-0.5">{{ wallet()!.pendingWithdrawals }}</p>
              </div>
            </div>
          }

          <!-- Tabs -->
          <div class="anim anim-2 flex gap-1 mb-4 border-b border-slate-200">
            @for (tab of tabs; track tab.key) {
              <button (click)="activeTab = tab.key"
                class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer"
                [class]="activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'">
                {{ t(tab.label) }}
              </button>
            }
          </div>

          <!-- Tab: Language Pairs -->
          @if (activeTab === 'languages') {
            <div class="anim anim-3 space-y-2">
              @if (langPairs().length === 0) {
                <div class="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">{{ t('common.noData') }}</div>
              } @else {
                @for (pair of langPairs(); track pair.id) {
                  <div class="rounded-xl border border-slate-200 bg-white px-5 py-3.5 flex items-center justify-between gap-4">
                    <div dir="ltr" class="flex items-center gap-3">
                      <div class="flex items-center gap-2">
                        <img [src]="'https://flagcdn.com/w40/' + getCountryCode(pair.sourceLanguage) + '.png'" class="w-6 h-4 rounded-sm object-cover" />
                        <span class="text-sm font-semibold text-slate-800">{{ pair.sourceLanguage | translateLang }}</span>
                      </div>
                      <svg class="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
                      <div class="flex items-center gap-2">
                        <img [src]="'https://flagcdn.com/w40/' + getCountryCode(pair.targetLanguage) + '.png'" class="w-6 h-4 rounded-sm object-cover" />
                        <span class="text-sm font-semibold text-slate-800">{{ pair.targetLanguage | translateLang }}</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-3">
                      <span class="text-xs text-slate-500">{{ pair.completedOrders }} {{ t('dashboard.completed') }}</span>
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full" [class]="pair.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : pair.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'">{{ pair.status }}</span>
                      <button (click)="pairToRemove.set(pair); showRemovePairDialog.set(true)" class="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer" [title]="t('common.delete')">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
                      </button>
                    </div>
                  </div>
                }
              }
            </div>
          }

          <!-- Tab: Orders -->
          @if (activeTab === 'orders') {
            <div class="anim anim-3 rounded-2xl border border-slate-200 bg-white overflow-hidden">
              @if (orders().length === 0) {
                <p class="text-sm text-slate-400 text-center py-8">{{ t('common.noData') }}</p>
              } @else {
                <table class="w-full">
                  <thead class="bg-slate-50/80"><tr>
                    <th class="px-4 py-2 text-start text-[10px] font-bold text-slate-500 uppercase">ID</th>
                    <th class="px-4 py-2 text-start text-[10px] font-bold text-slate-500 uppercase">{{ t('order.documentType') }}</th>
                    <th class="px-4 py-2 text-start text-[10px] font-bold text-slate-500 uppercase">{{ t('order.languages') }}</th>
                    <th class="px-4 py-2 text-start text-[10px] font-bold text-slate-500 uppercase">{{ t('common.status') }}</th>
                    <th class="px-4 py-2 text-end text-[10px] font-bold text-slate-500 uppercase">{{ t('adminTranslators.translatorEarning') }}</th>
                    <th class="px-4 py-2 text-end text-[10px] font-bold text-slate-500 uppercase">{{ t('common.date') }}</th>
                  </tr></thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (o of orders(); track o.id) {
                      <tr class="hover:bg-slate-50/50 cursor-pointer" [routerLink]="['/admin/orders', o.id]">
                        <td class="px-4 py-2.5 text-xs font-mono text-blue-600">#{{ o.id.substring(0,8) }}</td>
                        <td class="px-4 py-2.5 text-sm text-slate-700">{{ o.documentType }}</td>
                        <td class="px-4 py-2.5 text-sm text-slate-600"><bdi dir="ltr">{{ o.sourceLanguage | translateLang }} &rarr; {{ o.targetLanguage | translateLang }}</bdi></td>
                        <td class="px-4 py-2.5"><span class="text-[10px] font-bold px-2 py-0.5 rounded-full" [class]="orderBadge(o.status)">{{ t('status.' + camelCase(o.status)) }}</span></td>
                        <td class="px-4 py-2.5 text-sm font-bold text-emerald-600 text-end">{{ o.translatorAmount | number }} {{ t('common.currency') }}</td>
                        <td class="px-4 py-2.5 text-xs text-slate-500 text-end">{{ formatDate(o.createdAt) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
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
                  <thead class="bg-slate-50/80"><tr>
                    <th class="px-4 py-2 text-start text-[10px] font-bold text-slate-500 uppercase">{{ t('order.order') }}</th>
                    <th class="px-4 py-2 text-end text-[10px] font-bold text-slate-500 uppercase">{{ t('commission.amount') }}</th>
                    <th class="px-4 py-2 text-center text-[10px] font-bold text-slate-500 uppercase">{{ t('common.status') }}</th>
                    <th class="px-4 py-2 text-end text-[10px] font-bold text-slate-500 uppercase">{{ t('common.date') }}</th>
                  </tr></thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (c of commissions(); track c.id) {
                      <tr class="hover:bg-slate-50/50">
                        <td class="px-4 py-2.5"><a [routerLink]="['/admin/orders', c.orderId]" class="text-xs font-mono text-blue-600 hover:underline">#{{ c.orderId.substring(0,8) }}</a></td>
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

          <!-- Tab: Wallet History -->
          @if (activeTab === 'wallet') {
            <div class="anim anim-3 rounded-2xl border border-slate-200 bg-white overflow-hidden">
              @if (walletTxs().length === 0) {
                <p class="text-sm text-slate-400 text-center py-8">{{ t('common.noData') }}</p>
              } @else {
                <table class="w-full">
                  <thead class="bg-slate-50/80"><tr>
                    <th class="px-4 py-2 text-start text-[10px] font-bold text-slate-500 uppercase">{{ t('common.date') }}</th>
                    <th class="px-4 py-2 text-start text-[10px] font-bold text-slate-500 uppercase">Type</th>
                    <th class="px-4 py-2 text-start text-[10px] font-bold text-slate-500 uppercase">{{ t('common.description') }}</th>
                    <th class="px-4 py-2 text-end text-[10px] font-bold text-slate-500 uppercase">{{ t('commission.amount') }}</th>
                    <th class="px-4 py-2 text-end text-[10px] font-bold text-slate-500 uppercase">{{ t('wallet.balance') }}</th>
                  </tr></thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (tx of walletTxs(); track tx.id) {
                      <tr class="hover:bg-slate-50/50">
                        <td class="px-4 py-2.5 text-xs text-slate-500">{{ formatDateTime(tx.createdAt) }}</td>
                        <td class="px-4 py-2.5"><span class="text-[10px] font-bold px-2 py-0.5 rounded-full" [class]="txBadge(tx.type)">{{ t('wallet.' + tx.type) }}</span></td>
                        <td class="px-4 py-2.5 text-sm text-slate-700">{{ tx.description }}</td>
                        <td class="px-4 py-2.5 text-sm font-bold text-end" [class]="tx.amount >= 0 ? 'text-emerald-600' : 'text-red-600'">{{ tx.amount >= 0 ? '+' : '' }}{{ tx.amount | number }} {{ t('common.currency') }}</td>
                        <td class="px-4 py-2.5 text-sm text-slate-500 text-end">{{ tx.balanceAfter | number }} {{ t('common.currency') }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              }
            </div>
          }

          <!-- Tab: Reviews -->
          @if (activeTab === 'reviews') {
            <div class="anim anim-3 space-y-3">
              @if (ratings().length === 0) {
                <div class="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">{{ t('rating.noRatings') }}</div>
              } @else {
                @for (r of ratings(); track r.id) {
                  <div class="rounded-xl border border-slate-200 bg-white px-5 py-4">
                    <div class="flex items-center justify-between mb-2">
                      <p class="text-sm font-semibold text-slate-800">{{ r.clientName }}</p>
                      <span class="text-xs text-slate-400">{{ formatDate(r.createdAt) }}</span>
                    </div>
                    <div class="flex gap-0.5 mb-2">
                      @for (s of [1,2,3,4,5]; track s) {
                        <svg class="w-5 h-5" [class]="s <= r.rating ? 'text-yellow-400' : 'text-slate-200'" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      }
                    </div>
                    @if (r.comment) {
                      <p class="text-sm text-slate-600 italic">{{ r.comment }}</p>
                    }
                  </div>
                }
              }
            </div>
          }
        }

        <!-- Remove Pair Confirmation -->
        @if (showRemovePairDialog() && pairToRemove()) {
          <div class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" (click)="showRemovePairDialog.set(false)">
            <div class="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl" (click)="$event.stopPropagation()">
              <h2 class="text-lg font-bold text-slate-900 mb-2">{{ t('langMgmt.removePairTitle') }}</h2>
              <p class="text-sm text-slate-500 mb-4">{{ t('langMgmt.removePairMessage') }}: <strong><bdi dir="ltr">{{ pairToRemove()!.sourceLanguage | translateLang }} → {{ pairToRemove()!.targetLanguage | translateLang }}</bdi></strong></p>
              <div class="flex justify-end gap-2">
                <button (click)="showRemovePairDialog.set(false)" class="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">{{ t('common.cancel') }}</button>
                <button (click)="removePair()" class="px-4 py-2 rounded-xl bg-red-600 text-sm font-bold text-white hover:bg-red-700 cursor-pointer">{{ t('langMgmt.removed') }}</button>
              </div>
            </div>
          </div>
        }

        <!-- Reject Modal -->
        @if (showRejectModal()) {
          <div class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" (click)="showRejectModal.set(false)">
            <div class="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl" (click)="$event.stopPropagation()">
              <h2 class="text-lg font-bold text-slate-900 mb-1">{{ t('adminTranslators.rejectTitle') }}</h2>
              <p class="text-sm text-slate-500 mb-4">{{ t('adminTranslators.rejectDesc') }}</p>
              <textarea [(ngModel)]="rejectReason" rows="3" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 resize-none mb-4" [placeholder]="t('adminTranslators.rejectReasonPlaceholder')"></textarea>
              <div class="flex justify-end gap-2">
                <button (click)="showRejectModal.set(false)" class="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">{{ t('common.cancel') }}</button>
                <button (click)="rejectTranslator()" [disabled]="updating() || !rejectReason.trim()" class="px-4 py-2 rounded-xl bg-red-600 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-40 cursor-pointer">{{ t('admin.reject') }}</button>
              </div>
            </div>
          </div>
        }
      </div>
    </app-main-layout>
  `,
})
export class AdminTranslatorDetailComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  loading = signal(true);
  updating = signal(false);
  user = signal<UserDetail | null>(null);
  wallet = signal<WalletSummary | null>(null);
  orders = signal<OrderItem[]>([]);
  commissions = signal<CommissionItem[]>([]);
  walletTxs = signal<WalletTx[]>([]);
  showRejectModal = signal(false);
  rejectReason = '';
  activeTab = 'languages';
  langPairs = signal<LangPair[]>([]);
  activeLangs = signal<ActiveLanguage[]>([]);
  showRemovePairDialog = signal(false);
  pairToRemove = signal<LangPair | null>(null);
  ratings = signal<{ id: string; clientName: string; rating: number; comment: string | null; createdAt: string }[]>([]);
  tabs = [
    { key: 'languages', label: 'profile.languagePairs' },
    { key: 'orders', label: 'nav.orders' },
    { key: 'commissions', label: 'nav.commissions' },
    { key: 'wallet', label: 'wallet.history' },
    { key: 'reviews', label: 'rating.reviews' },
  ];

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.api.get<UserDetail>(`/api/v1/admin/users/${id}`).subscribe({
      next: (r) => { if (r.data) this.user.set(r.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.api.get<WalletSummary>(`/api/v1/admin/translators/${id}/wallet/summary`).subscribe({
      next: (r) => { if (r.data) this.wallet.set(r.data); },
    });
    this.api.get<any>(`/api/v1/admin/translators/${id}/orders`, { size: 50, sort: 'createdAt,desc' }).subscribe({
      next: (r) => this.orders.set(r.data?.content ?? []),
    });
    this.api.get<any>(`/api/v1/admin/translators/${id}/commissions`, { size: 50, sort: 'createdAt,desc' }).subscribe({
      next: (r) => this.commissions.set(r.data?.content ?? []),
    });
    this.api.get<any>(`/api/v1/admin/translators/${id}/wallet`, { size: 50, sort: 'createdAt,desc' }).subscribe({
      next: (r) => this.walletTxs.set(r.data?.content ?? []),
    });
    this.api.get<LangPair[]>(`/api/v1/admin/languages/pairs/translator/${id}`).subscribe({
      next: (r) => this.langPairs.set(r.data ?? []),
    });
    this.api.get<ActiveLanguage[]>('/api/v1/languages').subscribe({
      next: (r) => this.activeLangs.set(r.data ?? []),
    });
    this.api.get<any[]>(`/api/v1/admin/translators/${id}/ratings`).subscribe({
      next: (r) => this.ratings.set(r.data ?? []),
    });
  }

  approveTranslator() {
    const id = this.user()?.id; if (!id) return;
    this.updating.set(true);
    this.api.patch(`/api/v1/admin/translators/${id}/verify`, {}).subscribe({
      next: () => {
        this.user.update(u => u ? { ...u, status: 'ACTIVE', isVerified: true } : u);
        this.updating.set(false);
        this.toast.success(this.transloco.translate('common.success'));
      },
      error: (e: HttpErrorResponse) => { this.updating.set(false); this.toast.error(e.error?.message || this.transloco.translate('common.error')); },
    });
  }

  rejectTranslator() {
    const id = this.user()?.id; if (!id) return;
    this.updating.set(true);
    this.api.patch(`/api/v1/admin/translators/${id}/reject`, { reason: this.rejectReason }).subscribe({
      next: () => {
        this.user.update(u => u ? { ...u, status: 'REJECTED' } : u);
        this.updating.set(false);
        this.showRejectModal.set(false);
        this.toast.success(this.transloco.translate('common.success'));
      },
      error: (e: HttpErrorResponse) => { this.updating.set(false); this.toast.error(e.error?.message || this.transloco.translate('common.error')); },
    });
  }

  updateStatus(status: string) {
    const id = this.user()?.id; if (!id) return;
    this.updating.set(true);
    this.api.patch(`/api/v1/admin/users/${id}/status`, { status }).subscribe({
      next: () => { this.user.update(u => u ? { ...u, status } : u); this.updating.set(false); this.toast.success(this.transloco.translate('common.success')); },
      error: (e: HttpErrorResponse) => { this.updating.set(false); this.toast.error(e.error?.message || this.transloco.translate('common.error')); },
    });
  }

  parseSpecs(specs: string | null): string[] { if (!specs) return []; return specs.split(',').map(s => s.trim()).filter(s => s); }

  getCountryCode(langName: string): string { return this.activeLangs().find(l => l.name === langName)?.countryCode ?? ''; }

  removePair() {
    const pair = this.pairToRemove();
    this.showRemovePairDialog.set(false);
    if (!pair) return;
    this.api.delete(`/api/v1/admin/languages/pairs/${pair.id}`).subscribe({
      next: () => {
        this.langPairs.update(list => list.filter(p => p.id !== pair.id));
        this.toast.success(this.transloco.translate('langMgmt.removed'));
      },
      error: (e: HttpErrorResponse) => this.toast.error(e.error?.message || 'Error'),
    });
  }

  initials(): string { const u = this.user(); return ((u?.firstName?.[0]||'')+(u?.lastName?.[0]||'')).toUpperCase(); }
  statusBadge(s: string): string { const m: Record<string,string>={ACTIVE:'bg-emerald-100 text-emerald-700',PENDING:'bg-amber-100 text-amber-700',SUSPENDED:'bg-red-100 text-red-700',REJECTED:'bg-red-100 text-red-700'}; return m[s]||'bg-slate-100 text-slate-600'; }
  orderBadge(s: string): string { const m: Record<string,string>={PAID:'bg-green-100 text-green-700',IN_PROGRESS:'bg-blue-100 text-blue-700',PENDING_REVIEW:'bg-purple-100 text-purple-700',DELIVERED:'bg-emerald-100 text-emerald-700',CANCELLED:'bg-red-100 text-red-700',APPROVED:'bg-emerald-100 text-emerald-700',REVISION_REQUESTED:'bg-red-100 text-red-700'}; return m[s]||'bg-slate-100 text-slate-600'; }
  txBadge(t: string): string { const m: Record<string,string>={EARNING:'bg-emerald-100 text-emerald-700',WITHDRAWAL:'bg-red-100 text-red-700',ADMIN_DEBIT:'bg-amber-100 text-amber-700'}; return m[t]||'bg-slate-100 text-slate-600'; }
  camelCase(s: string): string { return s.toLowerCase().replaceAll(/_([a-z])/g,(_:string,c:string)=>c.toUpperCase()); }
  formatDate(d: string): string { if(!d) return ''; try { return new Date(d).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'2-digit'}); } catch { return d; } }
  formatDateTime(d: string): string { if(!d) return ''; try { return new Date(d).toLocaleString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}); } catch { return d; } }
}
