import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { LanguageSwitcherComponent } from '../../../shared/components/language-switcher/language-switcher.component';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslocoModule, LanguageSwitcherComponent],
  styles: [`
    @keyframes fade-up {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-up { animation: fade-up 0.6s ease-out both; }
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
          {{ t('auth.login') }}
        </a>
        <app-language-switcher />
      </div>

      <!-- Card -->
      <div class="glass-card relative z-10 w-full max-w-[440px] mx-4 rounded-3xl border border-white/60 p-8 sm:p-10 shadow-2xl shadow-blue-900/5 animate-fade-up">

        <!-- Email icon -->
        <div class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
          <svg class="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>

        <div class="mb-8 text-center">
          <h1 class="text-2xl font-bold text-slate-900">{{ t('auth.verifyEmail') }}</h1>
          <p class="mt-2 text-sm text-slate-500">{{ t('auth.verifyEmailDesc') }}</p>
        </div>

        @if (!verified()) {
          <form [formGroup]="form" (ngSubmit)="verify()" class="space-y-5">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">{{ t('auth.verifyCode') }}</label>
              <input formControlName="code" type="text" placeholder="000000" maxlength="6"
                class="input-focus-ring block w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 text-center tracking-[0.5em] font-mono text-lg placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
                [class.border-red-300]="form.controls.code.touched && form.controls.code.invalid" />
              @if (form.controls.code.touched && form.controls.code.invalid) {
                <p class="mt-1.5 text-xs text-red-500 font-medium">{{ t('auth.verifyCode') }}</p>
              }
            </div>

            <button type="submit" [disabled]="form.invalid || loading()"
              class="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
              @if (loading()) {
                <svg class="animate-spin h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
              } @else {
                {{ t('auth.verify') }}
              }
            </button>
          </form>

          <!-- Resend code -->
          <div class="mt-4 text-center">
            <button (click)="resend()" [disabled]="resending()"
              class="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50">
              {{ t('auth.resendCode') }}
            </button>
          </div>
        } @else {
          <!-- Success state -->
          <div class="rounded-xl bg-green-50 border border-green-200 p-4 text-center">
            <svg class="mx-auto mb-2 h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-sm font-medium text-green-700">{{ t('auth.emailVerified') }}</p>
          </div>
        }
      </div>
    </div>
  `,
})
export class VerifyEmailComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  loading = signal(false);
  resending = signal(false);
  verified = signal(false);

  form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  verify(): void {
    if (this.form.invalid) return;
    this.loading.set(true);

    this.authService.verifyEmail(this.form.getRawValue().code).subscribe({
      next: () => {
        this.loading.set(false);
        this.verified.set(true);
        this.toast.success(this.transloco.translate('auth.emailVerified'));
        setTimeout(() => {
          const role = this.authService.currentUser()?.role;
          if (role === 'CLIENT') {
            const savedEstimate = localStorage.getItem('tarjem_estimate');
            if (savedEstimate) {
              this.router.navigate(['/client/orders/new']);
            } else {
              this.router.navigate(['/client/dashboard']);
            }
          } else if (role === 'TRANSLATOR') {
            this.router.navigate(['/translator/dashboard']);
          } else {
            this.router.navigate(['/']);
          }
        }, 1500);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.message || this.transloco.translate('auth.emailNotVerified');
        this.toast.error(msg);
      },
    });
  }

  resend(): void {
    this.resending.set(true);
    this.authService.resendVerification().subscribe({
      next: () => {
        this.resending.set(false);
        this.toast.success(this.transloco.translate('auth.verifyCodeResent'));
      },
      error: (err) => {
        this.resending.set(false);
        const msg = err?.error?.message || this.transloco.translate('common.error');
        this.toast.error(msg);
      },
    });
  }
}
