import { Component, inject, signal, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MainLayoutComponent } from '../../../shared/layouts/main-layout/main-layout.component';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { TranslateLangPipe } from '../../../shared/pipes/translate-lang.pipe';
import { AnalyticsService } from '../../../core/services/analytics.service';

interface CascadeTarget { name: string; countryCode: string; }
interface CascadeLanguage { name: string; countryCode: string; targets: CascadeTarget[]; }
interface CascadeResponse { languages: CascadeLanguage[]; }

const LANG_ORDER: Record<string, number> = { 'Arabe': 0, 'Francais': 1, 'Anglais': 2, 'Espagnol': 3, 'Allemand': 4, 'Italien': 5, 'Turc': 6, 'Portugais': 7, 'Chinois': 8, 'Russe': 9 };
function sortLangs<T extends { name: string }>(langs: T[]): T[] { return [...langs].sort((a, b) => (LANG_ORDER[a.name] ?? 99) - (LANG_ORDER[b.name] ?? 99)); }
interface QuoteData { basePrice: number; urgencyFee: number; deliveryFee: number; totalPrice: number; pricePerPage: number; }

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

const DOCUMENT_CATEGORIES = [
  { key: 'civil', types: ['birth_certificate', 'marriage_certificate', 'death_certificate', 'family_book', 'nationality_certificate', 'residence_certificate'] },
  { key: 'education', types: ['diploma', 'transcript', 'school_certificate', 'equivalence'] },
  { key: 'legal', types: ['criminal_record', 'court_judgment', 'power_of_attorney', 'contract', 'affidavit'] },
  { key: 'identity', types: ['passport', 'id_card', 'driver_license', 'visa'] },
  { key: 'medical', types: ['medical_certificate', 'vaccination_record', 'medical_report'] },
  { key: 'business', types: ['commercial_register', 'tax_certificate', 'invoice', 'company_statutes'] },
  { key: 'other', types: ['other'] }
];

const WILAYAS = [
  'Adrar','Chlef','Laghouat','Oum El Bouaghi','Batna','Bejaia','Biskra','Bechar','Blida','Bouira',
  'Tamanrasset','Tebessa','Tlemcen','Tiaret','Tizi Ouzou','Alger','Djelfa','Jijel','Setif','Saida',
  'Skikda','Sidi Bel Abbes','Annaba','Guelma','Constantine','Medea','Mostaganem',"M'Sila",'Mascara',
  'Ouargla','Oran','El Bayadh','Illizi','Bordj Bou Arreridj','Boumerdes','El Tarf','Tindouf',
  'Tissemsilt','El Oued','Khenchela','Souk Ahras','Tipaza','Mila','Ain Defla','Naama',
  'Ain Temouchent','Ghardaia','Relizane'
];

@Component({
  selector: 'app-new-order',
  standalone: true,
  imports: [MainLayoutComponent, TranslocoModule, FormsModule, DecimalPipe, ConfirmDialogComponent, TranslateLangPipe],
  styles: [`
    @keyframes fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    .anim { animation: fade-up 0.4s ease-out both; }
    .step-active { background: linear-gradient(135deg, #3b82f6, #6366f1); color: white; }
    .step-done { background: #10b981; color: white; }
    .step-pending { background: #e2e8f0; color: #94a3b8; }
    .opt { transition: all 0.2s ease; cursor: pointer; }
    .opt:hover { transform: translateY(-2px); box-shadow: 0 8px 20px -4px rgba(0,0,0,0.08); }
    .sel { border-color: #6366f1 !important; background-color: #eef2ff !important; }
  `],
  template: `
    <app-main-layout>
      <div *transloco="let t" class="max-w-5xl mx-auto">

        <div class="anim mb-6">
          <h1 class="text-2xl sm:text-3xl font-bold text-slate-900">{{ t('newOrder.title') }}</h1>
          <p class="mt-1 text-sm text-slate-500">{{ t('newOrder.subtitle') }}</p>
        </div>

        <!-- Stepper -->
        <div class="anim flex items-center gap-2 mb-8">
          @for (step of steps; track step; let i = $index) {
            <div class="flex items-center gap-1.5">
              <div class="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold" [class]="i < currentStep() ? 'step-done' : i === currentStep() ? 'step-active' : 'step-pending'">
                @if (i < currentStep()) { <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg> } @else { {{ i + 1 }} }
              </div>
              <span class="text-xs font-medium hidden sm:block" [class]="i <= currentStep() ? 'text-slate-700' : 'text-slate-400'">{{ t(step) }}</span>
            </div>
            @if (i < steps.length - 1) { <div class="flex-1 h-0.5 rounded" [class]="i < currentStep() ? 'bg-emerald-400' : 'bg-slate-200'"></div> }
          }
        </div>

        <!-- Main layout: content + sidebar cart -->
        <div class="flex flex-col lg:flex-row gap-6">

          <!-- LEFT: Steps content -->
          <div class="flex-1 min-w-0">

            <!-- STEP 0 -->
            @if (currentStep() === 0) {
              <div class="anim space-y-5">
                <div class="rounded-2xl border border-slate-200 bg-white p-5">
                  <label class="block text-sm font-bold text-slate-900 mb-3">{{ t('newOrder.documentTypes') }}</label>
                  @if (selectedDocTypes.length > 0) {
                    <div class="flex flex-wrap gap-2 mb-3">
                      @for (dt of selectedDocTypes; track dt) {
                        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                          {{ t('docTypes.' + dt) }}
                          <button (click)="removeDocType(dt)" type="button" class="hover:text-blue-900 cursor-pointer">
                            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                          </button>
                        </span>
                      }
                    </div>
                  }
                  <button (click)="showDocTypeDropdown = !showDocTypeDropdown" type="button" data-doc-toggle
                    class="w-full flex items-center justify-between px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-500 hover:border-blue-300 transition-all cursor-pointer">
                    <span>{{ selectedDocTypes.length === 0 ? t('newOrder.selectDocTypes') : t('newOrder.addMore') }}</span>
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
                  </button>
                  @if (showDocTypeDropdown) {
                    <div class="relative z-[56]">
                      <div data-doc-dropdown class="mt-2 rounded-xl border border-slate-200 bg-white shadow-lg max-h-64 overflow-y-auto">
                        @for (cat of documentCategories; track cat.key) {
                          <div class="px-3 py-2">
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{{ t('docCategories.' + cat.key) }}</p>
                            @for (type of cat.types; track type) {
                              <button (click)="toggleDocType(type)" type="button"
                                class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left hover:bg-slate-50 transition-all cursor-pointer"
                                [class.bg-blue-50]="selectedDocTypes.includes(type)"
                                [class.text-blue-700]="selectedDocTypes.includes(type)"
                                [class.font-semibold]="selectedDocTypes.includes(type)">
                                @if (selectedDocTypes.includes(type)) {
                                  <svg class="w-4 h-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                } @else {
                                  <div class="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0"></div>
                                }
                                {{ t('docTypes.' + type) }}
                              </button>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
                <div class="rounded-2xl border border-slate-200 bg-white p-5">
                  <label class="block text-sm font-bold text-slate-900 mb-3">{{ t('newOrder.languagePair') }}</label>
                  @if (cascadeLanguages().length === 0) {
                    <div class="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">{{ t('newOrder.noPairsAvailable') }}</div>
                  } @else if (sourceLanguage && targetLanguage) {
                    <!-- Selected pair display -->
                    <div dir="ltr" class="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <div class="flex items-center gap-2">
                        <img [src]="'https://flagcdn.com/w40/' + selectedSourceCountryCode() + '.png'" class="w-6 h-4 rounded-sm object-cover" [alt]="sourceLanguage" />
                        <span class="text-sm font-semibold text-slate-800">{{ sourceLanguage | translateLang }}</span>
                      </div>
                      <svg class="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                      <div class="flex items-center gap-2">
                        <img [src]="'https://flagcdn.com/w40/' + selectedTargetCountryCode() + '.png'" class="w-6 h-4 rounded-sm object-cover" [alt]="targetLanguage" />
                        <span class="text-sm font-semibold text-slate-800">{{ targetLanguage | translateLang }}</span>
                      </div>
                      <button (click)="resetPairSelection()" class="ml-auto text-xs font-medium text-blue-600 hover:text-blue-700">{{ t('newOrder.changePair') }}</button>
                    </div>
                  } @else if (!selectedSource()) {
                    <!-- Step 1: Select source language -->
                    <p class="text-xs text-slate-500 mb-2">{{ t('newOrder.selectSource') }}</p>
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      @for (lang of cascadeLanguages(); track lang.name) {
                        <button (click)="selectSource(lang)" class="opt flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3 text-start hover:border-blue-300">
                          <img [src]="'https://flagcdn.com/w40/' + lang.countryCode + '.png'" class="w-6 h-4 rounded-sm object-cover" [alt]="lang.name" />
                          <span class="text-sm font-semibold text-slate-800">{{ lang.name | translateLang }}</span>
                        </button>
                      }
                    </div>
                  } @else {
                    <!-- Step 2: Select target language -->
                    <div class="flex items-center gap-2 mb-3">
                      <img [src]="'https://flagcdn.com/w40/' + selectedSource()!.countryCode + '.png'" class="w-6 h-4 rounded-sm object-cover" [alt]="selectedSource()!.name" />
                      <span class="text-sm font-semibold text-slate-800">{{ selectedSource()!.name | translateLang }}</span>
                      <button (click)="selectedSource.set(null); sourceLanguage = ''; targetLanguage = ''" class="ml-1 text-xs text-slate-400 hover:text-red-500">&times;</button>
                    </div>
                    <p class="text-xs text-slate-500 mb-2">{{ t('newOrder.selectTarget') }}</p>
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      @for (lang of selectedSource()!.targets; track lang.name) {
                        <button (click)="selectTarget(lang)" class="opt flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3 text-start hover:border-blue-300">
                          <img [src]="'https://flagcdn.com/w40/' + lang.countryCode + '.png'" class="w-6 h-4 rounded-sm object-cover" [alt]="lang.name" />
                          <span class="text-sm font-semibold text-slate-800">{{ lang.name | translateLang }}</span>
                        </button>
                      }
                    </div>
                  }
                </div>
                <div class="rounded-2xl border border-slate-200 bg-white p-5">
                  <label class="block text-sm font-bold text-slate-900 mb-2">{{ t('newOrder.notesForTranslator') }}</label>
                  <textarea [(ngModel)]="clientNotes" rows="2" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none" [placeholder]="t('newOrder.notesPlaceholder')"></textarea>
                  <p class="mt-1 text-xs text-slate-400">{{ t('newOrder.notesHint') }}</p>
                </div>

                <!-- File Upload (merged from step 2) -->
                <div class="rounded-2xl border border-slate-200 bg-white p-5">
                  <label class="block text-sm font-bold text-slate-900 mb-3">{{ t('newOrder.uploadDocuments') }}</label>
                  <label class="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all">
                    <svg class="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                    <p class="text-sm text-slate-600 font-medium">{{ t('newOrder.dropFiles') }}</p>
                    <p class="text-xs text-slate-400">PDF — {{ t('newOrder.maxSize') }}</p>
                    <input type="file" class="hidden" multiple accept=".pdf" (change)="onFilesSelected($event)" />
                  </label>
                  @if (fileError()) {
                    <div class="mt-3 rounded-xl bg-red-50 border border-red-200 p-3 flex items-center gap-2">
                      <svg class="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                      <p class="text-sm text-red-700">{{ fileError() }}</p>
                    </div>
                  }
                  @if (selectedFiles().length > 0) {
                    <div class="mt-3 space-y-2">
                      @for (file of selectedFiles(); track file.name; let i = $index) {
                        <div class="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50">
                          @if (filePreviews()[i]) { <img [src]="filePreviews()[i]" class="w-9 h-9 rounded-lg object-cover shrink-0 border border-slate-200" /> }
                          @else { <div class="flex w-9 h-9 shrink-0 items-center justify-center rounded-lg bg-slate-200"><svg class="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg></div> }
                          <div class="flex-1 min-w-0"><p class="text-sm font-medium text-slate-800 truncate">{{ file.name }}</p><p class="text-xs text-slate-400">{{ formatFileSize(file.size) }}</p></div>
                          <button (click)="removeFile(i)" class="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                      }
                    </div>
                    <!-- Page count result / analyzing spinner -->
                    @if (analyzing()) {
                      <div class="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-sm text-blue-700">
                        <svg class="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                        {{ t('newOrder.analyzingDocs') }}
                      </div>
                    } @else if (pageCount > 0) {
                      <div class="mt-3 flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
                        <div class="flex items-center gap-2">
                          <svg class="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
                          <span class="text-sm text-slate-600">{{ t('newOrder.detectedPages') }}</span>
                        </div>
                        <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
                          {{ pageCount }} {{ t('order.pages') }}
                        </span>
                      </div>
                    }
                  }
                </div>
                <div class="rounded-2xl border border-slate-200 bg-white p-5">
                  <label class="flex items-start gap-3 cursor-pointer select-none">
                    <input type="checkbox" [(ngModel)]="declarationAccepted" class="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    <span class="text-sm text-slate-700 leading-relaxed">{{ t('order.declaration') }}</span>
                  </label>
                </div>
              </div>
            }

            <!-- STEP 1: Options -->
            @if (currentStep() === 1) {
              <div class="anim space-y-5">
                <!-- Translation Type -->
                <div class="rounded-2xl border border-slate-200 bg-white p-5">
                  <label class="block text-sm font-bold text-slate-900 mb-3">{{ t('estimator.tierLabel') }}</label>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button (click)="tier = 'OFFICIAL'; recalcQuote()" class="opt rounded-xl border border-slate-200 bg-white p-4 text-start" [class.sel]="tier === 'OFFICIAL'">
                      <div class="flex items-center gap-2 mb-1">
                        <svg class="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" /></svg>
                        <p class="text-sm font-bold text-slate-900">{{ t('estimator.tierOfficial') }}</p>
                      </div>
                      <p class="text-xs text-slate-500 mt-1">{{ t('newOrder.officialDesc') }}</p>
                    </button>
                    <button (click)="tier = 'STANDARD'; recalcQuote()" class="opt rounded-xl border border-slate-200 bg-white p-4 text-start" [class.sel]="tier === 'STANDARD'">
                      <div class="flex items-center gap-2 mb-1">
                        <svg class="w-5 h-5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                        <p class="text-sm font-bold text-slate-900">{{ t('estimator.tierStandard') }}</p>
                      </div>
                      <p class="text-xs text-slate-500 mt-1">{{ t('newOrder.standardDesc') }}</p>
                    </button>
                  </div>
                </div>

                <!-- Urgency -->
                <div class="rounded-2xl border border-slate-200 bg-white p-5">
                  <label class="block text-sm font-bold text-slate-900 mb-3">{{ t('order.urgency') }}</label>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button (click)="urgency = 'NORMAL'; recalcQuote()" class="opt rounded-xl border border-slate-200 bg-white p-4 text-start" [class.sel]="urgency === 'NORMAL'">
                      <p class="text-sm font-bold text-slate-900">{{ t('order.normal') }}</p><p class="text-xs text-slate-500 mt-1">{{ t('newOrder.normalDelay') }}</p>
                    </button>
                    <button (click)="urgency = 'EXPRESS'; recalcQuote()" class="opt rounded-xl border border-slate-200 bg-white p-4 text-start" [class.sel]="urgency === 'EXPRESS'">
                      <p class="text-sm font-bold text-slate-900">{{ t('order.express') }}</p><p class="text-xs text-slate-500 mt-1">{{ t('newOrder.expressDelay') }}</p>
                      <span class="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 mt-2">+50%</span>
                    </button>
                  </div>
                </div>

                <!-- Delivery Type -->
                <div class="rounded-2xl border border-slate-200 bg-white p-5">
                  <label class="block text-sm font-bold text-slate-900 mb-3">{{ t('estimator.deliveryLabel') }}</label>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button (click)="deliveryType = 'DIGITAL'; recalcQuote()" class="opt rounded-xl border border-slate-200 bg-white p-4 text-start" [class.sel]="deliveryType === 'DIGITAL'">
                      <div class="flex items-center gap-2 mb-1">
                        <svg class="w-5 h-5 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                        <p class="text-sm font-bold text-slate-900">{{ t('estimator.deliveryDigitalTitle') }}</p>
                      </div>
                      <p class="text-xs text-slate-500 mt-1">{{ t('estimator.deliveryDigitalDesc') }}</p>
                      <span class="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 mt-2">{{ t('estimator.included') }}</span>
                    </button>
                    <button (click)="deliveryType = 'PHYSICAL'; recalcQuote()" class="opt rounded-xl border border-slate-200 bg-white p-4 text-start" [class.sel]="deliveryType === 'PHYSICAL'">
                      <div class="flex items-center gap-2 mb-1">
                        <svg class="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.136-.504 1.125-1.125v-2.5c0-.621-.504-1.125-1.125-1.125H18.75m-7.5 0v-4.875c0-.621.504-1.125 1.125-1.125h3.5c.442 0 .84.258 1.023.653l1.477 3.222a1.125 1.125 0 01.097.462v1.663m-7.5 0h7.5m-7.5 0l-1 0m0 0l-3 0" /></svg>
                        <p class="text-sm font-bold text-slate-900">{{ t('estimator.deliveryPhysicalTitle') }}</p>
                      </div>
                      <p class="text-xs text-slate-500 mt-1">{{ t('estimator.deliveryPhysicalDesc') }}</p>
                      <span class="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 mt-2">+500 {{ t('common.currency') }}</span>
                    </button>
                  </div>
                </div>

                <!-- Physical address form -->
                @if (deliveryType === 'PHYSICAL') {
                  <div class="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                    <label class="block text-sm font-bold text-slate-900 mb-1">{{ t('newOrder.deliveryAddress') }}</label>
                    <input type="text" [(ngModel)]="deliveryAddress" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" [placeholder]="t('newOrder.addressStreet')" />
                    <div class="grid grid-cols-2 gap-3">
                      <input type="text" [(ngModel)]="deliveryCity" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" [placeholder]="t('newOrder.addressCity')" />
                      <input type="text" [(ngModel)]="deliveryPostalCode" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" [placeholder]="t('newOrder.addressPostal')" />
                    </div>
                    <select [(ngModel)]="deliveryWilaya" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                      <option value="">{{ t('newOrder.addressWilaya') }}</option>
                      @for (w of wilayas; track w) { <option [value]="w">{{ w }}</option> }
                    </select>
                    <input type="tel" [(ngModel)]="deliveryPhone" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" [placeholder]="t('newOrder.addressPhone')" />
                    <label class="flex items-start gap-3 cursor-pointer select-none mt-2">
                      <input type="checkbox" [(ngModel)]="addressConfirmed" class="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <span class="text-xs text-slate-600">{{ t('newOrder.confirmAddress') }}</span>
                    </label>
                  </div>
                }
              </div>
            }

            <!-- STEP 2: Review -->
            @if (currentStep() === 2) {
              <div class="anim space-y-5">
                <div class="rounded-2xl border border-slate-200 bg-white p-5">
                  <h2 class="text-base font-bold text-slate-900 mb-4">{{ t('newOrder.reviewTitle') }}</h2>
                  <div class="space-y-2.5 text-sm">
                    <div class="flex justify-between py-1.5 border-b border-slate-100"><span class="text-slate-500">{{ t('order.documentType') }}</span><span class="font-semibold text-slate-900">{{ documentType }}</span></div>
                    <div class="flex justify-between py-1.5 border-b border-slate-100"><span class="text-slate-500">{{ t('order.languages') }}</span><span class="font-semibold text-slate-900"><bdi dir="ltr">{{ sourceLanguage | translateLang }} → {{ targetLanguage | translateLang }}</bdi></span></div>
                    <div class="flex justify-between py-1.5 border-b border-slate-100"><span class="text-slate-500">{{ t('newOrder.documents') }}</span><span class="font-semibold text-slate-900">{{ selectedFiles().length }} {{ t('newOrder.filesCount') }}</span></div>
                    <div class="flex justify-between py-1.5 border-b border-slate-100"><span class="text-slate-500">{{ t('order.pages') }}</span><span class="font-semibold text-slate-900">{{ pageCount }}</span></div>
                    @if (quote()) { <div class="flex justify-between py-1.5 border-b border-slate-100"><span class="text-slate-500">{{ t('newOrder.unitPrice') }}</span><span class="font-semibold text-slate-900">{{ quote()!.pricePerPage | number }} {{ t('common.currencyPerPage') }}</span></div> }
                    <div class="flex justify-between py-1.5 border-b border-slate-100"><span class="text-slate-500">{{ t('estimator.tierLabel') }}</span><span class="font-semibold text-slate-900">{{ tier === 'OFFICIAL' ? t('order.official') : t('order.standard') }}</span></div>
                    <div class="flex justify-between py-1.5 border-b border-slate-100"><span class="text-slate-500">{{ t('order.urgency') }}</span><span class="font-semibold" [class]="urgency === 'EXPRESS' ? 'text-red-600' : 'text-slate-900'">{{ urgency === 'EXPRESS' ? t('order.express') : t('order.normal') }}</span></div>
                    <div class="flex justify-between py-1.5 border-b border-slate-100"><span class="text-slate-500">{{ t('estimator.deliveryLabel') }}</span><span class="font-semibold text-slate-900">{{ deliveryType === 'PHYSICAL' ? t('estimator.deliveryPhysicalTitle') : t('estimator.deliveryDigitalTitle') }}</span></div>
                    @if (deliveryType === 'PHYSICAL') { <div class="py-1.5 border-b border-slate-100"><span class="text-slate-500">{{ t('newOrder.deliveryAddress') }}</span><p class="text-slate-700 mt-1">{{ deliveryAddress }}, {{ deliveryCity }}, {{ deliveryWilaya }} {{ deliveryPostalCode }}</p><p class="text-slate-500 text-xs mt-0.5">{{ deliveryPhone }}</p></div> }
                    @if (clientNotes) { <div class="py-1.5 border-b border-slate-100"><span class="text-slate-500">{{ t('order.notes') }}</span><p class="text-slate-700 mt-1">{{ clientNotes }}</p></div> }
                  </div>
                </div>
                @if (quote()) {
                  <div class="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white">
                    <div class="flex justify-between items-center">
                      <span class="text-sm font-medium text-emerald-200">{{ t('newOrder.totalToPay') }}</span>
                      <span class="text-2xl font-black">{{ quote()!.totalPrice | number }} {{ t('common.currency') }}</span>
                    </div>
                  </div>
                }
              </div>
            }

            <!-- Navigation -->
            <div class="flex items-center justify-between mt-6 mb-8">
              @if (currentStep() > 0) {
                <button (click)="prevStep()" class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                  {{ t('common.back') }}
                </button>
              } @else { <div></div> }
              @if (currentStep() < 2) {
                <button (click)="nextStep()" [disabled]="!canAdvance()" class="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed">
                  {{ t('common.next') }}
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </button>
              } @else {
                <button (click)="showConfirmDialog.set(true)" [disabled]="submitting()" class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                  @if (submitting()) { <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> }
                  {{ submitting() ? t('common.submitting') : t('order.confirmOrder') }}
                </button>
              }
            </div>
          </div>

          <!-- RIGHT: Sticky Cart Panel -->
          <div class="lg:w-72 shrink-0">
            <div class="lg:sticky lg:top-4 space-y-4">

              <!-- Original estimate recap (from landing page) -->
              @if (savedEstimate()) {
                <div class="rounded-2xl border border-slate-200 bg-white p-5 relative" [class.opacity-60]="priceChanged()">
                  <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    {{ t('newOrder.estimateRecap') }}
                  </h3>
                  <div class="space-y-2 text-xs" [class.line-through]="priceChanged()" [class.decoration-red-400]="priceChanged()">
                    @if (savedEstimate().sourceLanguage) {
                      <div class="flex justify-between">
                        <span class="text-slate-500">{{ t('order.languages') }}</span>
                        <span class="font-medium text-slate-800"><bdi dir="ltr">{{ savedEstimate().sourceLanguage | translateLang }} → {{ savedEstimate().targetLanguage | translateLang }}</bdi></span>
                      </div>
                    }
                    @if (savedEstimate().pageCount) {
                      <div class="flex justify-between">
                        <span class="text-slate-500">{{ t('order.pages') }}</span>
                        <span class="font-medium text-slate-800">{{ savedEstimate().pageCount }}</span>
                      </div>
                    }
                    @if (estimatePrice()) {
                      <div class="flex justify-between border-t border-slate-100 pt-2 mt-2">
                        <span class="font-bold text-slate-700">{{ t('estimator.total') }}</span>
                        <span class="font-black text-slate-700">{{ estimatePrice() | number:'1.0-0' }} {{ t('common.currency') }}</span>
                      </div>
                    }
                  </div>

                  @if (priceChanged()) {
                    <div class="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <div class="flex items-start gap-2">
                        <svg class="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
                        <div>
                          <p class="text-xs font-semibold text-amber-800">{{ t('newOrder.priceChangedTitle') }}</p>
                          <p class="text-[11px] text-amber-600 mt-0.5">{{ t('newOrder.priceChangedDesc') }}</p>
                        </div>
                      </div>
                      <div class="mt-2 flex justify-between items-center">
                        <span class="text-xs font-bold text-amber-800">{{ t('newOrder.newPrice') }}</span>
                        <span class="text-lg font-black text-emerald-600">{{ newPrice() | number:'1.0-0' }} {{ t('common.currency') }}</span>
                      </div>
                    </div>
                  }
                </div>
              }

              <!-- Only show sidebar from step 1 (Options) onwards -->
              @if (currentStep() < 1) {
                <div class="rounded-2xl border border-dashed border-slate-300 p-5 text-center">
                  <p class="text-xs text-slate-400">{{ t('newOrder.priceAfterOptions') }}</p>
                </div>
              }

              <!-- Price card (only when we have a quote and on step 1+) -->
              @if (quote() && currentStep() >= 1) {
                <div class="rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 p-5 text-white">
                  <p class="text-xs font-medium text-indigo-200 mb-0.5">{{ t('newOrder.priceEstimate') }}</p>
                  <p class="text-3xl font-black mb-3">{{ quote()!.totalPrice | number }} {{ t('common.currency') }}</p>
                  <div class="space-y-1.5 text-xs text-indigo-200">
                    <div class="flex justify-between"><span>{{ t('newOrder.unitPrice') }}</span><span class="text-white font-medium">{{ quote()!.pricePerPage | number }} {{ t('common.currencyPerPage') }}</span></div>
                    <div class="flex justify-between"><span>{{ t('order.pages') }}</span><span class="text-white font-medium">{{ pageCount }}</span></div>
                    <div class="flex justify-between"><span>{{ t('newOrder.basePrice') }}</span><span class="text-white font-medium">{{ quote()!.basePrice | number }} {{ t('common.currency') }}</span></div>
                    @if (quote()!.urgencyFee > 0) { <div class="flex justify-between"><span>{{ t('newOrder.urgencyFee') }}</span><span class="text-red-300 font-medium">+{{ quote()!.urgencyFee | number }} {{ t('common.currency') }}</span></div> }
                    @if (quote()!.deliveryFee > 0) { <div class="flex justify-between"><span>{{ t('newOrder.deliveryFee') }}</span><span class="text-white font-medium">+{{ quote()!.deliveryFee | number }} {{ t('common.currency') }}</span></div> }
                  </div>
                </div>
              }

              <!-- Order summary (from step 1 onwards) -->
              @if (currentStep() >= 1 && (sourceLanguage || selectedFiles().length > 0)) {
                <div class="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 class="text-sm font-bold text-slate-900 mb-3">{{ t('newOrder.orderSummary') }}</h3>
                  <div class="space-y-2 text-xs">
                    @if (documentType) { <div class="flex justify-between"><span class="text-slate-500">{{ t('order.documentType') }}</span><span class="font-medium text-slate-800 text-end max-w-[120px] truncate">{{ documentType }}</span></div> }
                    @if (sourceLanguage) { <div class="flex justify-between"><span class="text-slate-500">{{ t('order.languages') }}</span><span class="font-medium text-slate-800"><bdi dir="ltr">{{ sourceLanguage | translateLang }} → {{ targetLanguage | translateLang }}</bdi></span></div> }
                    @if (selectedFiles().length > 0) { <div class="flex justify-between"><span class="text-slate-500">{{ t('newOrder.documents') }}</span><span class="font-medium text-slate-800">{{ selectedFiles().length }} {{ t('newOrder.filesCount') }}</span></div> }
                    @if (pageCount > 0) { <div class="flex justify-between"><span class="text-slate-500">{{ t('order.pages') }}</span><span class="font-medium text-slate-800">{{ pageCount }}</span></div> }
                    @if (tier) { <div class="flex justify-between"><span class="text-slate-500">{{ t('order.tier') }}</span><span class="font-medium text-slate-800">{{ tier === 'OFFICIAL' ? t('order.official') : t('order.standard') }}</span></div> }
                    @if (urgency) { <div class="flex justify-between"><span class="text-slate-500">{{ t('order.urgency') }}</span><span class="font-medium" [class]="urgency === 'EXPRESS' ? 'text-red-600' : 'text-slate-800'">{{ urgency === 'EXPRESS' ? 'Express' : 'Normal' }}</span></div> }
                  </div>
                </div>
              }

            </div>
          </div>
        </div>

        <!-- Confirm dialog -->
        <app-confirm-dialog
          [isOpen]="showConfirmDialog()"
          [title]="t('newOrder.confirmTitle')"
          [message]="t('newOrder.confirmMessage', { price: (quote()?.totalPrice || 0) | number })"
          confirmText="order.confirmOrder"
          cancelText="common.cancel"
          variant="info"
          (confirmed)="submitOrder()"
          (cancelled)="showConfirmDialog.set(false)"
        />
      </div>
    </app-main-layout>
  `,
})
export class NewOrderComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly elRef = inject(ElementRef);
  private readonly analytics = inject(AnalyticsService);
  Math = Math;

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent) {
    if (!this.showDocTypeDropdown) return;
    const dropdown = this.elRef.nativeElement.querySelector('[data-doc-dropdown]');
    const toggle = this.elRef.nativeElement.querySelector('[data-doc-toggle]');
    if (dropdown && !dropdown.contains(event.target) && toggle && !toggle.contains(event.target)) {
      this.showDocTypeDropdown = false;
    }
  }

  steps = ['newOrder.step1', 'newOrder.step3', 'newOrder.step4'];
  currentStep = signal(0);
  submitting = signal(false);
  showConfirmDialog = signal(false);
  private orderCompleted = false;

  documentType = '';
  documentCategories = DOCUMENT_CATEGORIES;
  selectedDocTypes: string[] = [];
  showDocTypeDropdown = false;
  sourceLanguage = '';
  targetLanguage = '';
  pageCount = 1;
  documentCount = 1;
  clientNotes = '';
  cascadeLanguages = signal<CascadeLanguage[]>([]);
  selectedSource = signal<CascadeLanguage | null>(null);

  selectedFiles = signal<File[]>([]);
  filePreviews = signal<(string | null)[]>([]);
  fileError = signal('');
  analyzing = signal(false);
  declarationAccepted = false;

  // Estimate from landing page
  savedEstimate = signal<any>(null);
  estimatePrice = signal<number | null>(null);
  priceChanged = signal(false);
  newPrice = signal<number | null>(null);

  tier = 'OFFICIAL';
  urgency = 'NORMAL';
  deliveryType = 'DIGITAL';
  deliveryAddress = '';
  deliveryCity = '';
  deliveryWilaya = '';
  deliveryPostalCode = '';
  deliveryPhone = '';
  addressConfirmed = false;
  wilayas = WILAYAS;
  quote = signal<QuoteData | null>(null);

  ngOnInit() {
    this.api.get<CascadeResponse>('/api/v1/client/language-pairs').subscribe({
      next: (res) => {
        if (res.data?.languages) {
          this.cascadeLanguages.set(sortLangs(res.data.languages.map((l: CascadeLanguage) => ({ ...l, targets: sortLangs(l.targets) }))));
          this.prefillFromEstimate();
        }
      },
    });
  }

  private prefillFromEstimate(): void {
    const saved = localStorage.getItem('tarjem_estimate');
    if (!saved) return;
    try {
      const estimate = JSON.parse(saved);
      if (Date.now() - estimate.timestamp >= 3600000) {
        localStorage.removeItem('tarjem_estimate');
        return;
      }
      // Save the original estimate for the recap
      this.savedEstimate.set(estimate);
      if (estimate.totalPrice) this.estimatePrice.set(estimate.totalPrice);

      // Pre-fill form fields
      if (estimate.sourceLanguage) {
        this.sourceLanguage = estimate.sourceLanguage;
        const src = this.cascadeLanguages().find(l => l.name === estimate.sourceLanguage);
        if (src) {
          this.selectedSource.set(src);
          if (estimate.targetLanguage) {
            this.targetLanguage = estimate.targetLanguage;
          }
        }
      }
      if (estimate.documentType) {
        // Try to match back to known doc type keys
        const allTypes = DOCUMENT_CATEGORIES.flatMap(c => c.types);
        const parts = (estimate.documentType as string).split(',').map((s: string) => s.trim()).filter((s: string) => s);
        const matched: string[] = [];
        for (const part of parts) {
          const found = allTypes.find(t => t === part);
          if (found) matched.push(found);
        }
        if (matched.length > 0) {
          this.selectedDocTypes = matched;
          this.updateDocumentType();
        } else {
          this.documentType = estimate.documentType;
        }
      }
      if (estimate.pageCount) this.pageCount = estimate.pageCount;
      if (estimate.tier) this.tier = estimate.tier;
      if (estimate.urgency === 'EXPRESS') this.urgency = 'EXPRESS';
      if (estimate.deliveryType === 'PHYSICAL') this.deliveryType = 'PHYSICAL';
    } catch { /* ignore */ }
    localStorage.removeItem('tarjem_estimate');
  }

  toggleDocType(type: string) {
    const idx = this.selectedDocTypes.indexOf(type);
    if (idx >= 0) {
      this.selectedDocTypes.splice(idx, 1);
    } else {
      this.selectedDocTypes.push(type);
    }
    this.updateDocumentType();
  }

  removeDocType(type: string) {
    this.selectedDocTypes = this.selectedDocTypes.filter(t => t !== type);
    this.updateDocumentType();
  }

  private updateDocumentType() {
    if (this.selectedDocTypes.length === 0) {
      this.documentType = '';
      return;
    }
    const names = this.selectedDocTypes.map(dt => this.transloco.translate('docTypes.' + dt));
    this.documentType = names.join(', ');
  }

  closeDocTypeDropdown() {
    this.showDocTypeDropdown = false;
  }

  selectSource(lang: CascadeLanguage) { this.selectedSource.set(lang); this.sourceLanguage = lang.name; this.targetLanguage = ''; }
  selectTarget(lang: CascadeTarget) { this.targetLanguage = lang.name; }
  resetPairSelection() { this.selectedSource.set(null); this.sourceLanguage = ''; this.targetLanguage = ''; }
  selectedSourceCountryCode() { return this.selectedSource()?.countryCode ?? this.cascadeLanguages().find(l => l.name === this.sourceLanguage)?.countryCode ?? ''; }
  selectedTargetCountryCode() { const src = this.selectedSource() ?? this.cascadeLanguages().find(l => l.name === this.sourceLanguage); return src?.targets.find(t => t.name === this.targetLanguage)?.countryCode ?? ''; }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    this.fileError.set('');
    const newFiles: File[] = [];
    for (const file of Array.from(input.files)) {
      if (file.size > MAX_FILE_SIZE) { this.fileError.set(this.transloco.translate('newOrder.fileTooLarge', { name: file.name, max: '10 Mo' })); continue; }
      if (!ALLOWED_TYPES.includes(file.type)) { this.fileError.set(this.transloco.translate('newOrder.fileInvalidType', { name: file.name })); continue; }
      newFiles.push(file);
    }
    if (newFiles.length > 0) {
      const all = [...this.selectedFiles(), ...newFiles];
      this.selectedFiles.set(all);
      this.generatePreviews(all);
      // Analyze ALL files to get accurate page count
      this.analyzeFiles(all);
      this.analytics.track('document_uploaded', { fileCount: newFiles.length, totalFiles: all.length });
    }
    input.value = '';
  }

  removeFile(index: number) {
    const f = [...this.selectedFiles()];
    f.splice(index, 1);
    this.selectedFiles.set(f);
    this.generatePreviews(f);
    this.fileError.set('');

    if (f.length === 0) {
      // No files left — reset to estimate state
      this.pageCount = this.savedEstimate()?.pageCount || 1;
      this.priceChanged.set(false);
      this.newPrice.set(null);
      this.quote.set(null);
    } else {
      // Re-analyze remaining files
      this.analyzeFiles(f);
    }
  }

  private analyzeFiles(files: File[]) {
    this.analyzing.set(true);
    this.pageCount = 0;
    let completed = 0;
    let totalPages = 0;
    for (const file of files) {
      if (!file.name.toLowerCase().endsWith('.pdf')) { completed++; totalPages++; continue; }
      const formData = new FormData();
      formData.append('file', file);
      this.http.post<any>('/api/v1/client/analyze-document', formData, {
        headers: { 'Authorization': 'Bearer ' + this.auth.getToken() }
      }).subscribe({
        next: (res) => {
          totalPages += res?.data?.pageCount || 1;
          completed++;
          if (completed >= files.length) {
            this.pageCount = Math.max(1, totalPages);
            this.analyzing.set(false);
            this.recalcQuote();
          }
        },
        error: () => {
          totalPages += 1;
          completed++;
          if (completed >= files.length) {
            this.pageCount = Math.max(1, totalPages);
            this.analyzing.set(false);
            this.recalcQuote();
          }
        },
      });
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
  }

  private generatePreviews(files: File[]) { this.filePreviews.set(files.map(f => f.type.startsWith('image/') ? URL.createObjectURL(f) : null)); }

  isAddressFilled(): boolean { return !!this.deliveryAddress.trim() && !!this.deliveryCity.trim() && !!this.deliveryWilaya && !!this.deliveryPostalCode.trim() && !!this.deliveryPhone.trim(); }

  recalcQuote() {
    if (this.pageCount < 1) return;
    this.api.post<QuoteData>('/api/v1/client/quote', { sourceLanguage: this.sourceLanguage, targetLanguage: this.targetLanguage, tier: this.tier, pageCount: this.pageCount, urgency: this.urgency, deliveryType: this.deliveryType }).subscribe({
      next: (res) => {
        if (res.data) {
          this.quote.set(res.data);
          // Check if price changed from original estimate
          if (this.estimatePrice()) {
            if (res.data.totalPrice !== this.estimatePrice()) {
              this.priceChanged.set(true);
              this.newPrice.set(res.data.totalPrice);
            } else {
              this.priceChanged.set(false);
              this.newPrice.set(null);
            }
          }
        }
      },
    });
  }

  canAdvance(): boolean {
    switch (this.currentStep()) {
      case 0: return !!this.documentType.trim() && !!this.sourceLanguage && !!this.targetLanguage && this.selectedFiles().length > 0 && this.declarationAccepted && !this.fileError();
      case 1: return !!this.tier && !!this.urgency && !!this.deliveryType && !this.analyzing() && (this.deliveryType !== 'PHYSICAL' || (this.isAddressFilled() && this.addressConfirmed));
      default: return true;
    }
  }

  nextStep() {
    if (!this.canAdvance()) return;
    if (this.currentStep() === 1) this.recalcQuote();
    this.currentStep.update(v => v + 1);
  }
  prevStep() { this.currentStep.update(v => Math.max(0, v - 1)); }

  submitOrder() {
    this.showConfirmDialog.set(false);
    this.submitting.set(true);
    this.analytics.track('order_submitted', {
      documentType: this.documentType, sourceLanguage: this.sourceLanguage, targetLanguage: this.targetLanguage,
      urgency: this.urgency, tier: this.tier, pageCount: this.pageCount, fileCount: this.selectedFiles().length,
      totalPrice: this.quote()?.totalPrice,
    });
    const body: any = {
      documentType: this.documentType, sourceLanguage: this.sourceLanguage, targetLanguage: this.targetLanguage,
      tier: this.tier, pageCount: this.pageCount, clientNotes: this.clientNotes || null,
      deliveryType: this.deliveryType, urgency: this.urgency, documentCount: this.selectedFiles().length,
    };
    if (this.deliveryType === 'PHYSICAL') {
      body.deliveryAddress = this.deliveryAddress;
      body.deliveryCity = this.deliveryCity;
      body.deliveryWilaya = this.deliveryWilaya;
      body.deliveryPostalCode = this.deliveryPostalCode;
      body.deliveryPhone = this.deliveryPhone;
    }
    this.api.post<any>('/api/v1/client/orders', body).subscribe({
      next: (res) => {
        const orderId = res.data?.id;
        if (orderId && this.selectedFiles().length > 0) this.uploadFilesSequentially(orderId, 0);
        else this.done(orderId);
      },
      error: (err: HttpErrorResponse) => { this.submitting.set(false); this.analytics.track('order_failed', { error: err.error?.message }); this.toast.error(err.error?.message || this.transloco.translate('common.error')); },
    });
  }

  private uploadFilesSequentially(orderId: string, index: number) {
    const files = this.selectedFiles();
    if (index >= files.length) { this.done(orderId); return; }
    this.api.upload<any>('/api/v1/client/orders/' + orderId + '/documents', files[index], 'file', { declarationAccepted: index === 0 ? 'true' : 'false' }).subscribe({
      next: () => this.uploadFilesSequentially(orderId, index + 1),
      error: () => { this.toast.error(this.transloco.translate('newOrder.uploadError')); this.done(orderId); },
    });
  }

  private done(orderId: string) { this.submitting.set(false); this.orderCompleted = true; this.analytics.track('order_completed', { orderId }); this.toast.success(this.transloco.translate('newOrder.success')); this.router.navigate(['/client/orders', orderId]); }

  ngOnDestroy(): void {
    if (!this.orderCompleted && this.currentStep() > 0) {
      this.analytics.track('order_abandoned', { step: this.currentStep(), documentType: this.documentType, sourceLanguage: this.sourceLanguage, targetLanguage: this.targetLanguage });
    }
  }
}
