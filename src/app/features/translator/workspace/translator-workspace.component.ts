import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MainLayoutComponent } from '../../../shared/layouts/main-layout/main-layout.component';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateLangPipe } from '../../../shared/pipes/translate-lang.pipe';
import { AnalyticsService } from '../../../core/services/analytics.service';
interface OrderData { id: string; documentType: string; sourceLanguage: string; targetLanguage: string; tier: string; status: string; totalPrice: number; translatorAmount: number; pageCount: number; clientNotes: string; deliveryType: string; urgency: string; createdAt: string; estimatedDeliveryDate: string; translatorId: string; currentVersion: number; }
interface DocInfo { id: string; type: string; fileName: string; fileSize: number; mimeType: string; createdAt: string; submissionVersion: number; isFinal: boolean; }
interface HistoryEntry { fromStatus: string; toStatus: string; changedAt: string; reason: string; changedByRole: string; }
interface ReviewData { id: string; status: string; verdict: string; reviewedAt: string; }
interface ReviewComment { id: string; authorRole: string; content: string; createdAt: string; }

@Component({
  selector: 'app-translator-workspace',
  standalone: true,
  imports: [MainLayoutComponent, TranslocoModule, FormsModule, DecimalPipe, ConfirmDialogComponent, TranslateLangPipe],
  styles: [`
    @keyframes fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    .anim { animation: fade-up 0.4s ease-out both; }
    .anim-1 { animation-delay: 0.05s; }
    .anim-2 { animation-delay: 0.1s; }
  `],
  template: `
    <app-main-layout>
      <div *transloco="let t">
        @if (loading()) {
          <div class="flex items-center justify-center py-20"><svg class="w-6 h-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg></div>
        } @else if (!order()) {
          <div class="text-center py-20 text-slate-500">{{ t('common.noData') }}</div>
        } @else {
          <!-- Header -->
          <div class="anim mb-6">
            <button (click)="goBack()" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4 cursor-pointer">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
              {{ t('common.back') }}
            </button>
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div class="flex items-center gap-3 flex-wrap">
                  <h1 class="text-xl sm:text-2xl font-bold text-slate-900">{{ order()!.documentType }}</h1>
                  <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold" [class]="getStatusBadge(order()!.status)">{{ t('status.' + camelCase(order()!.status)) }}</span>
                  @if (order()!.urgency === 'EXPRESS') { <span class="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 uppercase">Express</span> }
                </div>
                <p class="text-sm text-slate-500 mt-1"><bdi dir="ltr">{{ order()!.sourceLanguage | translateLang }} → {{ order()!.targetLanguage | translateLang }}</bdi> · {{ order()!.pageCount }} {{ t('order.pages') }}</p>
              </div>
              <div class="text-end"><p class="text-xs text-slate-400">{{ t('myOrders.earnings') }}</p><p class="text-xl font-black text-emerald-600">{{ order()!.translatorAmount | number }} {{ t('common.currency') }}</p></div>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 space-y-6">

              <!-- Source Documents -->
              <div class="anim anim-1 rounded-2xl border border-slate-200 bg-white p-5">
                <div class="flex items-center gap-2 mb-4">
                  <svg class="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                  <h2 class="text-sm font-bold text-slate-900">{{ t('ws.sourceDocuments') }}</h2>
                  <span class="text-xs text-slate-400 ms-auto">{{ sourceDocs().length }} {{ t('newOrder.filesCount') }}</span>
                </div>
                @if (sourceDocs().length === 0) {
                  <p class="text-sm text-slate-400 text-center py-4">{{ t('ws.noSource') }}</p>
                } @else {
                  <div class="space-y-2">
                    @for (doc of sourceDocs(); track doc.id) {
                      <div class="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50">
                        <svg class="w-4 h-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                        <div class="flex-1 min-w-0"><p class="text-sm text-slate-700 truncate">{{ doc.fileName }}</p><p class="text-[10px] text-slate-400">{{ formatFileSize(doc.fileSize) }} · {{ formatDateTime(doc.createdAt) }}</p></div>
                        <a [href]="'/api/v1/translator/documents/' + doc.id + '/view'" target="_blank" class="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all" [title]="t('ws.preview')">
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </a>
                        <a [href]="'/api/v1/translator/documents/' + doc.id + '/download'" target="_blank" class="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all" [title]="t('common.download')">
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                        </a>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Delivered Files (only when DELIVERED) -->
              @if (order()!.status === 'DELIVERED' && finalDocs().length > 0) {
                <div class="anim anim-1 rounded-2xl border-2 border-emerald-200 bg-emerald-50/30 p-5">
                  <div class="flex items-center gap-2 mb-3">
                    <svg class="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <h2 class="text-sm font-bold text-emerald-900">{{ t('ws.deliveredFiles') }}</h2>
                    <span class="text-xs text-emerald-500 ms-auto">{{ finalDocs().length }} {{ t('newOrder.filesCount') }}</span>
                  </div>
                  <div class="space-y-2">
                    @for (doc of finalDocs(); track doc.id) {
                      <div class="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-emerald-300 bg-white">
                        <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <div class="flex-1 min-w-0"><p class="text-sm font-medium text-emerald-900 truncate">{{ doc.fileName }}</p><p class="text-[10px] text-emerald-500">{{ t('ws.version') }} {{ doc.submissionVersion }} · {{ formatFileSize(doc.fileSize) }} · {{ formatDateTime(doc.createdAt) }}</p></div>
                        <a [href]="'/api/v1/documents/' + doc.id + '/view'" target="_blank" class="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100 transition-all"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></a>
                        <a [href]="'/api/v1/translator/documents/' + doc.id + '/download'" target="_blank" class="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100 transition-all"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg></a>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Upload Translation -->
              <div class="anim anim-1 rounded-2xl border border-slate-200 bg-white p-5">
                <div class="flex items-center gap-2 mb-4">
                  <svg class="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                  <h2 class="text-sm font-bold text-slate-900">{{ t('ws.translatedDocuments') }}</h2>
                </div>
                @if (translatedDocs().length > 0) {
                  <div class="mb-4 space-y-4">
                    @for (ver of getVersions(); track ver) {
                      <div>
                        <p class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{{ t('ws.version') }} {{ ver }}</p>
                        <div class="space-y-2">
                          @for (doc of getDocsByVersion(ver); track doc.id) {
                            <div class="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50">
                              @if (doc.isFinal) { <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> }
                              <div class="flex-1 min-w-0"><p class="text-sm text-emerald-800 truncate">{{ doc.fileName }}</p><p class="text-[10px] text-emerald-500">{{ formatFileSize(doc.fileSize) }} · {{ formatDateTime(doc.createdAt) }}</p></div>
                              <a [href]="'/api/v1/documents/' + doc.id + '/view'" target="_blank" class="p-1.5 rounded-lg text-emerald-500 hover:text-emerald-700 hover:bg-emerald-100 transition-all"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></a>
                              <a [href]="'/api/v1/translator/documents/' + doc.id + '/download'" target="_blank" class="p-1.5 rounded-lg text-emerald-500 hover:text-emerald-700 hover:bg-emerald-100 transition-all"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg></a>
                              @if (canUpload() && doc.submissionVersion === order()!.currentVersion) {
                                <button (click)="deleteDocument(doc.id)" class="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                              }
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
                @if (canUpload()) {
                  <label class="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all">
                    <svg class="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                    <p class="text-sm text-slate-600 font-medium">{{ translatedDocs().length > 0 ? t('workspace.replaceTranslation') : t('workspace.uploadTranslation') }}</p>
                    <p class="text-xs text-slate-400">PDF, DOCX</p>
                    <input type="file" class="hidden" accept=".pdf,.docx" multiple (change)="onFilesSelected($event)" />
                  </label>
                  @if (selectedFiles().length > 0) {
                    <div class="mt-3 space-y-2">
                      @for (f of selectedFiles(); track f.name) {
                        <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700">
                          <span class="flex-1 truncate">{{ f.name }}</span>
                          <span class="text-xs text-slate-400 shrink-0">{{ (f.size / 1024).toFixed(0) }} KB</span>
                        </div>
                      }
                      <button (click)="uploadAllTranslations()" [disabled]="uploading()" class="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer">
                        @if (uploading()) { <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> }
                        {{ t('workspace.uploadFile') }} ({{ selectedFiles().length }})
                      </button>
                    </div>
                  }
                }
              </div>


              <!-- Chat between translator & reviewer -->
              @if (reviewComments().length > 0 || order()!.status === 'IN_REVIEW' || order()!.status === 'REVISION_REQUESTED') {
                <div class="anim anim-2 rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <div class="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <svg class="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
                    <h2 class="text-sm font-bold text-slate-900">{{ t('ws.chat') }}</h2>
                  </div>
                  <!-- Messages -->
                  <div class="p-4 max-h-[400px] overflow-y-auto space-y-3">
                    @if (reviewComments().length === 0) {
                      <p class="text-sm text-slate-400 text-center py-4">{{ t('ws.noMessages') }}</p>
                    }
                    @for (c of reviewComments(); track c.id) {
                      <div class="flex" [class]="c.authorRole === 'ADMIN' ? 'justify-start' : 'justify-end'">
                        <div class="max-w-[80%] p-3 rounded-2xl" [class]="c.authorRole === 'ADMIN' ? 'bg-purple-100 rounded-tl-sm' : 'bg-blue-100 rounded-tr-sm'">
                          <div class="flex items-center gap-2 mb-0.5">
                            <span class="text-[10px] font-bold" [class]="c.authorRole === 'ADMIN' ? 'text-purple-600' : 'text-blue-600'">{{ t('history.' + c.authorRole) }}</span>
                            <span class="text-[10px] text-slate-400">{{ formatDateTime(c.createdAt) }}</span>
                          </div>
                          <p class="text-sm text-slate-800">{{ c.content }}</p>
                        </div>
                      </div>
                    }
                  </div>
                  <!-- Input -->
                  @if (order()!.status === 'IN_REVIEW' || order()!.status === 'REVISION_REQUESTED') {
                    <div class="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex gap-2">
                      <textarea [(ngModel)]="reviewComment" rows="2"
                        class="flex-1 px-3.5 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                        [placeholder]="t('ws.typMessage')"></textarea>
                      <button (click)="addComment()" [disabled]="!reviewComment.trim()"
                        class="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-40 cursor-pointer shrink-0">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                      </button>
                    </div>
                  }
                </div>
              }

              <!-- History -->
              <div class="anim anim-2 rounded-2xl border border-slate-200 bg-white p-5">
                <div class="flex items-center gap-2 mb-4">
                  <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <h2 class="text-sm font-bold text-slate-900">{{ t('order.history') }}</h2>
                </div>
                <div class="space-y-2">
                  @for (h of history(); track h.changedAt) {
                    <div class="flex gap-3">
                      <div class="flex flex-col items-center"><div class="w-2 h-2 rounded-full bg-slate-300 mt-1.5"></div><div class="w-0.5 flex-1 bg-slate-200"></div></div>
                      <div class="pb-3">
                        <div class="flex items-center gap-2">
                          <p class="text-sm text-slate-700">@if (h.fromStatus) { {{ t('status.' + camelCase(h.fromStatus)) }} → } <span class="font-bold">{{ t('status.' + camelCase(h.toStatus)) }}</span></p>
                          <span class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold" [class]="getRoleBadge(h.changedByRole)">{{ t('history.' + (h.changedByRole || 'SYSTEM')) }}</span>
                        </div>
                        @if (h.reason) { <p class="text-xs text-slate-500 mt-0.5">{{ h.reason }}</p> }
                        <p class="text-xs text-slate-400 mt-0.5">{{ formatDateTime(h.changedAt) }}</p>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- RIGHT -->
            <div class="space-y-6">
              <div class="anim rounded-2xl border border-slate-200 bg-white p-5">
                <h3 class="text-sm font-bold text-slate-900 mb-3">{{ t('orderDetail.orderInfo') }}</h3>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between"><span class="text-slate-400">{{ t('order.tier') }}</span><span class="font-semibold text-slate-800">{{ order()!.tier === 'OFFICIAL' ? t('order.official') : t('order.standard') }}</span></div>
                  <div class="flex justify-between"><span class="text-slate-400">{{ t('order.urgency') }}</span><span class="font-semibold" [class]="order()!.urgency === 'EXPRESS' ? 'text-red-600' : 'text-slate-800'">{{ order()!.urgency === 'EXPRESS' ? t('order.express') : t('order.normal') }}</span></div>
                  <div class="flex justify-between"><span class="text-slate-400">{{ t('order.deliveryType') }}</span><span class="font-semibold text-slate-800">{{ t('delivery.' + order()!.deliveryType.toLowerCase()) }}</span></div>
                  @if (order()!.estimatedDeliveryDate) { <div class="flex justify-between"><span class="text-slate-400">{{ t('order.deadline') }}</span><span class="font-semibold text-slate-800">{{ order()!.estimatedDeliveryDate }}</span></div> }
                  <div class="flex justify-between"><span class="text-slate-400">{{ t('order.totalPrice') }}</span><span class="font-semibold text-slate-800">{{ order()!.totalPrice | number }} {{ t('common.currency') }}</span></div>
                </div>
                @if (order()!.clientNotes) {
                  <div class="mt-3 pt-3 border-t border-slate-100"><p class="text-xs text-slate-400 mb-1">{{ t('order.notes') }}</p><p class="text-sm text-slate-700">{{ order()!.clientNotes }}</p></div>
                }
              </div>

              <div class="anim anim-1 rounded-2xl border border-slate-200 bg-white p-5">
                <h3 class="text-sm font-bold text-slate-900 mb-3">{{ t('common.actions') }}</h3>
                <div class="space-y-2">
                    @if (order()!.status === 'IN_PROGRESS' || order()!.status === 'REVISION_REQUESTED') {
                      <button (click)="showSubmitDialog.set(true)" [disabled]="!hasCurrentVersionFiles()"
                        class="flex items-center gap-2.5 w-full px-4 py-2.5 rounded-xl bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                        {{ t('workspace.submitForReview') }}
                      </button>
                    }
                    @if (order()!.status === 'PENDING_REVIEW') {
                      <button (click)="showCancelReviewDialog.set(true)"
                        class="flex items-center gap-2.5 w-full px-4 py-2.5 rounded-xl border border-amber-200 text-sm font-semibold text-amber-700 hover:bg-amber-50 transition-all cursor-pointer">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
                        {{ t('ws.cancelReview') }}
                      </button>
                    }
                  <button (click)="showFlagDialog.set(true)"
                    class="flex items-center gap-2.5 w-full px-4 py-2.5 rounded-xl border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50 transition-all cursor-pointer">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" /></svg>
                    {{ t('workspace.flagSuspect') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        }

        <app-confirm-dialog [isOpen]="showSubmitDialog()" [title]="t('ws.submitTitle')" [message]="t('ws.submitMessage')" confirmText="workspace.submitForReview" cancelText="common.cancel" variant="info" (confirmed)="submitForReview()" (cancelled)="showSubmitDialog.set(false)" />
        <app-confirm-dialog [isOpen]="showCancelReviewDialog()" [title]="t('ws.cancelReviewTitle')" [message]="t('ws.cancelReviewMessage')" confirmText="ws.cancelReviewConfirm" cancelText="common.cancel" variant="danger" (confirmed)="cancelReview()" (cancelled)="showCancelReviewDialog.set(false)" />
        <app-confirm-dialog [isOpen]="showFlagDialog()" [title]="t('workspace.flagSuspect')" [message]="t('ws.flagMessage')" confirmText="ws.flagConfirm" cancelText="common.cancel" variant="danger" [requireCheckbox]="true" [checkboxLabel]="t('ws.flagCheckbox')" (confirmed)="flagSuspect()" (cancelled)="showFlagDialog.set(false)" />
      </div>
    </app-main-layout>
  `,
})
export class TranslatorWorkspaceComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly analytics = inject(AnalyticsService);
  loading = signal(true);
  order = signal<OrderData | null>(null);
  sourceDocs = signal<DocInfo[]>([]);
  translatedDocs = signal<DocInfo[]>([]);
  finalDocs = signal<DocInfo[]>([]);
  review = signal<ReviewData | null>(null);
  reviewComments = signal<ReviewComment[]>([]);
  history = signal<HistoryEntry[]>([]);
  selectedFiles = signal<File[]>([]);
  uploading = signal(false);
  showSubmitDialog = signal(false);
  showCancelReviewDialog = signal(false);
  showFlagDialog = signal(false);
  private orderId = '';

  reviewComment = '';

  ngOnInit() {
    this.orderId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.orderId) return;
    this.api.get<OrderData>('/api/v1/translator/orders/' + this.orderId).subscribe({ next: (res) => { if (res.data) this.order.set(res.data); this.loading.set(false); }, error: () => this.loading.set(false) });
    this.loadDocuments();
    this.api.get<HistoryEntry[]>('/api/v1/translator/orders/' + this.orderId + '/history').subscribe({ next: (res) => { if (res.data) this.history.set(res.data); } });
    this.api.get<ReviewData>('/api/v1/translator/orders/' + this.orderId + '/review').subscribe({ next: (res) => { if (res.data) this.review.set(res.data); } });
    this.api.get<ReviewComment[]>('/api/v1/translator/orders/' + this.orderId + '/review-comments').subscribe({ next: (res) => { if (res.data) this.reviewComments.set(res.data); } });
  }

  loadDocuments() {
    this.api.get<DocInfo[]>('/api/v1/translator/orders/' + this.orderId + '/documents').subscribe({ next: (res) => {
      const d = res.data ?? [];
      this.sourceDocs.set(d.filter(x => x.type === 'SOURCE'));
      this.finalDocs.set(d.filter(x => x.type === 'TRANSLATED' && x.isFinal));
      this.translatedDocs.set(d.filter(x => x.type === 'TRANSLATED'));
    } });
  }

  canUpload(): boolean { const s = this.order()?.status; return s === 'IN_PROGRESS' || s === 'REVISION_REQUESTED'; }

  hasCurrentVersionFiles(): boolean {
    const ver = this.order()?.currentVersion || 1;
    return this.translatedDocs().some(d => d.submissionVersion === ver);
  }

  onFilesSelected(e: Event) {
    const i = e.target as HTMLInputElement;
    if (i.files?.length) this.selectedFiles.set(Array.from(i.files));
  }

  uploadAllTranslations() {
    const files = this.selectedFiles();
    if (files.length === 0) return;
    this.analytics.track('translator_translation_uploaded', { fileCount: this.selectedFiles().length });
    this.uploading.set(true);
    this.uploadSequentially(files, 0);
  }

  private uploadSequentially(files: File[], index: number) {
    if (index >= files.length) {
      this.uploading.set(false);
      this.selectedFiles.set([]);
      this.loadDocuments();
      this.toast.success(this.transloco.translate('workspace.documentUploaded'));
      return;
    }
    this.api.upload('/api/v1/translator/orders/' + this.orderId + '/upload-translation', files[index]).subscribe({
      next: () => this.uploadSequentially(files, index + 1),
      error: (err: HttpErrorResponse) => {
        this.uploading.set(false);
        this.toast.error(err.error?.message || this.transloco.translate('common.error'));
      },
    });
  }

  deleteDocument(docId: string) {
    this.api.delete('/api/v1/translator/orders/' + this.orderId + '/documents/' + docId).subscribe({
      next: () => { this.loadDocuments(); this.toast.success(this.transloco.translate('ws.docDeleted')); this.analytics.track('translator_document_deleted'); },
      error: (err: HttpErrorResponse) => this.toast.error(err.error?.message || this.transloco.translate('common.error')),
    });
  }

  submitForReview() {
    this.showSubmitDialog.set(false);
    this.api.patch('/api/v1/translator/orders/' + this.orderId + '/submit').subscribe({
      next: () => { this.order.update(o => o ? { ...o, status: 'PENDING_REVIEW' } : o); this.toast.success(this.transloco.translate('ws.submitSuccess')); this.analytics.track('translator_submitted_for_review'); },
      error: (err: HttpErrorResponse) => this.toast.error(err.error?.message || this.transloco.translate('common.error')),
    });
  }

  cancelReview() {
    this.showCancelReviewDialog.set(false);
    this.api.patch('/api/v1/translator/orders/' + this.orderId + '/cancel-review').subscribe({
      next: () => { this.order.update(o => o ? { ...o, status: 'IN_PROGRESS' } : o); this.toast.success(this.transloco.translate('ws.cancelReviewSuccess')); this.analytics.track('translator_review_cancelled'); },
      error: (err: HttpErrorResponse) => this.toast.error(err.error?.message || this.transloco.translate('common.error')),
    });
  }

  flagSuspect() {
    this.showFlagDialog.set(false);
    this.api.post('/api/v1/translator/orders/' + this.orderId + '/flag-suspect', { documentId: this.orderId, description: 'Document flagged as suspect' }).subscribe({
      next: () => { this.toast.success(this.transloco.translate('ws.flagSuccess')); this.analytics.track('translator_order_flagged'); },
      error: (err: HttpErrorResponse) => this.toast.error(err.error?.message || this.transloco.translate('common.error')),
    });
  }

  addComment() {
    if (!this.reviewComment.trim()) return;
    this.api.post<any>('/api/v1/translator/orders/' + this.orderId + '/review-comment', { content: this.reviewComment }).subscribe({
      next: (res) => {
        if (res.data) this.reviewComments.update(list => [...list, res.data]);
        this.reviewComment = '';
        this.toast.success(this.transloco.translate('reviewerPanel.commentSent'));
      },
      error: (err: HttpErrorResponse) => this.toast.error(err.error?.message || this.transloco.translate('common.error')),
    });
  }


  getVersions(): number[] {
    const versions = [...new Set(this.translatedDocs().map(d => d.submissionVersion))];
    return versions.sort((a, b) => b - a); // newest first
  }

  getDocsByVersion(ver: number): DocInfo[] {
    return this.translatedDocs().filter(d => d.submissionVersion === ver);
  }

  goBack() { this.location.back(); }

  getRoleBadge(role: string): string { const m: Record<string,string> = { CLIENT:'bg-blue-100 text-blue-700', TRANSLATOR:'bg-emerald-100 text-emerald-700', ADMIN:'bg-purple-100 text-purple-700' }; return m[role]||'bg-slate-100 text-slate-600'; }
  formatFileSize(b: number): string { if (!b) return ''; if (b < 1024) return b+' o'; if (b < 1048576) return (b/1024).toFixed(0)+' Ko'; return (b/1048576).toFixed(1)+' Mo'; }
  formatDateTime(d: string): string { if (!d) return ''; try { return new Date(d).toLocaleString('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }); } catch { return d; } }
  camelCase(s: string): string { return s.toLowerCase().replaceAll(/_([a-z])/g, (_: string, c: string) => c.toUpperCase()); }
  getStatusBadge(s: string): string { const m: Record<string,string> = { IN_PROGRESS:'bg-blue-50 text-blue-700', PENDING_REVIEW:'bg-amber-50 text-amber-700', IN_REVIEW:'bg-amber-50 text-amber-700', REVISION_REQUESTED:'bg-red-50 text-red-700', APPROVED:'bg-emerald-50 text-emerald-700', DELIVERED:'bg-emerald-50 text-emerald-700' }; return m[s]||'bg-slate-50 text-slate-700'; }
}
