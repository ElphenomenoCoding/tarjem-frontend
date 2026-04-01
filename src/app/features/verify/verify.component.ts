import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { ApiService } from '../../core/services/api.service';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';
import { TranslateLangPipe } from '../../shared/pipes/translate-lang.pipe';

@Component({
  selector: 'app-verify',
  standalone: true,
  imports: [FormsModule, TranslocoModule, RouterLink, LanguageSwitcherComponent, TranslateLangPipe],
  styles: [`
    @keyframes fade-up {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes pulse-check {
      0% { transform: scale(0); opacity: 0; }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); opacity: 1; }
    }
    .anim-fade-up { animation: fade-up 0.5s ease-out both; }
    .anim-fade-up-1 { animation: fade-up 0.5s ease-out 0.1s both; }
    .anim-fade-up-2 { animation: fade-up 0.5s ease-out 0.2s both; }
    .anim-fade-in { animation: fade-in 0.6s ease-out both; }
    .anim-pulse-check { animation: pulse-check 0.5s ease-out 0.2s both; }
    .shimmer-text {
      background: linear-gradient(90deg, #1e40af, #6366f1, #1e40af);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  `],
  template: `
    <div *transloco="let t" class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">

      <!-- Navbar -->
      <nav class="border-b border-slate-200/60 bg-white/80 backdrop-blur-lg">
        <div class="mx-auto max-w-7xl flex items-center justify-between px-4 sm:px-8 py-3">
          <a routerLink="/" class="shimmer-text text-2xl font-black tracking-tight">Tarjem</a>
          <div class="flex items-center gap-3">
            <app-language-switcher />
            <a routerLink="/" class="hidden sm:inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">
              {{ t('verify.backToHome') }}
            </a>
          </div>
        </div>
      </nav>

      <!-- Background decoration -->
      <div class="absolute top-0 left-0 right-0 h-[500px] overflow-hidden pointer-events-none -z-10">
        <div class="absolute top-[20%] left-[10%] w-72 h-72 rounded-full bg-blue-400/5 blur-3xl"></div>
        <div class="absolute top-[30%] right-[10%] w-96 h-96 rounded-full bg-indigo-400/5 blur-3xl"></div>
      </div>

      <div class="mx-auto max-w-2xl px-4 sm:px-8 py-12 sm:py-20">

        <!-- Header -->
        <div class="text-center mb-10 anim-fade-up">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg mb-6">
            <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h1 class="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">{{ t('verify.title') }}</h1>
          <p class="mt-3 text-lg text-slate-500 max-w-lg mx-auto">{{ t('verify.subtitle') }}</p>
        </div>

        <!-- Form Card -->
        @if (!verified()) {
          <div class="anim-fade-up-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <div class="space-y-5">

              <!-- Certificate Code -->
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1.5">{{ t('verify.certificateCode') }}</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <svg class="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    [(ngModel)]="certificateCode"
                    placeholder="TRJ-XXXXXXXX"
                    class="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-sm font-mono tracking-wider focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all uppercase"
                  />
                </div>
              </div>

              <!-- Name Fields -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-1.5">{{ t('verify.firstName') }}</label>
                  <input
                    type="text"
                    [(ngModel)]="firstName"
                    maxlength="3"
                    [placeholder]="t('verify.firstNamePlaceholder')"
                    class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                  <p class="mt-1 text-xs text-slate-400">{{ t('verify.threeLetters') }}</p>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-1.5">{{ t('verify.lastName') }}</label>
                  <input
                    type="text"
                    [(ngModel)]="lastName"
                    maxlength="3"
                    [placeholder]="t('verify.lastNamePlaceholder')"
                    class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                  <p class="mt-1 text-xs text-slate-400">{{ t('verify.threeLetters') }}</p>
                </div>
              </div>

              <!-- Error -->
              @if (error()) {
                <div class="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                  <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {{ error() }}
                </div>
              }

              <!-- Submit -->
              <button
                (click)="verify()"
                [disabled]="loading()"
                class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                @if (loading()) {
                  <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  {{ t('verify.verifying') }}
                } @else {
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  {{ t('verify.verifyButton') }}
                }
              </button>
            </div>

            <!-- Info note -->
            <div class="mt-6 pt-5 border-t border-slate-100">
              <div class="flex items-start gap-3 text-xs text-slate-400">
                <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                <p>{{ t('verify.infoNote') }}</p>
              </div>
            </div>
          </div>
        }

        <!-- SUCCESS Result -->
        @if (verified() && result()) {
          <div class="anim-fade-up space-y-6">
            <!-- Status Banner -->
            @if (result().revoked) {
              <!-- REVOKED -->
              <div class="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-6 sm:p-8 text-center">
                <div class="anim-pulse-check inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 mb-4">
                  <svg class="w-8 h-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <h2 class="text-xl font-bold text-orange-800">{{ t('verify.revoked') }}</h2>
                <p class="mt-2 text-sm text-orange-600">{{ t('verify.revokedDesc') }}</p>
              </div>
            } @else {
              <!-- VALID -->
              <div class="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 sm:p-8 text-center">
                <div class="anim-pulse-check inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                  <svg class="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 class="text-xl font-bold text-green-800">{{ t('verify.verified') }}</h2>
                <p class="mt-2 text-sm text-green-600">{{ t('verify.verifiedDesc') }}</p>
              </div>

              <!-- Certificate Details -->
              <div class="anim-fade-up-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
                <h3 class="text-sm font-bold text-slate-900 mb-5 flex items-center gap-2">
                  <svg class="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  {{ t('verify.certificateDetails') }}
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                  <div>
                    <span class="text-slate-400 text-xs uppercase tracking-wider font-semibold">{{ t('verify.certificateCodeLabel') }}</span>
                    <p class="font-mono font-bold text-slate-900 tracking-wider mt-0.5">{{ result().certificateCode }}</p>
                  </div>
                  <div>
                    <span class="text-slate-400 text-xs uppercase tracking-wider font-semibold">{{ t('verify.documentType') }}</span>
                    <p class="font-semibold text-slate-900 mt-0.5">{{ result().documentType }}</p>
                  </div>
                  <div>
                    <span class="text-slate-400 text-xs uppercase tracking-wider font-semibold">{{ t('verify.languages') }}</span>
                    <p class="font-semibold text-slate-900 mt-0.5"><bdi dir="ltr">{{ result().sourceLanguage | translateLang }} &rarr; {{ result().targetLanguage | translateLang }}</bdi></p>
                  </div>
                  <div>
                    <span class="text-slate-400 text-xs uppercase tracking-wider font-semibold">{{ t('verify.translator') }}</span>
                    <p class="font-semibold text-slate-900 mt-0.5">{{ result().translatorName }}</p>
                  </div>
                  <div>
                    <span class="text-slate-400 text-xs uppercase tracking-wider font-semibold">{{ t('verify.pageCount') }}</span>
                    <p class="font-semibold text-slate-900 mt-0.5">{{ result().pageCount }}</p>
                  </div>
                  <div>
                    <span class="text-slate-400 text-xs uppercase tracking-wider font-semibold">{{ t('verify.issuedDate') }}</span>
                    <p class="font-semibold text-slate-900 mt-0.5">{{ formatDate(result().issuedAt) }}</p>
                  </div>
                </div>
              </div>
            }

            <!-- Verify Another -->
            <div class="text-center">
              <button (click)="reset()" class="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
                {{ t('verify.verifyAnother') }}
              </button>
            </div>
          </div>
        }

        <!-- FAILED Result -->
        @if (!verified() && error() && !loading()) {
          <!-- Error is already shown inline above the button -->
        }
      </div>

      <!-- Footer -->
      <footer class="border-t border-slate-200 bg-white/50 py-8 mt-auto">
        <div class="mx-auto max-w-7xl px-4 sm:px-8 text-center">
          <p class="text-sm text-slate-400">&copy; {{ currentYear }} Tarjem. {{ t('verify.allRightsReserved') }}</p>
        </div>
      </footer>

    </div>
  `,
})
export class VerifyComponent {
  private readonly api = inject(ApiService);

  certificateCode = '';
  firstName = '';
  lastName = '';
  loading = signal(false);
  result = signal<any>(null);
  error = signal<string | null>(null);
  verified = signal(false);

  readonly currentYear = new Date().getFullYear();

  verify() {
    if (this.certificateCode.length < 4 || this.firstName.length < 3 || this.lastName.length < 3) {
      this.error.set('Please fill all fields correctly. Certificate code must be at least 4 characters, and names must be exactly 3 letters.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.result.set(null);
    this.verified.set(false);

    this.api.post<any>('/api/v1/verify-certificate', {
      certificateCode: this.certificateCode.toUpperCase().trim(),
      firstName: this.firstName.trim(),
      lastName: this.lastName.trim(),
    }).subscribe({
      next: (res) => {
        this.loading.set(false);
        const data = res.data;
        if (data && data.valid) {
          // Valid certificate
          this.result.set(data);
          this.verified.set(true);
        } else if (data && data.revoked) {
          // Revoked certificate — show revoked card
          this.result.set(data);
          this.verified.set(true);
        } else {
          // Invalid — wrong code or wrong name
          this.error.set(data?.message || 'Verification failed. The certificate code or name does not match.');
          this.verified.set(false);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Verification failed. Please check your information and try again.');
      },
    });
  }

  reset() {
    this.certificateCode = '';
    this.firstName = '';
    this.lastName = '';
    this.result.set(null);
    this.error.set(null);
    this.verified.set(false);
  }

  formatDate(d: string): string {
    if (!d) return '';
    try {
      return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return d;
    }
  }
}
