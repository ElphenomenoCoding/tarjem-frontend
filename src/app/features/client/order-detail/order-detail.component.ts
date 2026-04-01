import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MainLayoutComponent } from '../../../shared/layouts/main-layout/main-layout.component';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateLangPipe } from '../../../shared/pipes/translate-lang.pipe';

interface OrderData {
  id: string; clientId: string; translatorId: string;
  documentType: string; sourceLanguage: string; targetLanguage: string;
  tier: string; status: string; totalPrice: number; translatorAmount: number;
  pageCount: number; estimatedDeliveryDate: string; clientNotes: string;
  deliveryType: string; urgency: string; createdAt: string; updatedAt: string;
  deliveryAddress: string; deliveryCity: string; deliveryWilaya: string; deliveryPostalCode: string;
  deliveryPhone: string; documentCount: number;
}
interface HistoryEntry { fromStatus: string; toStatus: string; changedAt: string; reason: string; changedByRole: string; }
interface DocInfo { id: string; type: string; fileName: string; fileSize: number; mimeType: string; createdAt: string; }

const ACTIVE_STATUSES = ['PAID','IN_PROGRESS','PENDING_REVIEW','IN_REVIEW','REVISION_REQUESTED','APPROVED','PENDING_DELIVERY'];
const STATUS_STEPS = ['PAID','IN_PROGRESS','PENDING_DELIVERY','DELIVERED'];
// Internal review statuses that should appear as "IN_PROGRESS" to the client
const INTERNAL_STATUSES = ['PENDING_REVIEW', 'IN_REVIEW', 'REVISION_REQUESTED', 'REVIEW_COMPLETE'];

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [MainLayoutComponent, TranslocoModule, RouterLink, DecimalPipe, FormsModule, ConfirmDialogComponent, ModalComponent, TranslateLangPipe],
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
          <div class="flex items-center justify-center py-20">
            <svg class="w-6 h-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
          </div>
        } @else if (!order()) {
          <div class="text-center py-20 text-slate-500">{{ t('common.noData') }}</div>
        } @else {
          <!-- Back + Header -->
          <div class="anim mb-6">
            <button (click)="goBack()" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4 cursor-pointer">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
              {{ t('common.back') }}
            </button>
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div class="flex items-center gap-3 flex-wrap">
                  <h1 class="text-xl sm:text-2xl font-bold text-slate-900">{{ order()!.documentType }}</h1>
                  <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold" [class]="getStatusBadge(mapStatus())">{{ t('status.' + camelCase(mapStatus())) }}</span>
                  @if (order()!.urgency === 'EXPRESS') { <span class="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 uppercase">Express</span> }
                </div>
                <p class="text-sm text-slate-500 mt-1">{{ t('orderDetail.createdOn') }} {{ formatDate(order()!.createdAt) }}</p>
              </div>
            </div>
          </div>

          <!-- Progress bar (simplified) -->
          @if (isActive()) {
            <div class="anim rounded-2xl border border-slate-200 bg-white p-5 mb-6">
              <div class="flex items-center gap-1 overflow-x-auto">
                @for (step of progressSteps; track step; let i = $index) {
                  <div class="flex items-center gap-1 shrink-0">
                    <div class="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold"
                      [class]="getProgressClass(step)">
                      @if (isStepDone(step)) { <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg> }
                      @else { {{ i + 1 }} }
                    </div>
                    <span class="text-[10px] font-medium hidden md:block" [class]="isStepDone(step) ? 'text-emerald-600' : isStepCurrent(step) ? 'text-blue-600' : 'text-slate-400'">{{ t('status.' + camelCase(step)) }}</span>
                  </div>
                  @if (i < progressSteps.length - 1) { <div class="flex-1 h-0.5 min-w-4" [class]="isStepDone(step) ? 'bg-emerald-400' : 'bg-slate-200'"></div> }
                }
              </div>
            </div>
          }

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- LEFT: Main info -->
            <div class="lg:col-span-2 space-y-6">

              <!-- Order Info -->
              <div class="anim anim-1 rounded-2xl border border-slate-200 bg-white p-5">
                <h2 class="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <svg class="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                  {{ t('orderDetail.orderInfo') }}
                </h2>
                <div class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div><span class="text-slate-500">{{ t('order.languagePair') }}</span><p class="font-semibold text-slate-900"><bdi dir="ltr">{{ order()!.sourceLanguage | translateLang }} → {{ order()!.targetLanguage | translateLang }}</bdi></p></div>
                  <div><span class="text-slate-500">{{ t('order.tier') }}</span><p class="font-semibold text-slate-900">{{ order()!.tier === 'OFFICIAL' ? t('order.official') : t('order.standard') }}</p></div>
                  <div><span class="text-slate-500">{{ t('order.pageCount') }}</span><p class="font-semibold text-slate-900">{{ order()!.pageCount }}</p></div>
                  <div><span class="text-slate-500">{{ t('order.urgency') }}</span><p class="font-semibold" [class]="order()!.urgency === 'EXPRESS' ? 'text-red-600' : 'text-slate-900'">{{ order()!.urgency === 'EXPRESS' ? t('order.express') : t('order.normal') }}</p></div>
                  <div><span class="text-slate-500">{{ t('order.deliveryType') }}</span><p class="font-semibold text-slate-900">{{ t('delivery.' + order()!.deliveryType.toLowerCase()) }}</p></div>
                  @if (order()!.estimatedDeliveryDate) { <div><span class="text-slate-500">{{ t('order.deadline') }}</span><p class="font-semibold text-slate-900">{{ order()!.estimatedDeliveryDate }}</p></div> }
                </div>
                @if (order()!.clientNotes) {
                  <div class="mt-4 pt-4 border-t border-slate-100"><span class="text-sm text-slate-500">{{ t('order.notes') }}</span><p class="text-sm text-slate-700 mt-1">{{ order()!.clientNotes }}</p></div>
                }
              </div>

              <!-- Delivery Address -->
              @if (order()!.deliveryType === 'PHYSICAL' && order()!.deliveryAddress) {
                <div class="anim anim-1 rounded-2xl border border-slate-200 bg-white p-5">
                  <h2 class="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <svg class="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z" /></svg>
                    {{ t('orderDetail.deliveryAddress') }}
                  </h2>
                  <p class="text-sm text-slate-700">{{ order()!.deliveryAddress }}</p>
                  <p class="text-sm text-slate-700">{{ order()!.deliveryCity }} {{ order()!.deliveryPostalCode }}</p>
                  @if (order()!.deliveryWilaya) { <p class="text-sm text-slate-700">{{ order()!.deliveryWilaya }}</p> }
                  @if (order()!.deliveryPhone) {
                    <div class="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                      <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                      <p class="text-sm font-medium text-slate-700">{{ order()!.deliveryPhone }}</p>
                    </div>
                  }
                </div>
              }

              <!-- Documents -->
              <div class="anim anim-2 rounded-2xl border border-slate-200 bg-white p-5">
                <h2 class="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <svg class="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                  {{ t('orderDetail.documents') }}
                </h2>
                <!-- Source documents (always visible) -->
                @if (sourceDocs().length > 0) {
                  <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{{ t('orderDetail.sourceDoc') }}</p>
                  <div class="space-y-2 mb-4">
                    @for (doc of sourceDocs(); track doc.id) {
                      <div class="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50">
                        <svg class="w-4 h-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                        <div class="flex-1 min-w-0"><p class="text-sm font-medium text-slate-800 truncate">{{ doc.fileName }}</p><p class="text-xs text-slate-400">{{ formatFileSize(doc.fileSize) }} · {{ formatDateTime(doc.createdAt) }}</p></div>
                        <a [href]="'/api/v1/documents/' + doc.id + '/view'" target="_blank" class="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></a>
                        <a [href]="'/api/v1/client/documents/' + doc.id + '/download'" target="_blank" class="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg></a>
                      </div>
                    }
                  </div>
                }

                <!-- Translated documents -->
                @if (translatedDocs().length > 0) {
                  <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{{ t('orderDetail.translatedDoc') }}</p>
                  @if (order()!.status === 'DELIVERED' || order()!.status === 'PENDING_DELIVERY' || order()!.status === 'APPROVED') {
                    <!-- Delivered: full access -->
                    <div class="space-y-2 mb-4">
                      @for (doc of translatedDocs(); track doc.id) {
                        <div class="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50">
                          <svg class="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <div class="flex-1 min-w-0"><p class="text-sm font-medium text-emerald-800 truncate">{{ doc.fileName }}</p><p class="text-xs text-emerald-500">{{ formatFileSize(doc.fileSize) }} · {{ formatDateTime(doc.createdAt) }}</p></div>
                          <a [href]="'/api/v1/documents/' + doc.id + '/view'" target="_blank" class="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100 transition-all"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></a>
                          <a [href]="'/api/v1/client/documents/' + doc.id + '/download'" target="_blank" class="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100 transition-all"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg></a>
                        </div>
                      }
                    </div>
                  } @else {
                    <!-- Not delivered: blurred placeholder -->
                    <div class="space-y-2 mb-4">
                      @for (doc of translatedDocs(); track doc.id) {
                        <div class="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-100/50 select-none">
                          <svg class="w-4 h-4 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                          <div class="flex-1 min-w-0"><p class="text-sm font-medium text-slate-400 truncate blur-sm">{{ doc.fileName }}</p><p class="text-xs text-slate-300">{{ t('orderDetail.docLocked') }}</p></div>
                        </div>
                      }
                    </div>
                  }
                } @else if (order()!.status !== 'PAID' && order()!.status !== 'DELIVERED') {
                  <!-- Translation in progress indicator -->
                  <div class="rounded-xl bg-blue-50 border border-blue-200 p-4 flex items-center gap-3 mb-4">
                    <svg class="w-5 h-5 text-blue-400 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                    <p class="text-sm text-blue-700">{{ t('orderDetail.translationInProgress') }}</p>
                  </div>
                }

                @if (sourceDocs().length === 0 && translatedDocs().length === 0) {
                  <p class="text-sm text-slate-400">{{ t('orderDetail.noDocuments') }}</p>
                }
              </div>

              <!-- Certificate -->
              @if (certificate() && certificate().certificateCode) {
                <div class="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5">
                  <div class="flex items-center gap-3 mb-4">
                    <svg class="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                    </svg>
                    <div>
                      <h3 class="text-base font-bold text-green-800">{{ t('orderDetail.certificateTitle') }}</h3>
                      <p class="text-xs text-green-600">{{ t('orderDetail.certificateDesc') }}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-3 bg-white rounded-xl p-3.5 border border-green-100">
                    <span class="text-xl font-mono font-bold text-green-700 tracking-wider">{{ certificate().certificateCode }}</span>
                    <button (click)="copyCertificateCode()" class="p-2 hover:bg-green-50 rounded-lg transition-colors cursor-pointer" [title]="t('common.copy')">
                      <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                      </svg>
                    </button>
                  </div>
                  <a routerLink="/verify" class="inline-flex items-center gap-2 mt-3 text-sm text-green-700 hover:text-green-900 font-medium">
                    {{ t('orderDetail.verifyCertificate') }}
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                  </a>
                </div>
              }

              <!-- History -->
              <div class="anim anim-2 rounded-2xl border border-slate-200 bg-white p-5">
                <h2 class="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <svg class="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {{ t('order.history') }}
                </h2>
                @if (history().length === 0) {
                  <p class="text-sm text-slate-400">{{ t('common.noData') }}</p>
                } @else {
                  <div class="space-y-3">
                    @for (h of history(); track h.changedAt) {
                      <div class="flex gap-3">
                        <div class="flex flex-col items-center">
                          <div class="w-2 h-2 rounded-full bg-slate-300 mt-1.5"></div>
                          <div class="w-0.5 flex-1 bg-slate-200"></div>
                        </div>
                        <div class="pb-4">
                          <div class="flex items-center gap-2">
                            <p class="text-sm text-slate-700">
                              @if (h.fromStatus) { <span class="font-medium">{{ t('status.' + camelCase(h.fromStatus)) }}</span> → }
                              <span class="font-bold">{{ t('status.' + camelCase(h.toStatus)) }}</span>
                            </p>
                            <span class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold" [class]="getRoleBadge(h.changedByRole)">{{ t('history.' + (h.changedByRole || 'SYSTEM')) }}</span>
                          </div>
                          @if (h.reason) { <p class="text-xs text-slate-500 mt-0.5">{{ h.reason }}</p> }
                          <p class="text-xs text-slate-400 mt-0.5">{{ formatDateTime(h.changedAt) }}</p>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>

            <!-- RIGHT: Price + Actions -->
            <div class="space-y-6">
              <!-- Price & summary card -->
              <div class="anim rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div class="bg-gradient-to-br from-indigo-600 to-purple-700 p-5 text-white">
                  <p class="text-xs font-medium text-indigo-200 mb-0.5">{{ t('order.totalPrice') }}</p>
                  <p class="text-3xl font-black">{{ order()!.totalPrice | number }} {{ t('common.currency') }}</p>
                </div>
                <div class="p-5 space-y-2.5 text-sm">
                  <div class="flex justify-between items-center">
                    <span class="text-slate-500">{{ t('common.status') }}</span>
                    <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" [class]="getStatusBadge(mapStatus())">{{ t('status.' + camelCase(mapStatus())) }}</span>
                  </div>
                  <div class="flex justify-between"><span class="text-slate-500">{{ t('order.languagePair') }}</span><span class="font-semibold text-slate-800"><bdi dir="ltr">{{ order()!.sourceLanguage | translateLang }} → {{ order()!.targetLanguage | translateLang }}</bdi></span></div>
                  <div class="flex justify-between"><span class="text-slate-500">{{ t('order.pageCount') }}</span><span class="font-semibold text-slate-800">{{ order()!.pageCount }}</span></div>
                  @if (order()!.documentCount) { <div class="flex justify-between"><span class="text-slate-500">{{ t('orderDetail.documents') }}</span><span class="font-semibold text-slate-800">{{ order()!.documentCount }}</span></div> }
                  <div class="flex justify-between"><span class="text-slate-500">{{ t('order.tier') }}</span><span class="font-semibold text-slate-800">{{ order()!.tier === 'OFFICIAL' ? t('order.official') : t('order.standard') }}</span></div>
                  <div class="flex justify-between"><span class="text-slate-500">{{ t('order.urgency') }}</span><span class="font-semibold" [class]="order()!.urgency === 'EXPRESS' ? 'text-red-600' : 'text-slate-800'">{{ order()!.urgency === 'EXPRESS' ? t('order.express') : t('order.normal') }}</span></div>
                  <div class="flex justify-between"><span class="text-slate-500">{{ t('order.deliveryType') }}</span><span class="font-semibold text-slate-800">{{ t('delivery.' + order()!.deliveryType.toLowerCase()) }}</span></div>
                  @if (order()!.estimatedDeliveryDate) { <div class="flex justify-between"><span class="text-slate-500">{{ t('order.deadline') }}</span><span class="font-semibold text-slate-800">{{ order()!.estimatedDeliveryDate }}</span></div> }
                  <div class="flex justify-between"><span class="text-slate-500">{{ t('orderDetail.createdOn') }}</span><span class="font-semibold text-slate-800">{{ formatDate(order()!.createdAt) }}</span></div>
                </div>
              </div>

              <!-- Delivery tracking (PENDING_DELIVERY) -->
              @if (order()!.status === 'PENDING_DELIVERY' && delivery()) {
                <div class="anim rounded-2xl border-2 border-amber-200 bg-amber-50 p-5 mb-6">
                  <div class="flex items-center gap-2 mb-3">
                    <svg class="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>
                    <h3 class="text-sm font-bold text-amber-900">{{ t('delivery.tracking') }}</h3>
                  </div>
                  <div class="space-y-2 text-sm">
                    <div class="flex justify-between"><span class="text-amber-700">{{ t('delivery.status') }}</span><span class="font-semibold text-amber-900">{{ t('status.pendingDelivery') }}</span></div>
                    @if (delivery()!.trackingNumber) {
                      <div class="flex justify-between"><span class="text-amber-700">{{ t('delivery.trackingNumber') }}</span><span class="font-mono font-bold text-amber-900">{{ delivery()!.trackingNumber }}</span></div>
                    }
                    @if (delivery()!.courierName) {
                      <div class="flex justify-between"><span class="text-amber-700">{{ t('delivery.carrier') }}</span><span class="font-semibold text-amber-900">{{ delivery()!.courierName }}</span></div>
                    }
                  </div>
                  <button (click)="showReceiptDialog.set(true)"
                    class="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition-all cursor-pointer">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {{ t('delivery.confirmReceipt') }}
                  </button>
                </div>
              }

              <div class="anim anim-1 rounded-2xl border border-slate-200 bg-white p-5">
                <h3 class="text-sm font-bold text-slate-900 mb-3">{{ t('common.actions') }}</h3>
                <div class="space-y-2">
                  <!-- Support ticket -->
                  @if (hasOpenTicket()) {
                    <a [routerLink]="['/client/support']" [queryParams]="{ticket: existingTicketId()}" class="flex items-center gap-2.5 w-full px-4 py-2.5 rounded-xl border border-orange-200 bg-orange-50 text-sm font-semibold text-orange-700 hover:bg-orange-100 transition-all cursor-pointer">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" /></svg>
                      {{ t('orderDetail.viewTicket') }}
                    </a>
                    <button (click)="openReportDialog()" class="flex items-center gap-2.5 w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer">
                      <svg class="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                      {{ t('orderDetail.addMessage') }}
                    </button>
                  } @else if (isActive()) {
                    <button (click)="openReportDialog()" class="flex items-center gap-2.5 w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer">
                      <svg class="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                      {{ t('orderDetail.reportProblem') }}
                    </button>
                  }

                  <!-- Review request (post-delivery, once) -->
                  @if (order()!.status === 'DELIVERED' && !hasOpenTicket()) {
                    <button (click)="showReviewModal.set(true)" class="flex items-center gap-2.5 w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer">
                      <svg class="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>
                      {{ t('orderDetail.requestReview') }}
                    </button>
                  }

                  <!-- Erase data -->
                  @if (canEraseDocuments()) {
                    <button (click)="showEraseDialog.set(true)" class="flex items-center gap-2.5 w-full px-4 py-2.5 rounded-xl border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50 transition-all cursor-pointer">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                      {{ t('orderDetail.eraseDocuments') }}
                    </button>
                  }
                </div>
              </div>

              <!-- Rating card (DELIVERED only) -->
              @if (order()!.status === 'DELIVERED') {
                <div class="anim anim-2 rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 class="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <svg class="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    {{ t('rating.title') }}
                  </h3>
                  @if (existingRating()) {
                    <p class="text-xs text-emerald-600 font-semibold mb-2">{{ t('rating.alreadyRated') }}</p>
                    <div class="flex gap-1 mb-2">
                      @for (s of [1,2,3,4,5]; track s) {
                        <svg class="w-6 h-6" [class]="s <= existingRating()!.rating ? 'text-yellow-400' : 'text-slate-200'" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      }
                    </div>
                    @if (existingRating()!.comment) {
                      <p class="text-sm text-slate-600 italic">{{ existingRating()!.comment }}</p>
                    }
                  } @else {
                    <p class="text-xs text-slate-500 mb-3">{{ t('rating.subtitle') }}</p>
                    <div class="flex gap-1 mb-3">
                      @for (s of [1,2,3,4,5]; track s) {
                        <button (click)="selectedRating.set(s)" class="cursor-pointer transition-transform hover:scale-110">
                          <svg class="w-8 h-8" [class]="s <= selectedRating() ? 'text-yellow-400' : 'text-slate-200'" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                        </button>
                      }
                    </div>
                    <textarea [(ngModel)]="ratingComment" rows="2" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-yellow-400 resize-none mb-3" [placeholder]="t('rating.commentPlaceholder')"></textarea>
                    <button (click)="submitRating()" [disabled]="selectedRating() === 0 || ratingSubmitting()"
                      class="w-full px-4 py-2.5 rounded-xl bg-yellow-500 text-sm font-bold text-white hover:bg-yellow-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all">
                      {{ t('rating.submit') }}
                    </button>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- Erase confirmation -->
        <app-confirm-dialog [isOpen]="showEraseDialog()" [title]="t('orderDetail.eraseTitle')" [message]="t('orderDetail.eraseMessage')"
          confirmText="orderDetail.eraseConfirm" cancelText="common.cancel" variant="danger" [requireCheckbox]="true"
          [checkboxLabel]="t('orderDetail.eraseCheckbox')" (confirmed)="eraseDocuments()" (cancelled)="showEraseDialog.set(false)" />

        <!-- Confirm receipt dialog -->
        <app-confirm-dialog [isOpen]="showReceiptDialog()" [title]="t('delivery.confirmReceiptTitle')" [message]="t('delivery.confirmReceiptMessage')"
          confirmText="delivery.confirmReceipt" cancelText="common.cancel" variant="info"
          (confirmed)="confirmReceipt()" (cancelled)="showReceiptDialog.set(false)" />

        <!-- Report modal -->
        <app-modal [isOpen]="showReportModal()" [title]="hasOpenTicket() ? 'orderDetail.addMessage' : 'orderDetail.reportProblem'" size="md" (closed)="showReportModal.set(false)">
          <div class="mb-4">
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{{ t('clientOrders.reportSubject') }}</label>
            <input type="text" [(ngModel)]="reportSubject" [readonly]="hasOpenTicket()" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500" [class.bg-slate-100]="hasOpenTicket()" [class.text-slate-500]="hasOpenTicket()" [class.cursor-not-allowed]="hasOpenTicket()" />
          </div>
          <div class="mb-4">
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{{ t('clientOrders.reportDescription') }}</label>
            <textarea [(ngModel)]="reportMessage" rows="4" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 resize-none" [placeholder]="t('clientOrders.reportDescPlaceholder')"></textarea>
          </div>
          <div modal-footer class="flex justify-end gap-3">
            <button (click)="showReportModal.set(false)" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">{{ t('common.cancel') }}</button>
            <button (click)="submitReport()" [disabled]="!reportMessage.trim() || !reportSubject.trim()" class="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">{{ t('orderDetail.submitReport') }}</button>
          </div>
        </app-modal>

        <!-- Review request modal -->
        <app-modal [isOpen]="showReviewModal()" title="orderDetail.requestReview" size="md" (closed)="showReviewModal.set(false)">
          <p class="text-sm text-slate-600 mb-4">{{ t('orderDetail.reviewDesc') }}</p>
          <div class="mb-4">
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{{ t('orderDetail.reviewReason') }}</label>
            <textarea [(ngModel)]="reviewReason" rows="4" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 resize-none" [placeholder]="t('orderDetail.reviewReasonPlaceholder')"></textarea>
          </div>
          <div modal-footer class="flex justify-end gap-3">
            <button (click)="showReviewModal.set(false)" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">{{ t('common.cancel') }}</button>
            <button (click)="submitReviewRequest()" [disabled]="!reviewReason.trim()" class="rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">{{ t('orderDetail.submitReview') }}</button>
          </div>
        </app-modal>

      </div>
    </app-main-layout>
  `,
})
export class OrderDetailComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  loading = signal(true);
  order = signal<OrderData | null>(null);
  history = signal<HistoryEntry[]>([]);
  documents = signal<DocInfo[]>([]);
  sourceDocs = signal<DocInfo[]>([]);
  translatedDocs = signal<DocInfo[]>([]);
  hasOpenTicket = signal(false);
  existingTicketId = signal<string | null>(null);
  delivery = signal<any>(null);
  certificate = signal<any>(null);
  dlvAddress = '';
  dlvCity = '';
  dlvPostalCode = '';
  dlvWilaya = '';
  dlvPhone = '';
  progressSteps = STATUS_STEPS;

  showEraseDialog = signal(false);
  showReceiptDialog = signal(false);
  showReportModal = signal(false);
  showReviewModal = signal(false);
  reportSubject = '';
  reportMessage = '';
  reviewReason = '';
  existingRating = signal<{ rating: number; comment: string | null } | null>(null);
  selectedRating = signal(0);
  ratingComment = '';
  ratingSubmitting = signal(false);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.api.get<OrderData>('/api/v1/client/orders/' + id).subscribe({
      next: (res) => {
        if (res.data) {
          this.order.set(res.data);
          this.dlvAddress = res.data.deliveryAddress || '';
          this.dlvCity = res.data.deliveryCity || '';
          this.dlvPostalCode = res.data.deliveryPostalCode || '';
          this.dlvWilaya = res.data.deliveryWilaya || '';
          this.dlvPhone = res.data.deliveryPhone || '';
          this.loadCertificate(res.data.id, res.data.status);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.api.get<HistoryEntry[]>('/api/v1/client/orders/' + id + '/history').subscribe({
      next: (res) => { if (res.data) this.history.set(res.data); },
    });
    this.api.get<DocInfo[]>('/api/v1/client/orders/' + id + '/documents').subscribe({
      next: (res) => {
        const docs = res.data ?? [];
        this.documents.set(docs);
        this.sourceDocs.set(docs.filter(d => d.type === 'SOURCE'));
        this.translatedDocs.set(docs.filter(d => d.type === 'TRANSLATED'));
      },
    });
    this.api.get<any>('/api/v1/client/orders/' + id + '/ticket').subscribe({
      next: (res) => { if (res.data) { this.hasOpenTicket.set(true); this.existingTicketId.set(res.data.id); } },
    });
    this.api.get<any>('/api/v1/client/orders/' + id + '/delivery').subscribe({
      next: (res) => { if (res.data) this.delivery.set(res.data); },
    });
    this.api.get<any>('/api/v1/client/orders/' + id + '/rating').subscribe({
      next: (res) => { if (res.data) this.existingRating.set(res.data); },
    });
  }

  private loadCertificate(id: string, status: string) {
    if (['APPROVED', 'PENDING_DELIVERY', 'DELIVERED'].includes(status)) {
      this.api.get<any>(`/api/v1/client/orders/${id}/certificate`).subscribe({
        next: (res) => this.certificate.set(res.data),
        error: () => {},
      });
    }
  }

  isActive(): boolean { return ACTIVE_STATUSES.includes(this.order()?.status || ''); }

  canViewDocuments(): boolean {
    // Client can always see documents
    return true;
  }

  canEraseDocuments(): boolean {
    // Client can only delete source docs before payment is confirmed
    const s = this.order()?.status;
    return s === 'PENDING_PAYMENT' && this.documents().length > 0;
  }

  mapStatus(): string {
    const s = this.order()?.status || '';
    // Hide internal review statuses from client — show as "in progress"
    if (INTERNAL_STATUSES.includes(s)) return 'IN_PROGRESS';
    if (s === 'APPROVED' && this.order()?.deliveryType !== 'PHYSICAL') return 'DELIVERED';
    if (s === 'APPROVED' || s === 'PENDING_DELIVERY') return 'PENDING_DELIVERY';
    return s;
  }

  isStepDone(step: string): boolean {
    const idx = STATUS_STEPS.indexOf(step);
    const currentIdx = STATUS_STEPS.indexOf(this.mapStatus());
    return currentIdx > idx;
  }

  isStepCurrent(step: string): boolean { return step === this.mapStatus(); }

  getProgressClass(step: string): string {
    if (this.isStepDone(step)) return 'bg-emerald-500 text-white';
    if (this.isStepCurrent(step)) return 'bg-blue-500 text-white';
    return 'bg-slate-200 text-slate-400';
  }

  eraseDocuments() {
    this.showEraseDialog.set(false);
    const id = this.order()?.id;
    if (!id) return;
    this.api.delete('/api/v1/client/orders/' + id + '/documents').subscribe({
      next: () => { this.documents.set([]); this.toast.success(this.transloco.translate('orderDetail.eraseSuccess')); },
      error: (err: HttpErrorResponse) => this.toast.error(err.error?.message || this.transloco.translate('common.error')),
    });
  }

  openReportDialog() {
    this.reportSubject = 'Signalement: ' + (this.order()?.documentType || '');
    this.reportMessage = '';
    this.showReportModal.set(true);
  }

  submitReport() {
    const id = this.order()?.id;
    if (!id || !this.reportMessage.trim()) return;
    this.api.post<any>('/api/v1/client/tickets', { orderId: id, subject: this.reportSubject, description: this.reportMessage }).subscribe({
      next: (res) => {
        this.showReportModal.set(false);
        this.hasOpenTicket.set(true);
        const ticketId = res.data?.id;
        if (ticketId) this.existingTicketId.set(ticketId);
        this.toast.success(this.transloco.translate('clientOrders.reportSuccess'));
        // If appending to existing ticket, redirect to support chat
        if (this.existingTicketId()) {
          this.router.navigate(['/client/support'], { queryParams: { ticket: this.existingTicketId() } });
        }
      },
      error: (err: HttpErrorResponse) => this.toast.error(err.error?.message || this.transloco.translate('common.error')),
    });
  }

  submitReviewRequest() {
    const id = this.order()?.id;
    if (!id || !this.reviewReason.trim()) return;
    this.api.post('/api/v1/client/orders/' + id + '/review-request', { reason: this.reviewReason }).subscribe({
      next: () => { this.showReviewModal.set(false); this.hasOpenTicket.set(true); this.toast.success(this.transloco.translate('orderDetail.reviewSuccess')); },
      error: (err: HttpErrorResponse) => this.toast.error(err.error?.message || this.transloco.translate('common.error')),
    });
  }

  get orderId(): string { return this.order()?.id || ''; }

  cancelOrder() {
    if (!confirm(this.transloco.translate('orderDetail.confirmCancel'))) return;
    this.api.post(`/api/v1/client/orders/${this.orderId}/cancel`, { reason: 'Cancelled by client' })
      .subscribe({
        next: () => {
          this.toast.success(this.transloco.translate('orderDetail.orderCancelled'));
          this.loadOrder();
        },
        error: (err: any) => this.toast.error(err?.error?.message || this.transloco.translate('common.error'))
      });
  }

  private loadOrder() {
    const id = this.orderId;
    if (!id) return;
    this.api.get<OrderData>('/api/v1/client/orders/' + id).subscribe({
      next: (res) => {
        if (res.data) {
          this.order.set(res.data);
        }
      },
    });
    this.api.get<HistoryEntry[]>('/api/v1/client/orders/' + id + '/history').subscribe({
      next: (res) => { if (res.data) this.history.set(res.data); },
    });
  }

  translateReason(reason: string): string {
    const key = 'historyReason.' + reason.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 60);
    const translated = this.transloco.translate(key);
    return translated !== key ? translated : reason;
  }

  requestDelivery() {
    const id = this.order()?.id;
    if (!id) return;
    this.api.post<any>('/api/v1/client/orders/' + id + '/request-delivery', {
      deliveryAddress: this.dlvAddress, deliveryCity: this.dlvCity,
      deliveryPostalCode: this.dlvPostalCode, deliveryWilaya: this.dlvWilaya, deliveryPhone: this.dlvPhone,
    }).subscribe({
      next: (res) => {
        this.order.update(o => o ? { ...o, status: 'PENDING_DELIVERY' } : o);
        if (res.data) this.delivery.set(res.data);
        this.toast.success(this.transloco.translate('delivery.requested'));
      },
      error: (err: HttpErrorResponse) => this.toast.error(err.error?.message || this.transloco.translate('common.error')),
    });
  }

  confirmReceipt() {
    this.showReceiptDialog.set(false);
    const id = this.order()?.id;
    if (!id) return;
    this.api.patch('/api/v1/client/orders/' + id + '/confirm-receipt').subscribe({
      next: () => {
        this.order.update(o => o ? { ...o, status: 'DELIVERED' } : o);
        this.toast.success(this.transloco.translate('delivery.receiptConfirmed'));
      },
      error: (err: HttpErrorResponse) => this.toast.error(err.error?.message || this.transloco.translate('common.error')),
    });
  }

  submitRating() {
    const id = this.order()?.id;
    if (!id || this.selectedRating() === 0) return;
    this.ratingSubmitting.set(true);
    this.api.post<any>('/api/v1/client/orders/' + id + '/rate', { rating: this.selectedRating(), comment: this.ratingComment || null }).subscribe({
      next: (res) => {
        this.ratingSubmitting.set(false);
        if (res.data) this.existingRating.set(res.data);
        this.toast.success(this.transloco.translate('rating.submitted'));
      },
      error: (err: HttpErrorResponse) => { this.ratingSubmitting.set(false); this.toast.error(err.error?.message || this.transloco.translate('common.error')); },
    });
  }

  copyCertificateCode() {
    navigator.clipboard.writeText(this.certificate()?.certificateCode || '');
    this.toast.success(this.transloco.translate('orderDetail.certificateCopied'));
  }

  goBack() { this.location.back(); }

  getRoleBadge(role: string): string {
    const m: Record<string,string> = { CLIENT: 'bg-blue-100 text-blue-700', TRANSLATOR: 'bg-emerald-100 text-emerald-700', ADMIN: 'bg-purple-100 text-purple-700' };
    return m[role] || 'bg-slate-100 text-slate-600';
  }

  formatDate(d: string): string { if (!d) return ''; try { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return d; } }
  formatDateTime(d: string): string { if (!d) return ''; try { return new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return d; } }
  formatFileSize(b: number): string { if (!b) return ''; if (b < 1024) return b + ' o'; if (b < 1048576) return (b/1024).toFixed(0) + ' Ko'; return (b/1048576).toFixed(1) + ' Mo'; }
  camelCase(s: string): string { return s.toLowerCase().replaceAll(/_([a-z])/g, (_, c) => c.toUpperCase()); }
  getStatusBadge(s: string): string { const m: Record<string,string> = { PENDING_PAYMENT:'bg-amber-50 text-amber-700', PAID:'bg-sky-50 text-sky-700', ASSIGNED:'bg-sky-50 text-sky-700', IN_PROGRESS:'bg-blue-50 text-blue-700', PENDING_REVIEW:'bg-amber-50 text-amber-700', IN_REVIEW:'bg-amber-50 text-amber-700', REVISION_REQUESTED:'bg-red-50 text-red-700', APPROVED:'bg-emerald-50 text-emerald-700', DELIVERED:'bg-emerald-50 text-emerald-700', CANCELLED:'bg-red-50 text-red-700', PENDING_DELIVERY:'bg-purple-50 text-purple-700' }; return m[s]||'bg-slate-50 text-slate-700'; }
}
