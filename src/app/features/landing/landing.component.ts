import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../core/services/auth.service';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';
import { TranslateLangPipe } from '../../shared/pipes/translate-lang.pipe';
import { AnalyticsService } from '../../core/services/analytics.service';

interface CascadeTarget { name: string; countryCode: string; }
interface CascadeLanguage { name: string; countryCode: string; targets: CascadeTarget[]; }
interface QuoteData { basePrice: number; urgencyFee: number; deliveryFee: number; totalPrice: number; pricePerPage: number; translatorAmount: number; platformAmount: number; }

const LANG_ORDER: Record<string, number> = { 'Arabe': 0, 'Francais': 1, 'Anglais': 2, 'Espagnol': 3, 'Allemand': 4, 'Italien': 5, 'Turc': 6, 'Portugais': 7, 'Chinois': 8, 'Russe': 9 };
function sortLangs<T extends { name: string }>(langs: T[]): T[] { return [...langs].sort((a, b) => (LANG_ORDER[a.name] ?? 99) - (LANG_ORDER[b.name] ?? 99)); }

@Component({
  selector: 'app-landing',
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
      0%, 100% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.15); }
      50% { box-shadow: 0 0 40px rgba(16, 185, 129, 0.3); }
    }
    @keyframes arrow-bounce {
      0%, 100% { transform: translateX(0); }
      50% { transform: translateX(6px); }
    }
    @keyframes gradient-shift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes count-tick {
      0% { transform: scale(1); }
      50% { transform: scale(1.06); }
      100% { transform: scale(1); }
    }
    .anim-fade-up { animation: fade-up 0.7s ease-out both; }
    .anim-fade-up-1 { animation: fade-up 0.7s ease-out 0.1s both; }
    .anim-fade-up-2 { animation: fade-up 0.7s ease-out 0.2s both; }
    .anim-fade-up-3 { animation: fade-up 0.7s ease-out 0.3s both; }
    .anim-fade-up-4 { animation: fade-up 0.7s ease-out 0.4s both; }
    .anim-fade-in { animation: fade-in 1s ease-out both; }
    .anim-float { animation: float 6s ease-in-out infinite; }
    .anim-float-delay { animation: float 6s ease-in-out 2s infinite; }
    .anim-float-delay-2 { animation: float 6s ease-in-out 4s infinite; }
    .glass-nav {
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }
    .flag-btn {
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .flag-btn:hover {
      transform: scale(1.1);
    }
    .flag-btn.selected {
      transform: scale(1.05);
    }
    .pill-toggle {
      transition: all 0.2s ease;
    }
    .price-gradient {
      background: linear-gradient(to right, #059669, #10b981);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .price-glow { animation: pulse-glow 3s ease-in-out infinite; }
    .price-tick { animation: count-tick 0.3s ease-out; }
    .arrow-anim { animation: arrow-bounce 1.5s ease-in-out infinite; }
    .card-lift {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .card-lift:hover {
      transform: translateY(-8px);
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15);
    }
    .hero-dark {
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #0f172a 100%);
    }
    .logo-gradient {
      background: linear-gradient(90deg, #34d399, #6ee7b7, #34d399);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: shimmer 4s linear infinite;
    }
    .accent-strip {
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      border-radius: 4px 0 0 4px;
    }
    .testimonial-card {
      transition: all 0.3s ease;
    }
    .testimonial-card:hover {
      transform: scale(1.02);
    }
  `],
  template: `
    <div *transloco="let t" class="min-h-screen bg-slate-950 overflow-x-hidden">

      <!-- ==================== NAVBAR ==================== -->
      <nav class="fixed top-0 inset-x-0 z-50 transition-all duration-300"
        [class]="scrolled ? 'glass-nav border-b border-white/10 shadow-lg' : 'bg-transparent'">
        <div class="mx-auto max-w-7xl flex items-center justify-between px-4 sm:px-8 py-3">
          <a routerLink="/" class="logo-gradient text-2xl font-black tracking-tight">Tarjem</a>

          <!-- Desktop nav links -->
          <div class="hidden md:flex items-center gap-8">
            <a href="#services" class="text-sm font-medium text-slate-400 hover:text-emerald-400 transition-colors">{{ t('landing.nav.services') }}</a>
            <a href="#how-it-works" class="text-sm font-medium text-slate-400 hover:text-emerald-400 transition-colors">{{ t('landing.nav.howItWorks') }}</a>
            <a href="#testimonials" class="text-sm font-medium text-slate-400 hover:text-emerald-400 transition-colors">{{ t('landing.nav.testimonials') }}</a>
            <a routerLink="/verify" class="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
              {{ t('landing.nav.verify') }}
            </a>
          </div>

          <div class="flex items-center gap-3">
            <app-language-switcher [inline]="true" />
            @if (isLoggedIn()) {
              <a [routerLink]="dashboardRoute()"
                 class="hidden sm:inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-md transition-all duration-200 hover:bg-emerald-400 hover:shadow-lg">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z"/></svg>
                {{ t('landing.goToDashboard') }}
              </a>
            } @else {
              <a routerLink="/auth/login"
                 class="hidden sm:inline-flex items-center rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/10 hover:border-white/30">
                {{ t('landing.login') }}
              </a>
              <a routerLink="/auth/register"
                 class="hidden sm:inline-flex items-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-md transition-all duration-200 hover:bg-emerald-400 hover:shadow-lg">
                {{ t('landing.getStarted') }}
              </a>
            }

            <!-- Mobile hamburger -->
            <button (click)="mobileMenuOpen.set(!mobileMenuOpen())" class="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-white hover:bg-white/10 transition-colors cursor-pointer">
              @if (mobileMenuOpen()) {
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              } @else {
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
              }
            </button>
          </div>
        </div>

        <!-- Mobile menu -->
        @if (mobileMenuOpen()) {
          <div class="md:hidden glass-nav border-t border-white/10 px-4 py-4 space-y-3">
            <a href="#services" (click)="mobileMenuOpen.set(false)" class="block text-sm font-medium text-slate-300 hover:text-emerald-400 py-2">{{ t('landing.nav.services') }}</a>
            <a href="#how-it-works" (click)="mobileMenuOpen.set(false)" class="block text-sm font-medium text-slate-300 hover:text-emerald-400 py-2">{{ t('landing.nav.howItWorks') }}</a>
            <a href="#testimonials" (click)="mobileMenuOpen.set(false)" class="block text-sm font-medium text-slate-300 hover:text-emerald-400 py-2">{{ t('landing.nav.testimonials') }}</a>
            <a routerLink="/verify" (click)="mobileMenuOpen.set(false)" class="block text-sm font-medium text-emerald-400 hover:text-emerald-300 py-2">{{ t('landing.nav.verify') }}</a>
            @if (!isLoggedIn()) {
              <div class="flex gap-3 pt-2">
                <a routerLink="/auth/login" (click)="mobileMenuOpen.set(false)" class="flex-1 text-center rounded-full border border-white/20 px-4 py-2.5 text-sm font-semibold text-white">{{ t('landing.login') }}</a>
                <a routerLink="/auth/register" (click)="mobileMenuOpen.set(false)" class="flex-1 text-center rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950">{{ t('landing.getStarted') }}</a>
              </div>
            } @else {
              <a [routerLink]="dashboardRoute()" (click)="mobileMenuOpen.set(false)" class="block text-center rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950">{{ t('landing.goToDashboard') }}</a>
            }
          </div>
        }
      </nav>

      <!-- ==================== HERO (Dark) ==================== -->
      <section class="relative min-h-screen flex items-center hero-dark overflow-hidden">
        <!-- Background decorations -->
        <div class="absolute inset-0 pointer-events-none">
          <div class="anim-float absolute top-[10%] left-[5%] w-72 h-72 rounded-full bg-emerald-500/5 blur-3xl"></div>
          <div class="anim-float-delay absolute top-[50%] right-[5%] w-96 h-96 rounded-full bg-indigo-500/8 blur-3xl"></div>
          <div class="anim-float-delay-2 absolute bottom-[10%] left-[30%] w-64 h-64 rounded-full bg-emerald-500/5 blur-3xl"></div>
          <div class="absolute inset-0 opacity-[0.03]"
            style="background-image: radial-gradient(circle, #34d399 1px, transparent 1px); background-size: 50px 50px;">
          </div>
        </div>

        <div class="relative mx-auto max-w-7xl px-4 sm:px-8 pt-28 pb-16 w-full">
          <div class="grid lg:grid-cols-12 gap-10 lg:gap-16 items-start">

            <!-- LEFT: Headline + Stats -->
            <div class="lg:col-span-5 space-y-8">
              <!-- Badge -->
              <div class="anim-fade-up inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5">
                <span class="relative flex h-2 w-2">
                  <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                <span class="text-sm font-medium text-emerald-400">{{ t('landing.hero.badge') }}</span>
              </div>

              <!-- Headline -->
              <div class="anim-fade-up-1">
                <h1 class="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.05] tracking-tight">
                  {{ t('landing.hero.titleLine1') }}<span class="text-emerald-400">{{ t('landing.hero.titleHighlight') }}</span>{{ t('landing.hero.titleLine2') }}
                </h1>
                <p class="mt-5 text-lg sm:text-xl text-slate-400 leading-relaxed max-w-lg">
                  {{ t('landing.heroEstimator.tagline') }}
                </p>
              </div>

              <!-- Starting price -->
              @if (startingPrice(); as price) {
                <div class="anim-fade-up-2 inline-flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-5 py-3">
                  <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/20">
                    <svg class="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
                  </div>
                  <div>
                    <p class="text-xs text-slate-500 uppercase tracking-wider font-semibold">{{ t('landing.startingFrom') }}</p>
                    <p class="text-xl font-black text-white">{{ price | number:'1.0-0' }} <span class="text-emerald-400 text-sm font-bold">{{ t('common.currencyPerPage') }}</span></p>
                  </div>
                </div>
              }

              <!-- Stats row -->
              <div class="anim-fade-up-3 grid grid-cols-3 gap-4">
                @for (stat of stats; track stat.key) {
                  <div class="text-center sm:text-left">
                    <div class="text-2xl sm:text-3xl font-black text-white">{{ t('landing.stats.' + stat.key + '.value') }}</div>
                    <div class="text-xs text-slate-500 font-medium mt-1">{{ t('landing.stats.' + stat.key + '.label') }}</div>
                  </div>
                }
              </div>
            </div>

            <!-- RIGHT: Estimator Card -->
            <div class="lg:col-span-7 anim-fade-up-2">
              <div class="rounded-3xl bg-white shadow-2xl p-5 sm:p-7 space-y-5">

                <!-- Language Selection Row -->
                <div dir="ltr" class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <!-- Source Languages -->
                  <div class="flex-1 min-w-0">
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{{ t('landing.heroEstimator.from') }}</label>
                    @if (cascadeLanguages().length === 0) {
                      <div class="flex items-center gap-2 py-2">
                        <svg class="w-4 h-4 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                        <span class="text-xs text-slate-400">{{ t('common.loading') }}</span>
                      </div>
                    } @else {
                      <div class="flex flex-wrap gap-2">
                        @for (lang of cascadeLanguages(); track lang.name) {
                          <button
                            (click)="selectSource(lang)"
                            class="flag-btn w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer"
                            [class.border-emerald-500]="selectedSource === lang.name"
                            [class.ring-2]="selectedSource === lang.name"
                            [class.ring-emerald-500/30]="selectedSource === lang.name"
                            [class.scale-105]="selectedSource === lang.name"
                            [class.border-slate-200]="selectedSource !== lang.name"
                            [class.opacity-40]="selectedSource && selectedSource !== lang.name"
                            [class.grayscale]="selectedSource && selectedSource !== lang.name"
                            [class.hover:opacity-80]="selectedSource && selectedSource !== lang.name"
                            [class.hover:grayscale-0]="selectedSource && selectedSource !== lang.name"
                            [class.hover:border-emerald-300]="!selectedSource || selectedSource === lang.name"
                            [title]="(lang.name | translateLang)"
                          >
                            <img [src]="'https://flagcdn.com/w80/' + lang.countryCode + '.png'" [alt]="(lang.name | translateLang)" class="w-full h-full object-cover">
                          </button>
                        }
                      </div>
                    }
                  </div>

                  <!-- Arrow -->
                  <div class="hidden sm:flex items-center justify-center pt-6">
                    <svg class="w-6 h-6 text-emerald-400 arrow-anim" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </div>

                  <!-- Target Languages -->
                  <div class="flex-1 min-w-0">
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{{ t('landing.heroEstimator.to') }}</label>
                    @if (availableTargets().length === 0 && selectedSource) {
                      <p class="text-xs text-slate-400 py-3">{{ t('landing.heroEstimator.selectSourceFirst') }}</p>
                    } @else if (!selectedSource) {
                      <p class="text-xs text-slate-400 py-3">{{ t('landing.heroEstimator.selectSourceFirst') }}</p>
                    } @else {
                      <div class="flex flex-wrap gap-2">
                        @for (lang of availableTargets(); track lang.name) {
                          <button
                            (click)="selectTarget(lang)"
                            class="flag-btn w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer"
                            [class.border-emerald-500]="selectedTarget === lang.name"
                            [class.ring-2]="selectedTarget === lang.name"
                            [class.ring-emerald-500/30]="selectedTarget === lang.name"
                            [class.scale-105]="selectedTarget === lang.name"
                            [class.border-slate-200]="selectedTarget !== lang.name"
                            [class.opacity-40]="selectedTarget && selectedTarget !== lang.name"
                            [class.grayscale]="selectedTarget && selectedTarget !== lang.name"
                            [class.hover:opacity-80]="selectedTarget && selectedTarget !== lang.name"
                            [class.hover:grayscale-0]="selectedTarget && selectedTarget !== lang.name"
                            [class.hover:border-emerald-300]="!selectedTarget || selectedTarget === lang.name"
                            [title]="(lang.name | translateLang)"
                          >
                            <img [src]="'https://flagcdn.com/w80/' + lang.countryCode + '.png'" [alt]="(lang.name | translateLang)" class="w-full h-full object-cover">
                          </button>
                        }
                      </div>
                    }
                  </div>
                </div>

                <!-- Row: Pages -->
                <div>
                  <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{{ t('landing.heroEstimator.pages') }}</label>
                  <div class="flex items-center gap-1">
                    <button (click)="decrementPages()" class="flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all cursor-pointer">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14" /></svg>
                    </button>
                    <input type="number" [(ngModel)]="pageCount" (ngModelChange)="onFormChange()" min="1"
                      class="w-14 h-10 rounded-xl border border-slate-200 bg-white text-center text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    <button (click)="incrementPages()" class="flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all cursor-pointer">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                    </button>
                  </div>
                </div>

                <!-- Translation Type -->
                <div>
                  <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{{ t('estimator.tierLabel') }}</label>
                  <div class="grid grid-cols-2 gap-3">
                    <button (click)="tier = 'OFFICIAL'; onFormChange()"
                      class="flag-btn rounded-xl border-2 bg-white p-3 text-start cursor-pointer"
                      [class.border-amber-500]="tier === 'OFFICIAL'" [class.ring-2]="tier === 'OFFICIAL'" [class.ring-amber-500/30]="tier === 'OFFICIAL'"
                      [class.border-slate-200]="tier !== 'OFFICIAL'">
                      <span class="text-sm font-bold text-slate-900">{{ t('estimator.tierOfficial') }}</span>
                      <p class="text-[11px] text-slate-500 mt-0.5">{{ t('estimator.tierOfficialDesc') }}</p>
                    </button>
                    <button (click)="tier = 'STANDARD'; onFormChange()"
                      class="flag-btn rounded-xl border-2 bg-white p-3 text-start cursor-pointer"
                      [class.border-blue-500]="tier === 'STANDARD'" [class.ring-2]="tier === 'STANDARD'" [class.ring-blue-500/30]="tier === 'STANDARD'"
                      [class.border-slate-200]="tier !== 'STANDARD'">
                      <span class="text-sm font-bold text-slate-900">{{ t('estimator.tierStandard') }}</span>
                      <p class="text-[11px] text-slate-500 mt-0.5">{{ t('estimator.tierStandardDesc') }}</p>
                    </button>
                  </div>
                </div>

                <!-- Urgency -->
                <div>
                  <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{{ t('estimator.urgencyLabel') }}</label>
                  <div class="grid grid-cols-2 gap-3">
                    <button (click)="urgency = 'NORMAL'; onFormChange()"
                      class="flag-btn rounded-xl border-2 bg-white p-3 text-start cursor-pointer"
                      [class.border-emerald-500]="urgency === 'NORMAL'" [class.ring-2]="urgency === 'NORMAL'" [class.ring-emerald-500/30]="urgency === 'NORMAL'"
                      [class.border-slate-200]="urgency !== 'NORMAL'">
                      <span class="text-sm font-bold text-slate-900">{{ t('estimator.standard') }}</span>
                      <p class="text-[11px] text-slate-500 mt-0.5">{{ t('estimator.normalDesc') }}</p>
                    </button>
                    <button (click)="urgency = 'EXPRESS'; onFormChange()"
                      class="flag-btn rounded-xl border-2 bg-white p-3 text-start cursor-pointer"
                      [class.border-red-500]="urgency === 'EXPRESS'" [class.ring-2]="urgency === 'EXPRESS'" [class.ring-red-500/30]="urgency === 'EXPRESS'"
                      [class.border-slate-200]="urgency !== 'EXPRESS'">
                      <div class="flex items-center gap-1.5">
                        <span class="text-sm font-bold text-slate-900">{{ t('estimator.express') }}</span>
                        <span class="inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700">+50%</span>
                      </div>
                      <p class="text-[11px] text-slate-500 mt-0.5">{{ t('estimator.expressDesc') }}</p>
                    </button>
                  </div>
                </div>

                <!-- Delivery -->
                <div>
                  <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{{ t('estimator.deliveryLabel') }}</label>
                  <div class="grid grid-cols-2 gap-3">
                    <button (click)="deliveryType = 'DIGITAL'; onFormChange()"
                      class="flag-btn rounded-xl border-2 bg-white p-3 text-start cursor-pointer"
                      [class.border-indigo-500]="deliveryType === 'DIGITAL'" [class.ring-2]="deliveryType === 'DIGITAL'" [class.ring-indigo-500/30]="deliveryType === 'DIGITAL'"
                      [class.border-slate-200]="deliveryType !== 'DIGITAL'">
                      <span class="text-sm font-bold text-slate-900">{{ t('estimator.digital') }}</span>
                      <p class="text-[11px] text-slate-500 mt-0.5">{{ t('estimator.digitalDesc') }}</p>
                    </button>
                    <button (click)="deliveryType = 'PHYSICAL'; onFormChange()"
                      class="flag-btn rounded-xl border-2 bg-white p-3 text-start cursor-pointer"
                      [class.border-emerald-500]="deliveryType === 'PHYSICAL'" [class.ring-2]="deliveryType === 'PHYSICAL'" [class.ring-emerald-500/30]="deliveryType === 'PHYSICAL'"
                      [class.border-slate-200]="deliveryType !== 'PHYSICAL'">
                      <span class="text-sm font-bold text-slate-900">{{ t('estimator.physical') }}</span>
                      <p class="text-[11px] text-slate-500 mt-0.5">{{ t('estimator.physicalDesc') }}</p>
                    </button>
                  </div>
                </div>

                <!-- Calculating indicator -->
                @if (calculating()) {
                  <div class="flex items-center justify-center gap-2 py-2">
                    <svg class="w-5 h-5 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    <span class="text-sm text-slate-500">{{ t('estimator.calculating') }}</span>
                  </div>
                }

                <!-- Inline Price Result -->
                @if (quote(); as q) {
                  <div class="rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden">
                    <div class="p-4 space-y-2">
                      <div class="flex justify-between text-xs">
                        <span class="text-slate-500"><bdi dir="ltr">{{ selectedSource | translateLang }} → {{ selectedTarget | translateLang }}</bdi> ({{ pageCount }} {{ t('estimator.pagesLabel') }})</span>
                        <span class="font-semibold text-slate-700">{{ q.basePrice | number:'1.0-0' }} {{ t('common.currency') }}</span>
                      </div>
                      @if (q.urgencyFee > 0) {
                        <div class="flex justify-between text-xs">
                          <span class="text-red-500">{{ t('estimator.urgencyFee') }}</span>
                          <span class="font-semibold text-red-600">+{{ q.urgencyFee | number:'1.0-0' }} {{ t('common.currency') }}</span>
                        </div>
                      }
                      @if (q.deliveryFee > 0) {
                        <div class="flex justify-between text-xs">
                          <span class="text-slate-500">{{ t('estimator.deliveryFee') }}</span>
                          <span class="font-semibold text-slate-700">+{{ q.deliveryFee | number:'1.0-0' }} {{ t('common.currency') }}</span>
                        </div>
                      }
                      <div class="border-t border-slate-200 pt-2 flex justify-between items-center">
                        <span class="text-sm font-bold text-slate-900">{{ t('estimator.total') }}</span>
                        <span class="text-2xl font-black price-gradient">{{ q.totalPrice | number:'1.0-0' }} {{ t('common.currency') }}</span>
                      </div>
                    </div>
                    <div class="p-4 pt-0 space-y-2">
                      @if (isLoggedIn()) {
                        <button (click)="orderNow()"
                          class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-md hover:bg-emerald-400 hover:shadow-lg transition-all cursor-pointer">
                          {{ t('estimator.continueToOrder') }}
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
                        </button>
                      } @else {
                        <button (click)="goToRegister()"
                          class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-md hover:bg-emerald-400 hover:shadow-lg transition-all cursor-pointer">
                          {{ t('estimator.createAccount') }}
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
                        </button>
                        <button (click)="goToLogin()"
                          class="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer">
                          {{ t('estimator.iHaveAccount') }}
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ==================== HOW IT WORKS ==================== -->
      <section id="how-it-works" class="py-20 sm:py-28 bg-slate-950">
        <div class="mx-auto max-w-7xl px-4 sm:px-8">
          <div class="mb-16">
            <span class="inline-block rounded-full bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 text-sm font-semibold text-indigo-400 mb-4">{{ t('landing.nav.howItWorks') }}</span>
            <h2 class="text-3xl sm:text-4xl lg:text-5xl font-black text-white">{{ t('landing.howItWorks.title') }}</h2>
            <p class="mt-4 text-lg text-slate-400 max-w-2xl">{{ t('landing.howItWorks.subtitle') }}</p>
          </div>

          <!-- Desktop: horizontal timeline -->
          <div class="hidden md:grid md:grid-cols-3 gap-8 relative">
            <!-- Connecting line -->
            <div class="absolute top-10 left-[16.6%] right-[16.6%] h-0.5 bg-gradient-to-r from-emerald-500/50 via-indigo-500/50 to-emerald-500/50"></div>
            @for (step of howSteps; track step; let i = $index) {
              <div class="relative text-center">
                <div class="relative z-10 mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-slate-950 text-2xl font-black shadow-xl shadow-emerald-500/20">
                  {{ i + 1 }}
                </div>
                <h3 class="text-xl font-bold text-white mb-2">{{ t('landing.howItWorks.step' + step + '.title') }}</h3>
                <p class="text-sm text-slate-400 max-w-xs mx-auto">{{ t('landing.howItWorks.step' + step + '.desc') }}</p>
              </div>
            }
          </div>

          <!-- Mobile: vertical timeline -->
          <div class="md:hidden space-y-8">
            @for (step of howSteps; track step; let i = $index) {
              <div class="flex gap-5 items-start">
                <div class="flex-shrink-0 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-slate-950 text-xl font-black shadow-lg shadow-emerald-500/20">
                  {{ i + 1 }}
                </div>
                <div>
                  <h3 class="text-lg font-bold text-white mb-1">{{ t('landing.howItWorks.step' + step + '.title') }}</h3>
                  <p class="text-sm text-slate-400">{{ t('landing.howItWorks.step' + step + '.desc') }}</p>
                </div>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- ==================== SERVICES (2 cards) ==================== -->
      <section id="services" class="py-20 sm:py-28 bg-slate-900">
        <div class="mx-auto max-w-7xl px-4 sm:px-8">
          <div class="mb-16">
            <span class="inline-block rounded-full bg-amber-500/10 border border-amber-500/20 px-4 py-1.5 text-sm font-semibold text-amber-400 mb-4">{{ t('landing.nav.services') }}</span>
            <h2 class="text-3xl sm:text-4xl lg:text-5xl font-black text-white">{{ t('landing.servicesTitle') }}</h2>
            <p class="mt-4 text-lg text-slate-400 max-w-2xl">{{ t('landing.servicesSubtitle') }}</p>
          </div>

          <div class="grid gap-6 md:grid-cols-2 max-w-4xl">
            <!-- Official Certified -->
            <div class="card-lift group relative rounded-2xl bg-slate-800 border border-slate-700/50 p-8 overflow-hidden">
              <div class="accent-strip bg-gradient-to-b from-amber-400 to-amber-600"></div>
              <div class="relative z-10 pl-3">
                <div class="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 transition-transform duration-300 group-hover:scale-110">
                  <svg class="h-7 w-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                  </svg>
                </div>
                <div class="inline-block rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-400 mb-3">{{ t('landing.popular') }}</div>
                <h3 class="text-xl font-bold text-white mb-2">{{ t('landing.tier.official.title') }}</h3>
                <p class="text-sm text-slate-400 leading-relaxed">{{ t('landing.tier.official.description') }}</p>
              </div>
            </div>

            <!-- Professional Human -->
            <div class="card-lift group relative rounded-2xl bg-slate-800 border border-slate-700/50 p-8 overflow-hidden">
              <div class="accent-strip bg-gradient-to-b from-blue-400 to-blue-600"></div>
              <div class="relative z-10 pl-3">
                <div class="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/15 transition-transform duration-300 group-hover:scale-110">
                  <svg class="h-7 w-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-white mb-2">{{ t('landing.tier.standard.title') }}</h3>
                <p class="text-sm text-slate-400 leading-relaxed">{{ t('landing.tier.standard.description') }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ==================== DOCUMENT TYPES ==================== -->
      <section class="py-20 sm:py-28 bg-slate-950">
        <div class="mx-auto max-w-7xl px-4 sm:px-8">
          <div class="mb-16">
            <span class="inline-block rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 text-sm font-semibold text-emerald-400 mb-4">{{ t('landing.documents.badge') }}</span>
            <h2 class="text-3xl sm:text-4xl lg:text-5xl font-black text-white">{{ t('landing.documents.title') }}</h2>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            @for (doc of docTypes; track doc.key) {
              <div class="card-lift group flex flex-col items-center gap-3 rounded-2xl bg-slate-900 border border-slate-800 p-6 text-center hover:border-emerald-500/30">
                <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800 group-hover:bg-emerald-500/10 transition-colors">
                  <!-- Birth certificate -->
                  @if (doc.key === 'birth') {
                    <svg class="w-6 h-6 text-slate-400 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                  }
                  <!-- Marriage -->
                  @if (doc.key === 'marriage') {
                    <svg class="w-6 h-6 text-slate-400 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                  }
                  <!-- Diploma -->
                  @if (doc.key === 'diploma') {
                    <svg class="w-6 h-6 text-slate-400 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" /></svg>
                  }
                  <!-- Legal -->
                  @if (doc.key === 'legal') {
                    <svg class="w-6 h-6 text-slate-400 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" /></svg>
                  }
                  <!-- Medical -->
                  @if (doc.key === 'medical') {
                    <svg class="w-6 h-6 text-slate-400 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  }
                  <!-- Business -->
                  @if (doc.key === 'business') {
                    <svg class="w-6 h-6 text-slate-400 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                  }
                </div>
                <span class="text-sm font-semibold text-slate-300">{{ t('landing.documents.' + doc.key) }}</span>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- ==================== VERIFICATION ==================== -->
      <section class="py-20 sm:py-28 bg-slate-900">
        <div class="mx-auto max-w-7xl px-4 sm:px-8">
          <div class="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span class="inline-block rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 text-sm font-semibold text-emerald-400 mb-4">{{ t('landing.verification.badge') }}</span>
              <h2 class="text-3xl sm:text-4xl font-black text-white mb-4">{{ t('landing.verification.title') }}</h2>
              <p class="text-lg text-slate-400 leading-relaxed mb-6">{{ t('landing.verification.description') }}</p>
              <ul class="space-y-3 mb-8">
                <li class="flex items-center gap-3 text-sm text-slate-300">
                  <svg class="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {{ t('landing.verification.feature1') }}
                </li>
                <li class="flex items-center gap-3 text-sm text-slate-300">
                  <svg class="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {{ t('landing.verification.feature2') }}
                </li>
                <li class="flex items-center gap-3 text-sm text-slate-300">
                  <svg class="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {{ t('landing.verification.feature3') }}
                </li>
              </ul>
              <a routerLink="/verify"
                class="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-md transition-all duration-200 hover:bg-emerald-400 hover:shadow-lg">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
                {{ t('landing.verification.button') }}
              </a>
            </div>
            <div class="flex justify-center">
              <div class="relative">
                <div class="w-72 h-72 sm:w-80 sm:h-80 rounded-3xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center p-8">
                  <svg class="w-20 h-20 text-emerald-400 mb-4" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  <p class="text-lg font-bold text-white text-center">{{ t('landing.verification.cardTitle') }}</p>
                  <p class="text-sm text-emerald-400 text-center mt-1">{{ t('landing.verification.cardSubtitle') }}</p>
                  <div class="mt-4 px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 font-mono text-sm text-emerald-400 tracking-wider font-bold">TRJ-A1B2C3D4</div>
                </div>
                <div class="absolute -top-3 -right-3 w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <svg class="w-6 h-6 text-slate-950" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ==================== TESTIMONIALS ==================== -->
      <section id="testimonials" class="py-20 sm:py-28 bg-slate-950">
        <div class="mx-auto max-w-7xl px-4 sm:px-8">
          <div class="mb-16">
            <span class="inline-block rounded-full bg-pink-500/10 border border-pink-500/20 px-4 py-1.5 text-sm font-semibold text-pink-400 mb-4">{{ t('landing.testimonials.badge') }}</span>
            <h2 class="text-3xl sm:text-4xl lg:text-5xl font-black text-white">{{ t('landing.testimonials.title') }}</h2>
          </div>

          <div class="grid gap-6 md:grid-cols-3">
            @for (review of testimonials; track review; let i = $index) {
              <div class="testimonial-card rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 hover:border-slate-700">
                <div class="flex gap-1 mb-4">
                  @for (s of [1,2,3,4,5]; track s) {
                    <svg class="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  }
                </div>
                <p class="text-slate-300 leading-relaxed mb-6 italic">"{{ t('landing.testimonials.review' + (i + 1) + '.text') }}"</p>
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-slate-950 text-sm font-bold">
                    {{ t('landing.testimonials.review' + (i + 1) + '.initials') }}
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-white">{{ t('landing.testimonials.review' + (i + 1) + '.name') }}</p>
                    <p class="text-xs text-slate-500">{{ t('landing.testimonials.review' + (i + 1) + '.role') }}</p>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- ==================== CTA ==================== -->
      <section class="py-20 sm:py-28 bg-slate-900">
        <div class="mx-auto max-w-5xl px-4 sm:px-8">
          <div class="rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800 p-10 sm:p-16 text-center relative overflow-hidden">
            <div class="absolute top-0 left-0 w-60 h-60 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
            <div class="absolute bottom-0 right-0 w-80 h-80 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3"></div>
            <div class="relative z-10">
              <h2 class="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4">{{ t('landing.cta.title') }}</h2>
              <p class="text-emerald-100 text-lg mb-8 max-w-xl mx-auto">{{ t('landing.cta.subtitle') }}</p>
              <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a routerLink="/auth/register"
                  class="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-emerald-800 shadow-lg transition-all duration-200 hover:shadow-xl hover:bg-emerald-50">
                  {{ t('landing.cta.button') }}
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </a>
                <a routerLink="/auth/login"
                  class="inline-flex items-center rounded-xl border-2 border-white/30 px-8 py-4 text-base font-bold text-white transition-all duration-200 hover:bg-white/10">
                  {{ t('landing.login') }}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ==================== FOOTER ==================== -->
      <footer class="border-t border-slate-800 bg-slate-950 py-12 sm:py-16">
        <div class="mx-auto max-w-7xl px-4 sm:px-8">
          <div class="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 mb-12">
            <div>
              <span class="logo-gradient text-2xl font-black tracking-tight">Tarjem</span>
              <p class="mt-3 text-sm text-slate-500 leading-relaxed">{{ t('landing.footer.description') }}</p>
            </div>
            <div>
              <h4 class="text-sm font-bold text-white uppercase tracking-wider mb-4">{{ t('landing.footer.services') }}</h4>
              <ul class="space-y-2.5 text-sm text-slate-500">
                <li><a href="#services" class="hover:text-emerald-400 transition-colors">{{ t('landing.tier.official.title') }}</a></li>
                <li><a href="#services" class="hover:text-emerald-400 transition-colors">{{ t('landing.tier.standard.title') }}</a></li>
                <li><a routerLink="/verify" class="hover:text-emerald-400 transition-colors">{{ t('landing.nav.verify') }}</a></li>
              </ul>
            </div>
            <div>
              <h4 class="text-sm font-bold text-white uppercase tracking-wider mb-4">{{ t('landing.footer.company') }}</h4>
              <ul class="space-y-2.5 text-sm text-slate-500">
                <li><a href="#" class="hover:text-emerald-400 transition-colors">{{ t('landing.footer.about') }}</a></li>
                <li><a href="#" class="hover:text-emerald-400 transition-colors">{{ t('landing.footer.contact') }}</a></li>
                <li><a href="#" class="hover:text-emerald-400 transition-colors">{{ t('landing.footer.careers') }}</a></li>
              </ul>
            </div>
            <div>
              <h4 class="text-sm font-bold text-white uppercase tracking-wider mb-4">{{ t('landing.footer.legal') }}</h4>
              <ul class="space-y-2.5 text-sm text-slate-500">
                <li><a href="#" class="hover:text-emerald-400 transition-colors">{{ t('landing.footer.terms') }}</a></li>
                <li><a href="#" class="hover:text-emerald-400 transition-colors">{{ t('landing.footer.privacy') }}</a></li>
              </ul>
            </div>
          </div>
          <div class="border-t border-slate-800 pt-8 text-center">
            <p class="text-sm text-slate-600">&copy; {{ currentYear }} Tarjem. {{ t('landing.allRightsReserved') }}</p>
          </div>
        </div>
      </footer>

    </div>
  `,
})
export class LandingComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly analytics = inject(AnalyticsService);

  readonly currentYear = new Date().getFullYear();
  scrolled = false;

  // ---- Landing data ----
  readonly stats = [
    { key: 'translators' },
    { key: 'documents' },
    { key: 'satisfaction' },
  ];

  // 3 steps: step1, step2 (combines old 2+3), step3 (old step4)
  readonly howSteps = [1, 2, 3];

  readonly docTypes = [
    { key: 'birth' },
    { key: 'marriage' },
    { key: 'diploma' },
    { key: 'legal' },
    { key: 'medical' },
    { key: 'business' },
  ];

  readonly testimonials = [1, 2, 3];

  // ---- Estimator signals ----
  cascadeLanguages = signal<CascadeLanguage[]>([]);
  availableTargets = signal<CascadeTarget[]>([]);

  selectedSource = '';
  selectedTarget = '';
  pageCount = 1;
  tier: 'STANDARD' | 'OFFICIAL' = 'OFFICIAL';
  urgency: 'NORMAL' | 'EXPRESS' = 'NORMAL';
  deliveryType: 'DIGITAL' | 'PHYSICAL' = 'DIGITAL';

  quote = signal<QuoteData | null>(null);
  calculating = signal(false);
  isLoggedIn = signal(false);
  startingPrice = signal<number | null>(null);
  mobileMenuOpen = signal(false);

  ngOnInit(): void {
    // Scroll listener
    if (globalThis.window !== undefined) {
      globalThis.window.addEventListener('scroll', () => {
        this.scrolled = globalThis.window.scrollY > 20;
      });
    }

    // Check login state
    this.isLoggedIn.set(this.authService.isAuthenticated());

    // Load language pairs
    this.http.get<any>('/api/v1/language-pairs').subscribe({
      next: (res) => {
        const data = res?.data ?? res;
        if (data?.languages) this.cascadeLanguages.set(sortLangs(data.languages.map((l: CascadeLanguage) => ({ ...l, targets: sortLangs(l.targets) }))));
      },
    });

    // Fetch starting price
    this.http.post<any>('/api/v1/quote', {
      sourceLanguage: 'Arabe', targetLanguage: 'Francais',
      tier: 'OFFICIAL', pageCount: 1, deliveryType: 'DIGITAL', urgency: 'NORMAL'
    }).subscribe({ next: (res) => this.startingPrice.set(res?.data?.pricePerPage ?? null) });
  }

  selectSource(lang: CascadeLanguage): void {
    this.selectedSource = lang.name;
    this.selectedTarget = '';
    this.availableTargets.set(sortLangs(lang.targets ?? []));
    this.quote.set(null);
  }

  selectTarget(lang: CascadeTarget): void {
    this.selectedTarget = lang.name;
    this.onFormChange();
  }

  incrementPages(): void {
    this.pageCount++;
    this.onFormChange();
  }

  decrementPages(): void {
    if (this.pageCount > 1) {
      this.pageCount--;
      this.onFormChange();
    }
  }

  onFormChange(): void {
    if (this.selectedSource && this.selectedTarget && this.pageCount >= 1) {
      this.calculatePrice();
    } else {
      this.quote.set(null);
    }
  }

  dashboardRoute(): string {
    const role = this.authService.userRole();
    switch (role) {
      case 'TRANSLATOR': return '/translator/dashboard';
      case 'ADMIN': return '/admin/dashboard';
      default: return '/client/dashboard';
    }
  }

  calculatePrice(): void {
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
        this.analytics.track('landing_estimate_calculated', { source: this.selectedSource, target: this.selectedTarget, pages: this.pageCount, price: data?.totalPrice });
      },
      error: () => {
        this.calculating.set(false);
      },
    });
  }

  private saveEstimate(): void {
    const estimate = {
      sourceLanguage: this.selectedSource,
      targetLanguage: this.selectedTarget,
      pageCount: this.pageCount,
      tier: this.tier,
      urgency: this.urgency,
      deliveryType: this.deliveryType,
      totalPrice: this.quote()?.totalPrice,
      timestamp: Date.now(),
    };
    localStorage.setItem('tarjem_estimate', JSON.stringify(estimate));
  }

  orderNow(): void {
    this.saveEstimate();
    this.analytics.track('landing_order_now', { source: this.selectedSource, target: this.selectedTarget, price: this.quote()?.totalPrice });

    const role = this.authService.userRole();
    if (role === 'CLIENT') {
      this.router.navigate(['/client/orders/new']);
    } else {
      // Translator/Admin can't place orders — redirect to register as client
      this.router.navigate(['/auth/register']);
    }
  }

  goToRegister(): void {
    this.saveEstimate();
    this.analytics.track('landing_go_to_register');
    this.router.navigate(['/auth/register']);
  }

  goToLogin(): void {
    this.saveEstimate();
    this.analytics.track('landing_go_to_login');
    this.router.navigate(['/auth/login']);
  }
}
