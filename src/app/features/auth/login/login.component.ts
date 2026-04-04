import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { LanguageSwitcherComponent } from '../../../shared/components/language-switcher/language-switcher.component';
import { TranslateLangPipe } from '../../../shared/pipes/translate-lang.pipe';
import { AnalyticsService } from '../../../core/services/analytics.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslocoModule,
    LanguageSwitcherComponent,
    DecimalPipe,
    TranslateLangPipe,
  ],
  styles: [`
    @keyframes float {
      0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.08; }
      50% { transform: translateY(-20px) rotate(5deg); opacity: 0.14; }
    }
    @keyframes fade-up {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    .animate-fade-up {
      animation: fade-up 0.6s ease-out both;
    }
    .animate-fade-up-delay {
      animation: fade-up 0.6s ease-out 0.15s both;
    }
    .animate-fade-up-delay-2 {
      animation: fade-up 0.6s ease-out 0.3s both;
    }
    .floating-shape {
      animation: float 6s ease-in-out infinite;
    }
    .floating-shape:nth-child(2) { animation-delay: -2s; animation-duration: 8s; }
    .floating-shape:nth-child(3) { animation-delay: -4s; animation-duration: 7s; }
    .floating-shape:nth-child(4) { animation-delay: -1s; animation-duration: 9s; }
    .shimmer-text {
      background: linear-gradient(90deg, #1e40af, #3b82f6, #1e40af);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: shimmer 3s linear infinite;
    }
    .input-focus-ring {
      transition: all 0.2s ease;
    }
    .input-focus-ring:focus {
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
    }
    .btn-glow:not(:disabled):hover {
      box-shadow: 0 8px 30px rgba(37, 99, 235, 0.35);
    }
    .glass-card {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }
  `],
  template: `
    <div *transloco="let t" class="relative flex min-h-screen overflow-hidden">

      <!-- Animated background -->
      <div class="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <!-- Floating shapes -->
        <div class="floating-shape absolute top-[10%] left-[15%] w-72 h-72 rounded-full bg-blue-400/10 blur-3xl"></div>
        <div class="floating-shape absolute top-[60%] right-[10%] w-96 h-96 rounded-full bg-indigo-400/10 blur-3xl"></div>
        <div class="floating-shape absolute bottom-[10%] left-[40%] w-64 h-64 rounded-full bg-purple-400/10 blur-3xl"></div>
        <div class="floating-shape absolute top-[30%] right-[30%] w-48 h-48 rounded-full bg-cyan-400/10 blur-3xl"></div>

        <!-- Grid pattern overlay -->
        <div class="absolute inset-0 opacity-[0.03]"
          style="background-image: radial-gradient(circle, #1e40af 1px, transparent 1px); background-size: 40px 40px;">
        </div>
      </div>

      <!-- Top bar -->
      <div class="absolute top-5 left-5 right-5 z-20 flex items-center justify-between">
        <a routerLink="/" class="flex items-center gap-2 rounded-full bg-white/70 backdrop-blur-sm border border-slate-200/80 px-3.5 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all duration-200 hover:bg-white hover:shadow-md hover:text-slate-900">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          {{ t('auth.login.backHome') }}
        </a>
        <app-language-switcher />
      </div>

      <!-- Left branding panel (hidden on mobile) -->
      <div class="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12">
        @if (estimate()) {
          <div class="relative z-10 max-w-md animate-fade-up">
            <div class="mb-6">
              <span class="shimmer-text text-4xl font-black tracking-tight">Tarjem</span>
            </div>
            <h2 class="text-2xl font-bold text-slate-800 mb-2">{{ t('auth.login.orderReady') }}</h2>
            <p class="text-slate-500 mb-6">{{ t('auth.login.loginToContinue') }}</p>

            <div class="rounded-2xl bg-white/80 border border-slate-200/80 p-6 shadow-sm space-y-3">
              <div class="flex justify-between text-sm">
                <span class="text-slate-500">{{ t('estimator.languages') }}</span>
                <span class="font-semibold text-slate-800"><bdi dir="ltr">{{ estimate().sourceLanguage | translateLang }} &rarr; {{ estimate().targetLanguage | translateLang }}</bdi></span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-slate-500">{{ t('estimator.pagesLabel') }}</span>
                <span class="font-semibold text-slate-800">{{ estimate().pageCount }}</span>
              </div>
              @if (estimate().totalPrice) {
                <div class="border-t border-slate-200 pt-3 flex justify-between">
                  <span class="font-bold text-slate-900">{{ t('estimator.total') }}</span>
                  <span class="text-xl font-black text-emerald-600">{{ estimate().totalPrice | number:'1.0-0' }} {{ t('common.currency') }}</span>
                </div>
              }
            </div>
          </div>
        } @else {
          <div class="relative z-10 max-w-lg animate-fade-up">
            <!-- Logo -->
            <div class="mb-8">
              <span class="shimmer-text text-5xl font-black tracking-tight">Tarjem</span>
            </div>

            <!-- Tagline -->
            <h2 class="text-3xl font-bold text-slate-800 leading-tight mb-4">
              {{ t('auth.login.brandTitle') }}
            </h2>
            <p class="text-lg text-slate-500 leading-relaxed mb-10">
              {{ t('auth.login.brandSubtitle') }}
            </p>

            <!-- Feature pills -->
            <div class="flex flex-wrap gap-3">
              <span class="inline-flex items-center gap-2 rounded-full bg-white/70 border border-blue-100 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ t('auth.login.featureCertified') }}
              </span>
              <span class="inline-flex items-center gap-2 rounded-full bg-white/70 border border-indigo-100 px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ t('auth.login.featureFast') }}
              </span>
              <span class="inline-flex items-center gap-2 rounded-full bg-white/70 border border-purple-100 px-4 py-2 text-sm font-medium text-purple-700 shadow-sm">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                {{ t('auth.login.featureSecure') }}
              </span>
            </div>
          </div>
        }
      </div>

      <!-- Right login form panel -->
      <div class="flex w-full lg:w-1/2 items-center justify-center p-4 sm:p-8 relative z-10">
        <div class="glass-card w-full max-w-[440px] rounded-3xl border border-white/60 p-8 sm:p-10 shadow-2xl shadow-blue-900/5 animate-fade-up-delay">

          <!-- Mobile logo -->
          <div class="lg:hidden mb-6 text-center">
            <span class="shimmer-text text-3xl font-black tracking-tight">Tarjem</span>
          </div>

          <!-- Header -->
          <div class="mb-8">
            <h1 class="text-2xl font-bold text-slate-900">{{ t('auth.login.title') }}</h1>
            <p class="mt-2 text-sm text-slate-500">{{ t('auth.login.subtitle') }}</p>
          </div>

          <!-- Form -->
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">

            <!-- Email -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">
                {{ t('auth.email') }}
              </label>
              <div class="relative">
                <div class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5">
                  <svg class="w-4.5 h-4.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <input
                  formControlName="email"
                  type="email"
                  [placeholder]="t('auth.emailPlaceholder')"
                  class="input-focus-ring block w-full rounded-xl border border-slate-200 bg-white/80 ps-11 pe-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
                  [class.border-red-300]="form.controls.email.touched && form.controls.email.invalid"
                  [class.focus:border-red-400]="form.controls.email.touched && form.controls.email.invalid"
                />
              </div>
              @if (form.controls.email.touched && form.controls.email.invalid) {
                <p class="mt-1.5 text-xs text-red-500 font-medium">{{ t('auth.emailRequired') }}</p>
              }
            </div>

            <!-- Password -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">
                {{ t('auth.password') }}
              </label>
              <div class="relative">
                <div class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5">
                  <svg class="w-4.5 h-4.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <input
                  formControlName="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  [placeholder]="t('auth.passwordPlaceholder')"
                  class="input-focus-ring block w-full rounded-xl border border-slate-200 bg-white/80 ps-11 pe-11 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
                  [class.border-red-300]="form.controls.password.touched && form.controls.password.invalid"
                  [class.focus:border-red-400]="form.controls.password.touched && form.controls.password.invalid"
                />
                <button
                  type="button"
                  class="absolute inset-y-0 end-0 flex items-center pe-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                  (click)="showPassword.set(!showPassword())"
                >
                  @if (showPassword()) {
                    <svg class="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  } @else {
                    <svg class="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  }
                </button>
              </div>
              @if (form.controls.password.touched && form.controls.password.invalid) {
                <p class="mt-1.5 text-xs text-red-500 font-medium">{{ t('auth.passwordRequired') }}</p>
              }
              <div class="flex justify-end mt-1">
                <a routerLink="/auth/forgot-password" class="text-xs text-blue-600 hover:text-blue-700 font-medium">{{ t('auth.forgotPassword') }}</a>
              </div>
            </div>

            <!-- Submit button -->
            <button
              type="submit"
              [disabled]="form.invalid || loading()"
              class="btn-glow relative w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 text-sm font-bold text-white transition-all duration-300 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
            >
              @if (loading()) {
                <svg class="animate-spin h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              } @else {
                {{ t('auth.login.submit') }}
              }
            </button>

          </form>

          <!-- Divider -->
          <div class="my-8 flex items-center gap-3">
            <div class="h-px flex-1 bg-slate-200"></div>
            <span class="text-xs font-medium text-slate-400 uppercase tracking-wider">{{ t('auth.login.or') }}</span>
            <div class="h-px flex-1 bg-slate-200"></div>
          </div>

          <!-- Register links -->
          <div class="space-y-3 animate-fade-up-delay-2">
            <a
              routerLink="/auth/register"
              class="flex items-center justify-center gap-2 w-full rounded-xl border border-slate-200 bg-white/60 px-6 py-3 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-white hover:border-slate-300 hover:shadow-md"
            >
              <svg class="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              {{ t('auth.login.registerClient') }}
            </a>
            <a
              routerLink="/auth/register/translator"
              class="flex items-center justify-center gap-2 w-full rounded-xl border border-slate-200 bg-white/60 px-6 py-3 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-white hover:border-slate-300 hover:shadow-md"
            >
              <svg class="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
              </svg>
              {{ t('auth.login.registerTranslator') }}
            </a>
          </div>

        </div>
      </div>

    </div>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly analytics = inject(AnalyticsService);

  loading = signal(false);
  showPassword = signal(false);
  estimate = signal<any>(null);

  constructor() {
    const saved = localStorage.getItem('tarjem_estimate');
    if (saved) {
      try {
        const e = JSON.parse(saved);
        if (Date.now() - e.timestamp < 3600000) {
          this.estimate.set(e);
        }
      } catch { /* ignore */ }
    }
  }

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.analytics.track('login_attempted');

    const { email, password } = this.form.getRawValue();

    this.authService.login(email, password).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.analytics.track('login_succeeded', { role: res.data.role });
        this.toast.success(this.transloco.translate('auth.login.welcomeBack'));

        // Redirect unverified users to verification page
        if (!res.data.emailVerified) {
          this.router.navigate(['/auth/verify-email']);
          return;
        }

        // Check if there's a pending estimate — redirect to order creation
        if (res.data.role === 'CLIENT') {
          const savedEstimate = localStorage.getItem('tarjem_estimate');
          if (savedEstimate) {
            this.router.navigate(['/client/orders/new']);
            return;
          }
        }

        const role = res.data.role;
        switch (role) {
          case 'CLIENT':
            this.router.navigate(['/client/dashboard']);
            break;
          case 'TRANSLATOR':
            this.router.navigate(['/translator/dashboard']);
            break;
          case 'ADMIN':
            this.router.navigate(['/admin/dashboard']);
            break;
          default:
            this.router.navigate(['/']);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.analytics.track('login_failed', { error: err?.error?.message });
        const message = err?.error?.message || this.transloco.translate('auth.login.error');
        this.toast.error(message);
      },
    });
  }
}
