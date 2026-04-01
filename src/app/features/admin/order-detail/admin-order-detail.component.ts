import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MainLayoutComponent } from '../../../shared/layouts/main-layout/main-layout.component';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { TranslateLangPipe } from '../../../shared/pipes/translate-lang.pipe';
import { HttpErrorResponse } from '@angular/common/http';

interface Order {
  id: string; clientId: string; clientName: string; translatorId: string | null; translatorName: string | null;
  documentType: string; sourceLanguage: string; targetLanguage: string; status: string; tier: string; urgency: string;
  totalPrice: number; translatorAmount: number; platformAmount: number; pageCount: number;
  deliveryType: string; clientNotes: string; createdAt: string; updatedAt: string; currentVersion: number;
  estimatedDeliveryDate: string; deliveryAddress: string; deliveryCity: string; deliveryWilaya: string;
  deliveryPostalCode: string; deliveryPhone: string; documentCount: number;
}
interface Doc { id: string; type: string; fileName: string; fileSize: number; mimeType: string; createdAt: string; submissionVersion: number; isFinal: boolean; }
interface History { fromStatus: string; toStatus: string; changedAt: string; reason: string; changedByRole: string; }
interface Comment { id: string; authorId: string; authorRole: string; content: string; createdAt: string; }

@Component({
  selector: 'app-admin-order-detail',
  standalone: true,
  imports: [MainLayoutComponent, TranslocoModule, RouterLink, FormsModule, DecimalPipe, TranslateLangPipe],
  styles: [`
    @keyframes fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    .anim { animation: fade-up 0.35s ease-out both; }
    .anim-1 { animation-delay: .05s; }
    .anim-2 { animation-delay: .1s; }
    .anim-3 { animation-delay: .15s; }
    .anim-4 { animation-delay: .2s; }
    .anim-5 { animation-delay: .25s; }
  `],
  template: `
    <app-main-layout>
      <div *transloco="let t">

        <!-- Back + title -->
        <div class="anim flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <a routerLink="/admin/orders" class="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/></svg>
              {{ t('nav.orders') }}
            </a>
            @if (order()) {
              <span class="text-slate-300">/</span>
              <span class="text-sm font-mono font-bold text-slate-800">#{{ order()!.id.substring(0,8) }}</span>
            }
          </div>
          @if (order()) {
            <span class="px-3 py-1 rounded-full text-xs font-bold" [class]="statusBadge(order()!.status)">{{ t('status.' + cc(order()!.status)) }}</span>
          }
        </div>

        @if (loading()) {
          <div class="rounded-2xl border border-slate-200 bg-white p-16 text-center">
            <svg class="w-6 h-6 animate-spin mx-auto text-blue-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
          </div>
        } @else if (order(); as o) {

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

            <!-- ====== LEFT COLUMN (2/3) ====== -->
            <div class="lg:col-span-2 space-y-5">

              <!-- Order info card -->
              <div class="anim anim-1 rounded-2xl border border-slate-200 bg-white p-5">
                <h2 class="text-base font-bold text-slate-800 mb-4">{{ t('order.orderInfo') }}</h2>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
                  <div><p class="text-[10px] font-bold text-slate-400 uppercase">{{ t('order.documentType') }}</p><p class="text-sm font-semibold text-slate-800 mt-0.5">{{ o.documentType }}</p></div>
                  <div><p class="text-[10px] font-bold text-slate-400 uppercase">{{ t('order.languages') }}</p><p class="text-sm font-semibold text-slate-800 mt-0.5"><bdi dir="ltr">{{ o.sourceLanguage | translateLang }} → {{ o.targetLanguage | translateLang }}</bdi></p></div>
                  <div><p class="text-[10px] font-bold text-slate-400 uppercase">{{ t('order.tier') }}</p><p class="text-sm font-semibold text-slate-800 mt-0.5">{{ o.tier }}</p></div>
                  <div><p class="text-[10px] font-bold text-slate-400 uppercase">{{ t('order.urgency') }}</p>
                    <p class="text-sm font-semibold mt-0.5" [class]="o.urgency === 'EXPRESS' ? 'text-red-600' : 'text-slate-800'">{{ o.urgency }}</p>
                  </div>
                  <div><p class="text-[10px] font-bold text-slate-400 uppercase">{{ t('order.pages') }}</p><p class="text-sm font-semibold text-slate-800 mt-0.5">{{ o.pageCount }}</p></div>
                  <div><p class="text-[10px] font-bold text-slate-400 uppercase">{{ t('order.delivery') }}</p><p class="text-sm font-semibold text-slate-800 mt-0.5">{{ o.deliveryType }}</p></div>
                  <div><p class="text-[10px] font-bold text-slate-400 uppercase">{{ t('order.date') }}</p><p class="text-sm font-semibold text-slate-800 mt-0.5">{{ fmtDate(o.createdAt) }}</p></div>
                  @if (o.estimatedDeliveryDate) {
                    <div><p class="text-[10px] font-bold text-slate-400 uppercase">{{ t('order.estimatedDelivery') }}</p><p class="text-sm font-semibold text-slate-800 mt-0.5">{{ o.estimatedDeliveryDate }}</p></div>
                  }
                  <div><p class="text-[10px] font-bold text-slate-400 uppercase">Version</p><p class="text-sm font-semibold text-slate-800 mt-0.5">v{{ o.currentVersion }}</p></div>
                </div>
                @if (o.clientNotes) {
                  <div class="mt-4 pt-4 border-t border-slate-100">
                    <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">{{ t('order.clientNotes') }}</p>
                    <p class="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">{{ o.clientNotes }}</p>
                  </div>
                }
                @if (o.deliveryType === 'PHYSICAL') {
                  <div class="mt-4 pt-4 border-t border-slate-100">
                    <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">{{ t('order.deliveryAddress') }}</p>
                    <p class="text-sm text-slate-700">{{ o.deliveryAddress }}, {{ o.deliveryCity }} {{ o.deliveryWilaya }} {{ o.deliveryPostalCode }}</p>
                    @if (o.deliveryPhone) { <p class="text-sm text-slate-500 mt-0.5">{{ o.deliveryPhone }}</p> }
                  </div>
                }
              </div>

              <!-- Documents -->
              <div class="anim anim-2 rounded-2xl border border-slate-200 bg-white p-5">
                <h2 class="text-base font-bold text-slate-800 mb-3">{{ t('order.documents') }}</h2>
                @if (docs().length === 0) {
                  <p class="text-sm text-slate-400 py-4 text-center">{{ t('common.noData') }}</p>
                } @else {
                  <div class="space-y-4">
                    @for (group of docVersions(); track group.version) {
                      <div>
                        <div class="flex items-center gap-2 mb-2">
                          <span class="px-2 py-0.5 text-[10px] font-bold rounded-full" [class]="group.version === currentVersion() ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'">v{{ group.version }}</span>
                          @if (group.version === currentVersion()) { <span class="text-[10px] text-blue-500 font-medium">current</span> }
                        </div>
                        <div class="space-y-1.5">
                          @for (d of group.docs; track d.id) {
                            <div class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all"
                              [class]="d.type === 'SOURCE' ? 'border-blue-200 bg-blue-50/60' : d.isFinal ? 'border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200' : 'border-slate-200 bg-slate-50'">
                              @if (isReviewable() && d.type === 'TRANSLATED') {
                                <input type="checkbox" [checked]="selectedFiles().has(d.id)" (change)="toggleFile(d.id)"
                                  class="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"/>
                              }
                              <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium truncate" [class]="d.type === 'SOURCE' ? 'text-blue-800' : 'text-slate-800'">{{ d.fileName }}</p>
                                <p class="text-[10px] text-slate-500">{{ d.type }} · {{ formatSize(d.fileSize) }}
                                  @if (d.isFinal) { · <span class="font-bold text-emerald-600">{{ t('adminReview.finalFile') }}</span> }
                                </p>
                              </div>
                              <a [href]="'/api/v1/documents/' + d.id + '/view'" target="_blank"
                                class="shrink-0 p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-100 transition-all">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                              </a>
                            </div>
                          }
                        </div>
                      </div>
                      @if (!$last) { <hr class="border-slate-100"> }
                    }
                  </div>
                }
              </div>

              <!-- Review / Comments panel (always visible) -->
              <div class="anim anim-3 rounded-2xl border border-slate-200 bg-white p-5">
                <h2 class="text-base font-bold text-slate-800 mb-3">{{ t('ws.reviewComments') }}</h2>

                <!-- Comments list -->
                @if (comments().length === 0) {
                  <p class="text-sm text-slate-400 py-4 text-center">{{ t('common.noData') }}</p>
                } @else {
                  <div class="space-y-2 max-h-72 overflow-y-auto mb-4">
                    @for (c of comments(); track c.id) {
                      <div class="px-3.5 py-2.5 rounded-xl" [class]="c.authorRole === 'ADMIN' ? 'bg-purple-50 border border-purple-100' : 'bg-blue-50 border border-blue-100'">
                        <div class="flex items-center gap-2 mb-0.5">
                          <span class="text-[10px] font-bold px-1.5 py-0.5 rounded" [class]="roleBadge(c.authorRole)">{{ t('history.' + c.authorRole) }}</span>
                          <span class="text-[10px] text-slate-400">{{ fmtDateTime(c.createdAt) }}</span>
                        </div>
                        <p class="text-sm text-slate-800">{{ c.content }}</p>
                      </div>
                    }
                  </div>
                }

                <!-- Add comment form (only when order is still active) -->
                @if (isActive()) {
                  <div class="flex gap-2">
                    <textarea [(ngModel)]="newComment" rows="2"
                      class="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 resize-none"
                      [placeholder]="t('adminReview.commentPlaceholder')"></textarea>
                    <button (click)="addComment()" [disabled]="!newComment.trim() || busy()"
                      class="px-4 py-2 text-sm font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-40 shrink-0 cursor-pointer transition-colors">
                      {{ t('adminReview.sendComment') }}
                    </button>
                  </div>
                }
              </div>

              <!-- Review actions (when PENDING_REVIEW / IN_REVIEW) -->
              @if (isReviewable()) {
                <div class="anim anim-4 rounded-2xl border-2 border-purple-200 bg-purple-50/30 p-5">
                  <h2 class="text-base font-bold text-purple-900 mb-3">{{ t('adminReview.title') }}</h2>

                  <div class="mb-4">
                    <label class="block text-xs font-bold text-slate-600 mb-1">{{ t('adminReview.verdict') }}</label>
                    <textarea [(ngModel)]="verdict" rows="2"
                      class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 resize-none"
                      [placeholder]="t('adminReview.verdictPlaceholder')"></textarea>
                  </div>

                  <div class="flex flex-col sm:flex-row gap-2">
                    <button (click)="approve()" [disabled]="busy() || selectedFiles().size === 0"
                      class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40 cursor-pointer transition-colors">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      {{ t('adminReview.approve') }}
                    </button>
                    <button (click)="reject()" [disabled]="busy()"
                      class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-40 cursor-pointer transition-colors">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"/></svg>
                      {{ t('adminReview.requestRevision') }}
                    </button>
                  </div>
                  @if (selectedFiles().size === 0) {
                    <p class="text-[11px] text-amber-600 mt-2">{{ t('adminReview.selectFilesHint') }}</p>
                  }
                </div>
              }

              <!-- History timeline -->
              <div class="anim anim-5 rounded-2xl border border-slate-200 bg-white p-5">
                <h2 class="text-base font-bold text-slate-800 mb-3">{{ t('order.history') }}</h2>
                @if (history().length === 0) {
                  <p class="text-sm text-slate-400 py-4 text-center">{{ t('common.noData') }}</p>
                } @else {
                  <div class="space-y-0">
                    @for (h of history(); track h.changedAt; let last = $last) {
                      <div class="flex gap-3">
                        <div class="flex flex-col items-center">
                          <div class="w-2.5 h-2.5 rounded-full mt-1.5" [class]="h.changedByRole === 'ADMIN' ? 'bg-purple-500' : h.changedByRole === 'TRANSLATOR' ? 'bg-emerald-500' : 'bg-blue-500'"></div>
                          @if (!last) { <div class="w-0.5 flex-1 bg-slate-200"></div> }
                        </div>
                        <div class="pb-4">
                          <div class="flex items-center gap-2 flex-wrap">
                            @if (h.fromStatus) {
                              <span class="text-xs text-slate-400">{{ t('status.' + cc(h.fromStatus)) }}</span>
                              <span class="text-slate-300">→</span>
                            }
                            <span class="text-xs font-bold text-slate-800">{{ t('status.' + cc(h.toStatus)) }}</span>
                            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded" [class]="roleBadge(h.changedByRole)">{{ t('history.' + (h.changedByRole || 'SYSTEM')) }}</span>
                          </div>
                          @if (h.reason) { <p class="text-[11px] text-slate-500 mt-0.5">{{ h.reason }}</p> }
                          <p class="text-[10px] text-slate-400 mt-0.5">{{ fmtDateTime(h.changedAt) }}</p>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>

            <!-- ====== RIGHT COLUMN (1/3) ====== -->
            <div class="space-y-5">

              <!-- Parties -->
              <div class="anim anim-1 rounded-2xl border border-slate-200 bg-white p-5">
                <h2 class="text-base font-bold text-slate-800 mb-3">{{ t('order.parties') }}</h2>
                <div class="space-y-3">
                  <div>
                    <p class="text-[10px] font-bold text-slate-400 uppercase">{{ t('order.client') }}</p>
                    <a [routerLink]="['/admin/clients', o.clientId]" class="text-sm font-semibold text-blue-600 hover:underline">{{ o.clientName || o.clientId.substring(0,8) }}</a>
                  </div>
                  <div>
                    <p class="text-[10px] font-bold text-slate-400 uppercase">{{ t('admin.translator') }}</p>
                    @if (o.translatorId) {
                      <a [routerLink]="['/admin/translators', o.translatorId]" class="text-sm font-semibold text-blue-600 hover:underline">{{ o.translatorName || o.translatorId.substring(0,8) }}</a>
                    } @else {
                      <p class="text-sm text-slate-400 italic">{{ t('common.notAssigned') }}</p>
                    }
                  </div>
                </div>
              </div>

              <!-- Financials -->
              <div class="anim anim-2 rounded-2xl border border-slate-200 bg-white p-5">
                <h2 class="text-base font-bold text-slate-800 mb-3">{{ t('order.financials') }}</h2>
                <div class="space-y-2">
                  <div class="flex justify-between"><span class="text-xs text-slate-500">{{ t('order.price') }}</span><span class="text-sm font-bold text-slate-900">{{ o.totalPrice | number }} {{ t('common.currency') }}</span></div>
                  <div class="flex justify-between"><span class="text-xs text-slate-500">{{ t('admin.translator') }}</span><span class="text-sm font-semibold text-emerald-600">{{ o.translatorAmount | number }} {{ t('common.currency') }}</span></div>
                  <div class="flex justify-between"><span class="text-xs text-slate-500">{{ t('adminFinance.platformRevenue') }}</span><span class="text-sm font-semibold text-blue-600">{{ o.platformAmount | number }} {{ t('common.currency') }}</span></div>
                </div>
              </div>



            </div>
          </div>
        }
      </div>
    </app-main-layout>
  `,
})
export class AdminOrderDetailComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslocoService);

  loading = signal(true);
  busy = signal(false);
  order = signal<Order | null>(null);
  docs = signal<Doc[]>([]);
  history = signal<History[]>([]);
  comments = signal<Comment[]>([]);
  selectedFiles = signal(new Set<string>());

  newComment = '';
  verdict = '';

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.load(id);
    this.api.get<Doc[]>(`/api/v1/admin/orders/${id}/documents`).subscribe({ next: r => this.docs.set(r.data ?? []) });
    this.api.get<History[]>(`/api/v1/admin/orders/${id}/history`).subscribe({ next: r => this.history.set(r.data ?? []) });
    this.api.get<Comment[]>(`/api/v1/admin/orders/${id}/review-comments`).subscribe({ next: r => this.comments.set(r.data ?? []) });
  }

  load(id: string) {
    this.api.get<Order>(`/api/v1/admin/orders/${id}`).subscribe({
      next: r => { if (r.data) this.order.set(r.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  isReviewable(): boolean {
    const s = this.order()?.status;
    return s === 'PENDING_REVIEW' || s === 'IN_REVIEW';
  }

  isActive(): boolean {
    const s = this.order()?.status;
    return !!s && !['DELIVERED', 'APPROVED', 'CANCELLED', 'SUSPENDED'].includes(s);
  }

  currentVersion(): number { return this.order()?.currentVersion ?? 1; }

  docVersions(): { version: number; docs: Doc[] }[] {
    const grouped = new Map<number, Doc[]>();
    for (const d of this.docs()) {
      const v = d.submissionVersion || 1;
      if (!grouped.has(v)) grouped.set(v, []);
      grouped.get(v)!.push(d);
    }
    return Array.from(grouped.entries())
      .sort((a, b) => b[0] - a[0]) // newest first
      .map(([version, docs]) => ({ version, docs }));
  }

  // --- Actions ---

  addComment() {
    const id = this.order()?.id;
    if (!id || !this.newComment.trim()) return;
    this.busy.set(true);
    this.api.post<Comment>(`/api/v1/admin/orders/${id}/review/comment`, { content: this.newComment }).subscribe({
      next: r => { if (r.data) this.comments.update(l => [...l, r.data!]); this.newComment = ''; this.busy.set(false); this.toast.success(this.t.translate('adminReview.commentSent')); this.load(id); },
      error: (e: HttpErrorResponse) => { this.busy.set(false); this.toast.error(e.error?.message || 'Error'); },
    });
  }

  approve() {
    const id = this.order()?.id;
    if (!id) return;
    this.busy.set(true);
    const fileIds = [...this.selectedFiles()];
    this.api.post(`/api/v1/admin/orders/${id}/review/select-files`, { fileIds }).subscribe({
      next: () => {
        this.api.patch(`/api/v1/admin/orders/${id}/review/approve`, { verdict: this.verdict }).subscribe({
          next: () => { this.busy.set(false); this.toast.success(this.t.translate('adminReview.approveSuccess')); this.reload(id); },
          error: (e: HttpErrorResponse) => { this.busy.set(false); this.toast.error(e.error?.message || 'Error'); },
        });
      },
      error: (e: HttpErrorResponse) => { this.busy.set(false); this.toast.error(e.error?.message || 'Error'); },
    });
  }

  reject() {
    const id = this.order()?.id;
    if (!id) return;
    this.busy.set(true);
    this.api.patch(`/api/v1/admin/orders/${id}/review/reject`, { verdict: this.verdict }).subscribe({
      next: () => { this.busy.set(false); this.toast.success(this.t.translate('adminReview.rejectSuccess')); this.reload(id); },
      error: (e: HttpErrorResponse) => { this.busy.set(false); this.toast.error(e.error?.message || 'Error'); },
    });
  }

  toggleFile(docId: string) {
    const s = new Set(this.selectedFiles());
    if (s.has(docId)) s.delete(docId); else s.add(docId);
    this.selectedFiles.set(s);
  }

  private reload(id: string) {
    this.load(id);
    this.api.get<Doc[]>(`/api/v1/admin/orders/${id}/documents`).subscribe({ next: r => this.docs.set(r.data ?? []) });
    this.api.get<History[]>(`/api/v1/admin/orders/${id}/history`).subscribe({ next: r => this.history.set(r.data ?? []) });
    this.api.get<Comment[]>(`/api/v1/admin/orders/${id}/review-comments`).subscribe({ next: r => this.comments.set(r.data ?? []) });
  }

  // --- Helpers ---

  statusBadge(s: string): string {
    const m: Record<string, string> = {
      PAID: 'bg-green-100 text-green-700', IN_PROGRESS: 'bg-blue-100 text-blue-700', ASSIGNED: 'bg-cyan-100 text-cyan-700',
      PENDING_REVIEW: 'bg-amber-100 text-amber-700', IN_REVIEW: 'bg-purple-100 text-purple-700',
      REVISION_REQUESTED: 'bg-orange-100 text-orange-700', APPROVED: 'bg-emerald-100 text-emerald-700',
      PENDING_DELIVERY: 'bg-indigo-100 text-indigo-700', DELIVERED: 'bg-emerald-100 text-emerald-700',
      CANCELLED: 'bg-red-100 text-red-700', SUSPENDED: 'bg-red-100 text-red-700', DISPUTED: 'bg-red-100 text-red-700',
    };
    return m[s] ?? 'bg-slate-100 text-slate-700';
  }

  roleBadge(role: string): string {
    const m: Record<string, string> = { CLIENT: 'bg-blue-100 text-blue-700', TRANSLATOR: 'bg-emerald-100 text-emerald-700', ADMIN: 'bg-purple-100 text-purple-700' };
    return m[role] || 'bg-slate-100 text-slate-600';
  }

  cc(s: string): string { return s?.toLowerCase().replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase()) ?? ''; }
  fmtDate(d: string): string { if (!d) return ''; try { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return d; } }
  fmtDateTime(d: string): string { if (!d) return ''; try { return new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return d; } }
  formatSize(bytes: number): string { if (!bytes) return ''; if (bytes < 1024) return bytes + ' B'; if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'; return (bytes / 1048576).toFixed(1) + ' MB'; }
}
