import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { LanguageSwitcherComponent } from '../../../shared/components/language-switcher/language-switcher.component';
import { AnalyticsService } from '../../../core/services/analytics.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslocoModule, LanguageSwitcherComponent],
  styles: [`
    @keyframes fade-up {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-up { animation: fade-up 0.6s ease-out both; }
    .animate-fade-up-delay { animation: fade-up 0.6s ease-out 0.15s both; }
    .glass-card {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }
    .input-focus-ring { transition: all 0.2s ease; }
    .input-focus-ring:focus { box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); }
  `],
  template: `
    <div *transloco="let t" class="relative flex min-h-screen items-center justify-center overflow-hidden">

      <!-- Background -->
      <div class="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div class="absolute inset-0 opacity-[0.03]"
          style="background-image: radial-gradient(circle, #1e40af 1px, transparent 1px); background-size: 40px 40px;">
        </div>
      </div>

      <!-- Top bar -->
      <div class="absolute top-5 left-5 right-5 z-20 flex items-center justify-between">
        <a routerLink="/auth/login" class="flex items-center gap-2 rounded-full bg-white/70 backdrop-blur-sm border border-slate-200/80 px-3.5 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all duration-200 hover:bg-white hover:shadow-md hover:text-slate-900">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          {{ t('auth.login.submit') }}
        </a>
        <app-language-switcher />
      </div>

      <!-- Card -->
      <div class="glass-card relative z-10 w-full max-w-[440px] mx-4 rounded-3xl border border-white/60 p-8 sm:p-10 shadow-2xl shadow-blue-900/5 animate-fade-up">

        <div class="mb-8 text-center">
          <h1 class="text-2xl font-bold text-slate-900">{{ t('auth.forgotPasswordTitle') }}</h1>
          <p class="mt-2 text-sm text-slate-500">{{ t('auth.forgotPasswordDesc') }}</p>
        </div>

        <!-- Step 1: Email -->
        @if (step() === 1) {
          <form [formGroup]="emailForm" (ngSubmit)="sendResetCode()" class="space-y-5">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">{{ t('auth.email') }}</label>
              <input formControlName="email" type="email" [placeholder]="t('auth.emailPlaceholder')"
                class="input-focus-ring block w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
                [class.border-red-300]="emailForm.controls.email.touched && emailForm.controls.email.invalid" />
              @if (emailForm.controls.email.touched && emailForm.controls.email.invalid) {
                <p class="mt-1.5 text-xs text-red-500 font-medium">{{ t('auth.emailRequired') }}</p>
              }
            </div>
            <button type="submit" [disabled]="emailForm.invalid || loading()"
              class="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
              @if (loading()) {
                <svg class="animate-spin h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
              } @else {
                {{ t('auth.sendResetCode') }}
              }
            </button>
          </form>
        }

        <!-- Step 2: Token + New Password -->
        @if (step() === 2) {
          <div class="mb-4 rounded-xl bg-green-50 border border-green-200 p-3 text-sm text-green-700">
            {{ t('auth.resetCodeSent') }}
          </div>
          <form [formGroup]="resetForm" (ngSubmit)="resetPassword()" class="space-y-4">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">{{ t('auth.enterResetCode') }}</label>
              <input formControlName="token" type="text" placeholder="123456" maxlength="6"
                class="input-focus-ring block w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 text-center tracking-[0.5em] font-mono text-lg placeholder:text-slate-400 focus:border-blue-400 focus:outline-none" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">{{ t('auth.newPassword') }}</label>
              <input formControlName="newPassword" type="password" [placeholder]="t('auth.passwordPlaceholder')"
                class="input-focus-ring block w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">{{ t('auth.confirmNewPassword') }}</label>
              <input formControlName="confirmPassword" type="password" [placeholder]="t('auth.confirmPassword')"
                class="input-focus-ring block w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none" />
              @if (resetForm.controls.confirmPassword.touched && resetForm.controls.confirmPassword.value !== resetForm.controls.newPassword.value) {
                <p class="mt-1.5 text-xs text-red-500 font-medium">{{ t('auth.passwordMinLength') }}</p>
              }
            </div>
            <button type="submit" [disabled]="resetForm.invalid || loading() || resetForm.controls.confirmPassword.value !== resetForm.controls.newPassword.value"
              class="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
              @if (loading()) {
                <svg class="animate-spin h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
              } @else {
                {{ t('auth.resetPassword') }}
              }
            </button>
          </form>
        }

        <!-- Back to login link -->
        <div class="mt-6 text-center">
          <a routerLink="/auth/login" class="text-sm text-blue-600 hover:text-blue-700 font-medium">
            {{ t('auth.login.submit') }}
          </a>
        </div>
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly analytics = inject(AnalyticsService);

  step = signal(1);
  loading = signal(false);

  emailForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  resetForm = this.fb.nonNullable.group({
    token: ['', [Validators.required, Validators.minLength(6)]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  });

  sendResetCode() {
    if (this.emailForm.invalid) return;
    this.loading.set(true);
    this.analytics.track('password_reset_requested');
    const email = this.emailForm.getRawValue().email;

    this.api.post<any>('/api/v1/auth/forgot-password', { email }).subscribe({
      next: () => {
        this.loading.set(false);
        this.step.set(2);
      },
      error: () => {
        this.loading.set(false);
        // Still go to step 2 (don't leak info)
        this.step.set(2);
      },
    });
  }

  resetPassword() {
    if (this.resetForm.invalid) return;
    const { token, newPassword, confirmPassword } = this.resetForm.getRawValue();
    if (newPassword !== confirmPassword) return;

    this.loading.set(true);
    const email = this.emailForm.getRawValue().email;

    this.api.post<any>('/api/v1/auth/reset-password', { token, email, newPassword }).subscribe({
      next: () => {
        this.loading.set(false);
        this.analytics.track('password_reset_completed');
        this.toast.success(this.transloco.translate('auth.passwordResetSuccess'));
        this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.message || this.transloco.translate('auth.invalidResetCode');
        this.toast.error(msg);
      },
    });
  }
}
