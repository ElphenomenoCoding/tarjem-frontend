import { Component, inject, signal, OnInit, OnDestroy, effect } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslocoModule } from '@jsverse/transloco';
import { Subject, debounceTime } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';
import { TranslateLangPipe } from '../../shared/pipes/translate-lang.pipe';

interface CascadeTarget { name: string; countryCode: string; }
interface CascadeLanguage { name: string; countryCode: string; targets: CascadeTarget[]; }
interface CascadeResponse { languages: CascadeLanguage[]; }

const LANG_ORDER: Record<string, number> = { 'Arabe': 0, 'Francais': 1, 'Anglais': 2, 'Espagnol': 3, 'Allemand': 4, 'Italien': 5, 'Turc': 6, 'Portugais': 7, 'Chinois': 8, 'Russe': 9 };
function sortLangs<T extends { name: string }>(langs: T[]): T[] { return [...langs].sort((a, b) => (LANG_ORDER[a.name] ?? 99) - (LANG_ORDER[b.name] ?? 99)); }
interface QuoteData { basePrice: number; urgencyFee: number; deliveryFee: number; totalPrice: number; pricePerPage: number; translatorAmount: number; platformAmount: number; }
interface DocumentType { id: string; name: string; }

@Component({
  selector: 'app-estimator',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe, TranslocoModule, LanguageSwitcherComponent, TranslateLangPipe],
  styles: [`
    @keyframes fade-up {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-15px); }
    }
    @keyframes shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.15); }
      50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.3); }
    }
    @keyframes count-tick {
      0% { transform: scale(1); }
      50% { transform: scale(1.08); }
      100% { transform: scale(1); }
    }
    .anim-fade-up { animation: fade-up 0.7s ease-out both; }
    .anim-fade-up-1 { animation: fade-up 0.7s ease-out 0.1s both; }
    .anim-fade-up-2 { animation: fade-up 0.7s ease-out 0.2s both; }
    .anim-fade-up-3 { animation: fade-up 0.7s ease-out 0.3s both; }
    .anim-fade-up-4 { animation: fade-up 0.7s ease-out 0.4s both; }
    .anim-float { animation: float 6s ease-in-out infinite; }
    .anim-float-delay { animation: float 6s ease-in-out 2s infinite; }
    .anim-float-delay-2 { animation: float 6s ease-in-out 4s infinite; }
    .shimmer-text {
      background: linear-gradient(90deg, #1e40af, #6366f1, #1e40af);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: shimmer 4s linear infinite;
    }
    .opt { transition: all 0.2s ease; cursor: pointer; }
    .opt:hover { transform: translateY(-2px); box-shadow: 0 8px 20px -4px rgba(0,0,0,0.08); }
    .sel { border-color: #6366f1 !important; background-color: #eef2ff !important; }
    .price-card { animation: pulse-glow 3s ease-in-out infinite; }
    .price-tick { animation: count-tick 0.3s ease-out; }
    .select-styled {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='2' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.75rem center;
      background-size: 1rem;
    }
    [dir="rtl"] .select-styled {
      background-position: left 0.75rem center;
    }
  `],
  template: `
    <div *transloco="let t" class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/30">

      <!-- Background shapes -->
      <div class="fixed inset-0 pointer-events-none overflow-hidden">
        <div class="anim-float absolute top-[10%] left-[5%] w-72 h-72 rounded-full bg-blue-400/8 blur-3xl"></div>
        <div class="anim-float-delay absolute top-[40%] right-[5%] w-96 h-96 rounded-full bg-indigo-400/8 blur-3xl"></div>
        <div class="anim-float-delay-2 absolute bottom-[10%] left-[30%] w-64 h-64 rounded-full bg-purple-400/6 blur-3xl"></div>
      </div>

      <!-- NAVBAR -->
      <nav class="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm">
        <div class="mx-auto max-w-7xl flex items-center justify-between px-4 sm:px-8 py-3">
          <a routerLink="/" class="shimmer-text text-2xl font-black tracking-tight">Tarjem</a>
          <div class="flex items-center gap-3">
            <a routerLink="/" class="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
              {{ t('estimator.backHome') }}
            </a>
            <app-language-switcher />
          </div>
        </div>
      </nav>

      <!-- HERO -->
      <section class="relative pt-12 pb-6 sm:pt-16 sm:pb-8">
        <div class="mx-auto max-w-3xl text-center px-4">
          <h1 class="anim-fade-up text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 leading-tight tracking-tight">
            {{ t('estimator.heroTitle') }}
          </h1>
          <p class="anim-fade-up-1 mt-4 text-lg text-slate-500">
            {{ t('estimator.heroSubtitle') }}
          </p>
        </div>
      </section>

      <!-- ESTIMATOR CARD -->
      <section class="relative pb-16 px-4">
        <div class="mx-auto max-w-2xl">
          <div class="anim-fade-up-2 rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50 overflow-hidden">

            <!-- 1. LANGUAGE PAIR -->
            <div class="p-6 sm:p-8 border-b border-slate-100">
              <div class="flex items-center gap-2 mb-5">
                <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xs font-bold">1</div>
                <h2 class="text-lg font-bold text-slate-900">{{ t('estimator.languagePair') }}</h2>
              </div>

              @if (cascadeLanguages().length === 0) {
                <div class="flex items-center justify-center py-8">
                  <svg class="w-6 h-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                  <span class="ml-2 text-sm text-slate-500">{{ t('common.loading') }}</span>
                </div>
              } @else {
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <!-- Source language -->
                  <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{{ t('estimator.sourceLanguage') }}</label>
                    <select
                      [(ngModel)]="selectedSource"
                      (ngModelChange)="onSourceChange()"
                      class="select-styled w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="">{{ t('estimator.selectSource') }}</option>
                      @for (lang of cascadeLanguages(); track lang.name) {
                        <option [value]="lang.name">{{ lang.name | translateLang }}</option>
                      }
                    </select>
                  </div>
                  <!-- Target language -->
                  <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{{ t('estimator.targetLanguage') }}</label>
                    <select
                      [(ngModel)]="selectedTarget"
                      (ngModelChange)="onFormChange()"
                      [disabled]="!selectedSource"
                      class="select-styled w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">{{ t('estimator.selectTarget') }}</option>
                      @for (lang of availableTargets(); track lang.name) {
                        <option [value]="lang.name">{{ lang.name | translateLang }}</option>
                      }
                    </select>
                  </div>
                </div>

                <!-- Selected pair display -->
                @if (selectedSource && selectedTarget) {
                  <div dir="ltr" class="mt-4 flex items-center justify-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <div class="flex items-center gap-2">
                      <img [src]="'https://flagcdn.com/w40/' + getSourceCountryCode() + '.png'" class="w-6 h-4 rounded-sm object-cover" [alt]="selectedSource" />
                      <span class="text-sm font-semibold text-slate-800">{{ selectedSource | translateLang }}</span>
                    </div>
                    <svg class="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                    <div class="flex items-center gap-2">
                      <img [src]="'https://flagcdn.com/w40/' + getTargetCountryCode() + '.png'" class="w-6 h-4 rounded-sm object-cover" [alt]="selectedTarget" />
                      <span class="text-sm font-semibold text-slate-800">{{ selectedTarget | translateLang }}</span>
                    </div>
                  </div>
                }
              }
            </div>

            <!-- 2. DOCUMENT DETAILS -->
            <div class="p-6 sm:p-8 border-b border-slate-100">
              <div class="flex items-center gap-2 mb-5">
                <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xs font-bold">2</div>
                <h2 class="text-lg font-bold text-slate-900">{{ t('estimator.documentDetails') }}</h2>
              </div>

              <div class="space-y-4">
                <!-- Document type -->
                <div>
                  <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{{ t('estimator.documentType') }}</label>
                  <input
                    type="text"
                    [(ngModel)]="selectedDocType"
                    (ngModelChange)="onFormChange()"
                    class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    [placeholder]="t('estimator.documentTypePlaceholder')"
                  />
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <!-- Number of documents -->
                  <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{{ t('estimator.documentCount') }}</label>
                    <input
                      type="number"
                      [(ngModel)]="documentCount"
                      (ngModelChange)="onFormChange()"
                      min="1" max="15"
                      class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <!-- Total pages -->
                  <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{{ t('estimator.totalPages') }}</label>
                    <input
                      type="number"
                      [(ngModel)]="pageCount"
                      (ngModelChange)="onFormChange()"
                      min="1"
                      class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
                <p class="text-xs text-slate-400">{{ t('estimator.pageHint') }}</p>
              </div>
            </div>

            <!-- 3. OPTIONS -->
            <div class="p-6 sm:p-8 border-b border-slate-100">
              <div class="flex items-center gap-2 mb-5">
                <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xs font-bold">3</div>
                <h2 class="text-lg font-bold text-slate-900">{{ t('estimator.options') }}</h2>
              </div>

              <!-- Translation Type -->
              <div class="mb-5">
                <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{{ t('estimator.tierLabel') }}</label>
                <div class="grid grid-cols-2 gap-3">
                  <button
                    (click)="tier = 'OFFICIAL'; onFormChange()"
                    class="opt rounded-xl border-2 bg-white p-4 text-start"
                    [class.sel]="tier === 'OFFICIAL'"
                    [class.border-slate-200]="tier !== 'OFFICIAL'"
                  >
                    <div class="flex items-center gap-2 mb-1">
                      <svg class="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" /></svg>
                      <span class="text-sm font-bold text-slate-900">{{ t('estimator.tierOfficial') }}</span>
                    </div>
                    <p class="text-xs text-slate-500">{{ t('estimator.tierOfficialDesc') }}</p>
                  </button>
                  <button
                    (click)="tier = 'STANDARD'; onFormChange()"
                    class="opt rounded-xl border-2 bg-white p-4 text-start"
                    [class.sel]="tier === 'STANDARD'"
                    [class.border-slate-200]="tier !== 'STANDARD'"
                  >
                    <div class="flex items-center gap-2 mb-1">
                      <svg class="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                      <span class="text-sm font-bold text-slate-900">{{ t('estimator.tierStandard') }}</span>
                    </div>
                    <p class="text-xs text-slate-500">{{ t('estimator.tierStandardDesc') }}</p>
                  </button>
                </div>
              </div>

              <!-- Urgency -->
              <div class="mb-5">
                <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{{ t('estimator.urgencyLabel') }}</label>
                <div class="grid grid-cols-2 gap-3">
                  <button
                    (click)="urgency = 'NORMAL'; onFormChange()"
                    class="opt rounded-xl border-2 bg-white p-4 text-start"
                    [class.sel]="urgency === 'NORMAL'"
                    [class.border-slate-200]="urgency !== 'NORMAL'"
                  >
                    <div class="flex items-center gap-2 mb-1">
                      <svg class="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span class="text-sm font-bold text-slate-900">{{ t('estimator.standard') }}</span>
                    </div>
                    <p class="text-xs text-slate-500">{{ t('estimator.normalDesc') }}</p>
                    <span class="inline-flex mt-2 items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{{ t('estimator.included') }}</span>
                  </button>
                  <button
                    (click)="urgency = 'EXPRESS'; onFormChange()"
                    class="opt rounded-xl border-2 bg-white p-4 text-start"
                    [class.sel]="urgency === 'EXPRESS'"
                    [class.border-slate-200]="urgency !== 'EXPRESS'"
                  >
                    <div class="flex items-center gap-2 mb-1">
                      <svg class="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
                      <span class="text-sm font-bold text-slate-900">{{ t('estimator.express') }}</span>
                    </div>
                    <p class="text-xs text-slate-500">{{ t('estimator.expressDesc') }}</p>
                    <span class="inline-flex mt-2 items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">+50%</span>
                  </button>
                </div>
              </div>

              <!-- Delivery -->
              <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{{ t('estimator.deliveryLabel') }}</label>
                <div class="grid grid-cols-2 gap-3">
                  <button
                    (click)="deliveryType = 'DIGITAL'; onFormChange()"
                    class="opt rounded-xl border-2 bg-white p-4 text-start"
                    [class.sel]="deliveryType === 'DIGITAL'"
                    [class.border-slate-200]="deliveryType !== 'DIGITAL'"
                  >
                    <div class="flex items-center gap-2 mb-1">
                      <svg class="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                      <span class="text-sm font-bold text-slate-900">{{ t('estimator.digital') }}</span>
                    </div>
                    <p class="text-xs text-slate-500">{{ t('estimator.digitalDesc') }}</p>
                    <span class="inline-flex mt-2 items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{{ t('estimator.included') }}</span>
                  </button>
                  <button
                    (click)="deliveryType = 'PHYSICAL'; onFormChange()"
                    class="opt rounded-xl border-2 bg-white p-4 text-start"
                    [class.sel]="deliveryType === 'PHYSICAL'"
                    [class.border-slate-200]="deliveryType !== 'PHYSICAL'"
                  >
                    <div class="flex items-center gap-2 mb-1">
                      <svg class="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.136-.504 1.125-1.125v-2.5c0-.621-.504-1.125-1.125-1.125H18.75m-7.5 0v-4.875c0-.621.504-1.125 1.125-1.125h3.5c.442 0 .84.258 1.023.653l1.477 3.222a1.125 1.125 0 01.097.462v1.663m-7.5 0h7.5m-7.5 0l-1 0m0 0l-3 0" /></svg>
                      <span class="text-sm font-bold text-slate-900">{{ t('estimator.physical') }}</span>
                    </div>
                    <p class="text-xs text-slate-500">{{ t('estimator.physicalDesc') }}</p>
                    <span class="inline-flex mt-2 items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">+500 {{ t('common.currency') }}</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- 4. PRICE DISPLAY -->
            <div class="p-6 sm:p-8">
              <div class="flex items-center gap-2 mb-5">
                <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xs font-bold">4</div>
                <h2 class="text-lg font-bold text-slate-900">{{ t('estimator.yourPrice') }}</h2>
              </div>

              @if (calculating()) {
                <div class="rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-700 p-8 text-center">
                  <svg class="w-8 h-8 animate-spin text-white/70 mx-auto" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                  <p class="mt-3 text-sm text-white/70">{{ t('estimator.calculating') }}</p>
                </div>
              } @else if (quote()) {
                <div class="price-card rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-700 p-6 sm:p-8 text-white">
                  <!-- Price breakdown -->
                  <div class="space-y-2 mb-5">
                    <div class="flex justify-between text-sm">
                      <span class="text-blue-200">{{ t('estimator.basePrice') }}</span>
                      <span class="font-medium">{{ quote()!.basePrice | number }} {{ t('common.currency') }}</span>
                    </div>
                    @if (quote()!.urgencyFee > 0) {
                      <div class="flex justify-between text-sm">
                        <span class="text-blue-200">{{ t('estimator.urgencyFee') }}</span>
                        <span class="font-medium text-red-300">+{{ quote()!.urgencyFee | number }} {{ t('common.currency') }}</span>
                      </div>
                    }
                    @if (quote()!.deliveryFee > 0) {
                      <div class="flex justify-between text-sm">
                        <span class="text-blue-200">{{ t('estimator.deliveryFee') }}</span>
                        <span class="font-medium">+{{ quote()!.deliveryFee | number }} {{ t('common.currency') }}</span>
                      </div>
                    }
                    <div class="border-t border-white/20 pt-3"></div>
                  </div>

                  <!-- Total -->
                  <div class="text-center">
                    <p class="text-sm font-medium text-blue-200 mb-1">{{ t('estimator.totalPrice') }}</p>
                    <p class="text-5xl sm:text-6xl font-black tracking-tight price-tick">
                      {{ animatedPrice() | number }} <span class="text-2xl font-semibold text-blue-200">{{ t('common.currency') }}</span>
                    </p>
                    <p class="mt-2 text-sm text-blue-200">
                      {{ quote()!.pricePerPage | number }} {{ t('common.currency') }} / {{ t('estimator.perPage') }}
                    </p>
                  </div>
                </div>
              } @else {
                <div class="rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 border-2 border-dashed border-slate-200 p-8 text-center">
                  <svg class="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
                  <p class="text-sm text-slate-400">{{ t('estimator.fillToSeePrice') }}</p>
                </div>
              }

              <!-- CTA -->
              <button
                (click)="orderNow()"
                [disabled]="!quote()"
                class="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-8 py-4 text-base font-bold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:from-emerald-700 hover:to-green-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-lg"
                style="box-shadow: 0 8px 30px rgba(16, 185, 129, 0.25);"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                {{ t('estimator.orderNow') }}
              </button>
            </div>
          </div>

          <!-- TRUST SECTION -->
          <div class="anim-fade-up-4 mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="flex items-center gap-3 rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200/60 p-4">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                <svg class="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
              </div>
              <div>
                <p class="text-sm font-bold text-slate-900">{{ t('estimator.trustCertified') }}</p>
                <p class="text-xs text-slate-500">{{ t('estimator.trustCertifiedDesc') }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3 rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200/60 p-4">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100">
                <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
              </div>
              <div>
                <p class="text-sm font-bold text-slate-900">{{ t('estimator.trustFast') }}</p>
                <p class="text-xs text-slate-500">{{ t('estimator.trustFastDesc') }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3 rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200/60 p-4">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
                <svg class="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
              </div>
              <div>
                <p class="text-sm font-bold text-slate-900">{{ t('estimator.trustVerified') }}</p>
                <p class="text-xs text-slate-500">{{ t('estimator.trustVerifiedDesc') }}</p>
              </div>
            </div>
          </div>

          <p class="text-center text-sm text-slate-400 mt-6 mb-4">{{ t('estimator.socialProof') }}</p>
        </div>
      </section>
    </div>
  `,
})
export class EstimatorComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // Data signals
  cascadeLanguages = signal<CascadeLanguage[]>([]);
  availableTargets = signal<CascadeTarget[]>([]);
  documentTypes = signal<DocumentType[]>([]);

  // Form values
  selectedSource = '';
  selectedTarget = '';
  selectedDocType = '';
  documentCount = 1;
  pageCount = 1;
  urgency: 'NORMAL' | 'EXPRESS' = 'NORMAL';
  tier: 'OFFICIAL' | 'STANDARD' = 'OFFICIAL';
  deliveryType: 'DIGITAL' | 'PHYSICAL' = 'DIGITAL';

  // Price
  quote = signal<QuoteData | null>(null);
  calculating = signal(false);
  animatedPrice = signal(0);
  private priceAnimationFrame = 0;

  // Debounce
  private quoteSubject = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor() {
    // Animate price when quote changes
    effect(() => {
      const q = this.quote();
      if (q) {
        this.animatePrice(q.totalPrice);
      }
    });
  }

  ngOnInit(): void {
    // Load language pairs (public endpoint)
    this.http.get<any>('/api/v1/language-pairs').subscribe({
      next: (res) => {
        const data = res?.data ?? res;
        if (data?.languages) this.cascadeLanguages.set(sortLangs(data.languages.map((l: CascadeLanguage) => ({ ...l, targets: sortLangs(l.targets) }))));
      },
    });

    // Setup debounced quote calculation
    this.quoteSubject.pipe(debounceTime(300)).subscribe(() => {
      this.fetchQuote();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.priceAnimationFrame) cancelAnimationFrame(this.priceAnimationFrame);
  }

  onSourceChange(): void {
    this.selectedTarget = '';
    const source = this.cascadeLanguages().find(l => l.name === this.selectedSource);
    this.availableTargets.set(sortLangs(source?.targets ?? []));
    this.onFormChange();
  }

  onFormChange(): void {
    if (this.selectedSource && this.selectedTarget && this.pageCount >= 1) {
      this.quoteSubject.next();
    }
  }

  getSourceCountryCode(): string {
    return this.cascadeLanguages().find(l => l.name === this.selectedSource)?.countryCode ?? '';
  }

  getTargetCountryCode(): string {
    const source = this.cascadeLanguages().find(l => l.name === this.selectedSource);
    return source?.targets.find(t => t.name === this.selectedTarget)?.countryCode ?? '';
  }

  private fetchQuote(): void {
    if (!this.selectedSource || !this.selectedTarget || this.pageCount < 1) return;

    this.calculating.set(true);
    this.http.post<any>('/api/v1/quote', {
      sourceLanguage: this.selectedSource,
      targetLanguage: this.selectedTarget,
      tier: this.tier,
      pageCount: this.pageCount,
      deliveryType: this.deliveryType,
      urgency: this.urgency,
    }).subscribe({
      next: (res) => {
        const data = res?.data ?? res;
        this.quote.set(data);
        this.calculating.set(false);
      },
      error: () => {
        this.calculating.set(false);
      },
    });
  }

  private animatePrice(target: number): void {
    const start = this.animatedPrice();
    const diff = target - start;
    const duration = 500;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      this.animatedPrice.set(Math.round(start + diff * eased));
      if (progress < 1) {
        this.priceAnimationFrame = requestAnimationFrame(step);
      }
    };

    if (this.priceAnimationFrame) cancelAnimationFrame(this.priceAnimationFrame);
    this.priceAnimationFrame = requestAnimationFrame(step);
  }

  orderNow(): void {
    const estimate = {
      sourceLanguage: this.selectedSource,
      targetLanguage: this.selectedTarget,
      documentType: this.selectedDocType,
      documentCount: this.documentCount,
      pageCount: this.pageCount,
      tier: this.tier,
      urgency: this.urgency,
      deliveryType: this.deliveryType,
      totalPrice: this.quote()?.totalPrice,
      timestamp: Date.now(),
    };
    localStorage.setItem('tarjem_estimate', JSON.stringify(estimate));

    const user = this.auth.currentUser();
    if (user) {
      this.router.navigate(['/client/orders/new']);
    } else {
      this.router.navigate(['/auth/register']);
    }
  }
}
