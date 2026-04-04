import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { HttpErrorResponse } from '@angular/common/http';
import { MainLayoutComponent } from '../../../shared/layouts/main-layout/main-layout.component';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { TranslateLangPipe } from '../../../shared/pipes/translate-lang.pipe';
import { AnalyticsService } from '../../../core/services/analytics.service';

interface Order {
  id: string; documentType: string; sourceLanguage: string; targetLanguage: string;
  tier: string; status: string; totalPrice: number; translatorAmount: number; platformAmount: number;
  pageCount: number; clientNotes: string; deliveryType: string; urgency: string;
  createdAt: string; estimatedDeliveryDate: string; documentCount: number; currentVersion: number;
  clientName: string | null;
}
interface Doc { id: string; type: string; fileName: string; fileSize: number; mimeType: string; createdAt: string; submissionVersion: number; }

@Component({
  selector: 'app-translator-order-detail',
  standalone: true,
  imports: [MainLayoutComponent, TranslocoModule, RouterLink, DecimalPipe, ConfirmDialogComponent, TranslateLangPipe],
  styles: [`
    @keyframes fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    .anim { animation: fade-up 0.35s ease-out both; }
    .a1 { animation-delay: .05s; } .a2 { animation-delay: .1s; } .a3 { animation-delay: .15s; }
  `],
  template: `
    <app-main-layout>
      <div *transloco="let t">

        <div class="anim flex items-center gap-3 mb-6">
          <a routerLink="/translator/orders/available" class="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/></svg>
            {{ t('order.availableOrders') }}
          </a>
          @if (order()) {
            <span class="text-slate-300">/</span>
            <span class="text-sm font-mono font-bold text-slate-800">#{{ order()!.id.substring(0,8) }}</span>
          }
        </div>

        @if (loading()) {
          <div class="rounded-2xl border border-slate-200 bg-white p-16 text-center">
            <svg class="w-6 h-6 animate-spin mx-auto text-blue-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
          </div>
        } @else if (order(); as o) {

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

            <!-- Main info -->
            <div class="lg:col-span-2 space-y-5">

              <!-- Order card -->
              <div class="anim a1 rounded-2xl border border-slate-200 bg-white p-5">
                <div class="flex items-center justify-between mb-4">
                  <h2 class="text-base font-bold text-slate-800">{{ o.documentType }}</h2>
                  <div class="flex items-center gap-2">
                    @if (o.urgency === 'EXPRESS') {
                      <span class="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700 uppercase">Express</span>
                    }
                    @if (o.tier === 'OFFICIAL') {
                      <span class="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-700 uppercase">{{ t('order.official') }}</span>
                    }
                  </div>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
                  <div><p class="text-[10px] font-bold text-slate-400 uppercase">{{ t('order.languages') }}</p><p class="text-sm font-semibold text-slate-800 mt-0.5"><bdi dir="ltr">{{ o.sourceLanguage | translateLang }} → {{ o.targetLanguage | translateLang }}</bdi></p></div>
                  <div><p class="text-[10px] font-bold text-slate-400 uppercase">{{ t('order.pages') }}</p><p class="text-sm font-semibold text-slate-800 mt-0.5">{{ o.pageCount }}</p></div>
                  <div><p class="text-[10px] font-bold text-slate-400 uppercase">{{ t('order.delivery') }}</p><p class="text-sm font-semibold text-slate-800 mt-0.5">{{ o.deliveryType }}</p></div>
                  <div><p class="text-[10px] font-bold text-slate-400 uppercase">{{ t('order.urgency') }}</p><p class="text-sm font-semibold mt-0.5" [class]="o.urgency === 'EXPRESS' ? 'text-red-600' : 'text-slate-800'">{{ o.urgency }}</p></div>
                  <div><p class="text-[10px] font-bold text-slate-400 uppercase">{{ t('order.date') }}</p><p class="text-sm font-semibold text-slate-800 mt-0.5">{{ fmtDate(o.createdAt) }}</p></div>
                  @if (o.estimatedDeliveryDate) {
                    <div><p class="text-[10px] font-bold text-slate-400 uppercase">{{ t('order.estimatedDelivery') }}</p><p class="text-sm font-semibold text-slate-800 mt-0.5">{{ o.estimatedDeliveryDate }}</p></div>
                  }
                </div>
                @if (o.clientNotes) {
                  <div class="mt-4 pt-4 border-t border-slate-100">
                    <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">{{ t('order.clientNotes') }}</p>
                    <p class="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">{{ o.clientNotes }}</p>
                  </div>
                }
              </div>

              <!-- Source documents -->
              <div class="anim a2 rounded-2xl border border-slate-200 bg-white p-5">
                <h2 class="text-base font-bold text-slate-800 mb-3">{{ t('order.documents') }}</h2>
                @if (docs().length === 0) {
                  <p class="text-sm text-slate-400 py-4 text-center">{{ t('common.noData') }}</p>
                } @else {
                  <div class="space-y-2">
                    @for (d of docs(); track d.id) {
                      <div class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-blue-200 bg-blue-50/60">
                        <div class="flex-1 min-w-0">
                          <p class="text-sm font-medium text-blue-800 truncate">{{ d.fileName }}</p>
                          <p class="text-[10px] text-slate-500">{{ formatSize(d.fileSize) }}</p>
                        </div>
                        <a [href]="'/api/v1/translator/documents/' + d.id + '/view'" target="_blank"
                          class="shrink-0 p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-100 transition-all">
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        </a>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>

            <!-- Sidebar -->
            <div class="space-y-5">

              <!-- Earnings card -->
              <div class="anim a1 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5">
                <p class="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">{{ t('availableOrders.yourEarnings') }}</p>
                <p class="text-3xl font-black text-emerald-700">{{ o.translatorAmount | number }} {{ t('common.currency') }}</p>
                <p class="text-xs text-slate-400 mt-1">{{ t('availableOrders.totalOrder') }}: {{ o.totalPrice | number }} {{ t('common.currency') }}</p>
              </div>

              <!-- Claim button -->
              @if (o.status === 'PAID') {
                <div class="anim a2 rounded-2xl border-2 border-blue-200 bg-blue-50 p-5">
                  <h3 class="text-sm font-bold text-blue-900 mb-2">{{ t('order.claim') }}</h3>
                  <p class="text-xs text-blue-700 mb-4">{{ t('availableOrders.claimDesc') }}</p>
                  <button (click)="showClaimDialog.set(true)" [disabled]="claiming()"
                    class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 cursor-pointer">
                    @if (claiming()) {
                      <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                    }
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                    {{ t('order.claim') }}
                  </button>
                </div>
              }
            </div>

          </div>

          <app-confirm-dialog [isOpen]="showClaimDialog()"
            [title]="t('availableOrders.claimTitle')"
            [message]="t('availableOrders.claimConfirmMsg')"
            confirmText="order.claim" cancelText="common.cancel" variant="info"
            (confirmed)="claim()" (cancelled)="showClaimDialog.set(false)" />
        }
      </div>
    </app-main-layout>
  `,
})
export class TranslatorOrderDetailComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslocoService);
  private readonly analytics = inject(AnalyticsService);

  loading = signal(true);
  claiming = signal(false);
  order = signal<Order | null>(null);
  docs = signal<Doc[]>([]);
  showClaimDialog = signal(false);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.api.get<Order>('/api/v1/translator/orders/' + id).subscribe({
      next: r => { if (r.data) this.order.set(r.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.api.get<Doc[]>('/api/v1/translator/orders/' + id + '/documents').subscribe({
      next: r => this.docs.set((r.data ?? []).filter(d => d.type === 'SOURCE')),
    });
  }

  claim() {
    this.showClaimDialog.set(false);
    const id = this.order()?.id;
    if (!id) return;
    this.claiming.set(true);
    this.api.post('/api/v1/translator/orders/' + id + '/claim').subscribe({
      next: () => {
        this.claiming.set(false);
        this.toast.success(this.t.translate('availableOrders.claimSuccess'));
        this.analytics.track('translator_order_claimed');
        this.router.navigate(['/translator/orders', id, 'workspace']);
      },
      error: (err: HttpErrorResponse) => {
        this.claiming.set(false);
        this.toast.error(err.error?.message || 'Error');
      },
    });
  }

  fmtDate(d: string): string { if (!d) return ''; try { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return d; } }
  formatSize(bytes: number): string { if (!bytes) return ''; if (bytes < 1024) return bytes + ' B'; if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'; return (bytes / 1048576).toFixed(1) + ' MB'; }
}
