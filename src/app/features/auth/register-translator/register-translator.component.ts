import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { LanguageSwitcherComponent } from '../../../shared/components/language-switcher/language-switcher.component';
import type { SelectOption } from '../../../shared/components/select/select.component';

const WILAYAS: SelectOption[] = [
  { value: '01', label: 'Adrar' }, { value: '02', label: 'Chlef' }, { value: '03', label: 'Laghouat' },
  { value: '04', label: 'Oum El Bouaghi' }, { value: '05', label: 'Batna' }, { value: '06', label: 'Bejaia' },
  { value: '07', label: 'Biskra' }, { value: '08', label: 'Bechar' }, { value: '09', label: 'Blida' },
  { value: '10', label: 'Bouira' }, { value: '11', label: 'Tamanrasset' }, { value: '12', label: 'Tebessa' },
  { value: '13', label: 'Tlemcen' }, { value: '14', label: 'Tiaret' }, { value: '15', label: 'Tizi Ouzou' },
  { value: '16', label: 'Alger' }, { value: '17', label: 'Djelfa' }, { value: '18', label: 'Jijel' },
  { value: '19', label: 'Setif' }, { value: '20', label: 'Saida' }, { value: '21', label: 'Skikda' },
  { value: '22', label: 'Sidi Bel Abbes' }, { value: '23', label: 'Annaba' }, { value: '24', label: 'Guelma' },
  { value: '25', label: 'Constantine' }, { value: '26', label: 'Medea' }, { value: '27', label: 'Mostaganem' },
  { value: '28', label: 'M\'Sila' }, { value: '29', label: 'Mascara' }, { value: '30', label: 'Ouargla' },
  { value: '31', label: 'Oran' }, { value: '32', label: 'El Bayadh' }, { value: '33', label: 'Illizi' },
  { value: '34', label: 'Bordj Bou Arreridj' }, { value: '35', label: 'Boumerdes' }, { value: '36', label: 'El Tarf' },
  { value: '37', label: 'Tindouf' }, { value: '38', label: 'Tissemsilt' }, { value: '39', label: 'El Oued' },
  { value: '40', label: 'Khenchela' }, { value: '41', label: 'Souk Ahras' }, { value: '42', label: 'Tipaza' },
  { value: '43', label: 'Mila' }, { value: '44', label: 'Ain Defla' }, { value: '45', label: 'Naama' },
  { value: '46', label: 'Ain Temouchent' }, { value: '47', label: 'Ghardaia' }, { value: '48', label: 'Relizane' },
  { value: '49', label: 'El M\'Ghair' }, { value: '50', label: 'El Meniaa' }, { value: '51', label: 'Ouled Djellal' },
  { value: '52', label: 'Bordj Badji Mokhtar' }, { value: '53', label: 'Beni Abbes' }, { value: '54', label: 'Timimoun' },
  { value: '55', label: 'Touggourt' }, { value: '56', label: 'Djanet' }, { value: '57', label: 'In Salah' },
  { value: '58', label: 'In Guezzam' },
];

interface SpecOption { value: string; labelKey: string; icon: string; }

const SPECIALIZATIONS: SpecOption[] = [
  { value: 'LEGAL', labelKey: 'auth.specialization.legal', icon: '⚖️' },
  { value: 'MEDICAL', labelKey: 'auth.specialization.medical', icon: '🏥' },
  { value: 'TECHNICAL', labelKey: 'auth.specialization.technical', icon: '⚙️' },
  { value: 'FINANCIAL', labelKey: 'auth.specialization.financial', icon: '💰' },
  { value: 'ACADEMIC', labelKey: 'auth.specialization.academic', icon: '🎓' },
  { value: 'LITERARY', labelKey: 'auth.specialization.literary', icon: '📚' },
  { value: 'ADMINISTRATIVE', labelKey: 'auth.specialization.administrative', icon: '🏛️' },
  { value: 'GENERAL', labelKey: 'auth.specialization.general', icon: '📄' },
];

@Component({
  selector: 'app-register-translator',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslocoModule, LanguageSwitcherComponent],
  styles: [`
    @keyframes fade-up {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.08; }
      50% { transform: translateY(-20px) rotate(5deg); opacity: 0.14; }
    }
    @keyframes shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    .animate-fade-up { animation: fade-up 0.6s ease-out both; }
    .animate-fade-up-delay { animation: fade-up 0.6s ease-out 0.15s both; }
    .floating-shape { animation: float 6s ease-in-out infinite; }
    .floating-shape:nth-child(2) { animation-delay: -2s; animation-duration: 8s; }
    .floating-shape:nth-child(3) { animation-delay: -4s; animation-duration: 7s; }
    .shimmer-text {
      background: linear-gradient(90deg, #1e40af, #3b82f6, #1e40af);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: shimmer 3s linear infinite;
    }
    .input-focus-ring { transition: all 0.2s ease; }
    .input-focus-ring:focus { box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); }
    .btn-glow:not(:disabled):hover { box-shadow: 0 8px 30px rgba(37, 99, 235, 0.35); }
    .glass-card {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }
    .select-styled {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='2' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.75rem center;
      background-size: 1rem;
    }
    [dir="rtl"] .select-styled { background-position: left 0.75rem center; }
    .spec-chip { transition: all 0.2s ease; }
    .spec-chip:hover { transform: translateY(-1px); }
  `],
  template: `
    <div *transloco="let t" class="relative flex min-h-screen overflow-hidden">

      <!-- Background -->
      <div class="absolute inset-0 bg-gradient-to-br from-indigo-50 via-slate-50 to-purple-50">
        <div class="floating-shape absolute top-[10%] left-[15%] w-72 h-72 rounded-full bg-indigo-400/10 blur-3xl"></div>
        <div class="floating-shape absolute top-[60%] right-[10%] w-96 h-96 rounded-full bg-purple-400/10 blur-3xl"></div>
        <div class="floating-shape absolute bottom-[10%] left-[40%] w-64 h-64 rounded-full bg-blue-400/10 blur-3xl"></div>
        <div class="absolute inset-0 opacity-[0.03]"
          style="background-image: radial-gradient(circle, #4f46e5 1px, transparent 1px); background-size: 40px 40px;"></div>
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

      <!-- Left branding -->
      <div class="hidden lg:flex lg:w-5/12 relative items-center justify-center p-12">
        <div class="relative z-10 max-w-md animate-fade-up">
          <div class="mb-8">
            <span class="shimmer-text text-5xl font-black tracking-tight">Tarjem</span>
          </div>
          <h2 class="text-3xl font-bold text-slate-800 leading-tight mb-4">
            {{ t('auth.registerTranslator.brandTitle') }}
          </h2>
          <p class="text-lg text-slate-500 leading-relaxed mb-10">
            {{ t('auth.registerTranslator.brandSubtitle') }}
          </p>

          <div class="space-y-4">
            @for (b of [1,2,3]; track b) {
              <div class="flex items-start gap-3">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                  <svg class="w-4.5 h-4.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <div>
                  <p class="text-sm font-semibold text-slate-800">{{ t('auth.registerTranslator.benefit' + b + '.title') }}</p>
                  <p class="text-sm text-slate-500">{{ t('auth.registerTranslator.benefit' + b + '.desc') }}</p>
                </div>
              </div>
            }
          </div>

          <!-- Pending notice -->
          <div class="mt-10 flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 backdrop-blur-sm px-5 py-4">
            <svg class="mt-0.5 h-5 w-5 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p class="text-sm text-amber-800 font-medium">{{ t('auth.registerTranslator.pendingNotice') }}</p>
          </div>
        </div>
      </div>

      <!-- Right form -->
      <div class="flex w-full lg:w-7/12 items-start justify-center p-4 sm:p-8 relative z-10 pt-20 pb-8">
        <div class="glass-card w-full max-w-[540px] rounded-3xl border border-white/60 p-8 sm:p-10 shadow-2xl shadow-indigo-900/5 animate-fade-up-delay">

          <!-- Mobile logo -->
          <div class="lg:hidden mb-6 text-center">
            <span class="shimmer-text text-3xl font-black tracking-tight">Tarjem</span>
          </div>

          <!-- Header -->
          <div class="mb-6">
            <h1 class="text-2xl font-bold text-slate-900">{{ t('auth.registerTranslator.title') }}</h1>
            <p class="mt-2 text-sm text-slate-500">{{ t('auth.registerTranslator.subtitle') }}</p>
          </div>

          <!-- Mobile pending notice -->
          <div class="lg:hidden mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
            <svg class="mt-0.5 h-5 w-5 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p class="text-sm text-amber-800">{{ t('auth.registerTranslator.pendingNotice') }}</p>
          </div>

          <!-- Steps -->
          <div class="flex items-center gap-2 mb-8">
            @for (step of [1, 2, 3]; track step) {
              <div class="flex items-center gap-2 flex-1">
                <div
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300"
                  [class]="currentStep() >= step
                    ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-400'"
                >
                  @if (currentStep() > step) {
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  } @else {
                    {{ step }}
                  }
                </div>
                <span class="text-xs font-semibold hidden sm:inline transition-colors"
                  [class]="currentStep() >= step ? 'text-slate-700' : 'text-slate-400'">
                  {{ t('auth.registerTranslator.step' + step) }}
                </span>
              </div>
              @if (step < 3) {
                <div class="h-0.5 flex-1 rounded-full transition-colors duration-300"
                  [class]="currentStep() > step ? 'bg-indigo-500' : 'bg-slate-200'"></div>
              }
            }
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()">

            <!-- Step 1: Personal -->
            @if (currentStep() === 1) {
              <div class="space-y-4" style="animation: fade-up 0.4s ease-out both">
                <div class="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">{{ t('auth.firstName') }} <span class="text-red-400">*</span></label>
                    <div class="relative">
                      <div class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5">
                        <svg class="w-4.5 h-4.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                      </div>
                      <input formControlName="firstName" [placeholder]="t('auth.firstNamePlaceholder')"
                        class="input-focus-ring block w-full rounded-xl border border-slate-200 bg-white/80 ps-11 pe-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none"
                        [class.border-red-300]="form.controls.firstName.touched && form.controls.firstName.invalid" />
                    </div>
                    @if (form.controls.firstName.touched && form.controls.firstName.invalid) { <p class="mt-1.5 text-xs text-red-500 font-medium">{{ t('auth.firstNameRequired') }}</p> }
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">{{ t('auth.lastName') }} <span class="text-red-400">*</span></label>
                    <div class="relative">
                      <div class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5">
                        <svg class="w-4.5 h-4.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                      </div>
                      <input formControlName="lastName" [placeholder]="t('auth.lastNamePlaceholder')"
                        class="input-focus-ring block w-full rounded-xl border border-slate-200 bg-white/80 ps-11 pe-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none"
                        [class.border-red-300]="form.controls.lastName.touched && form.controls.lastName.invalid" />
                    </div>
                    @if (form.controls.lastName.touched && form.controls.lastName.invalid) { <p class="mt-1.5 text-xs text-red-500 font-medium">{{ t('auth.lastNameRequired') }}</p> }
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-1.5">{{ t('auth.email') }} <span class="text-red-400">*</span></label>
                  <div class="relative">
                    <div class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5">
                      <svg class="w-4.5 h-4.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                    </div>
                    <input formControlName="email" type="email" [placeholder]="t('auth.emailPlaceholder')"
                      class="input-focus-ring block w-full rounded-xl border border-slate-200 bg-white/80 ps-11 pe-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none"
                      [class.border-red-300]="form.controls.email.touched && form.controls.email.invalid" />
                  </div>
                  @if (form.controls.email.touched && form.controls.email.invalid) { <p class="mt-1.5 text-xs text-red-500 font-medium">{{ t('auth.emailRequired') }}</p> }
                </div>

                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-1.5">{{ t('auth.phone') }} <span class="text-red-400">*</span></label>
                  <div class="relative">
                    <div class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5">
                      <svg class="w-4.5 h-4.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                    </div>
                    <input formControlName="phone" type="tel" [placeholder]="t('auth.phonePlaceholder')"
                      class="input-focus-ring block w-full rounded-xl border border-slate-200 bg-white/80 ps-11 pe-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none"
                      [class.border-red-300]="form.controls.phone.touched && form.controls.phone.invalid" />
                  </div>
                  @if (form.controls.phone.touched && form.controls.phone.invalid) { <p class="mt-1.5 text-xs text-red-500 font-medium">{{ t('auth.phoneRequired') }}</p> }
                </div>

                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-1.5">{{ t('auth.password') }} <span class="text-red-400">*</span></label>
                  <div class="relative">
                    <div class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5">
                      <svg class="w-4.5 h-4.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                    </div>
                    <input formControlName="password" [type]="showPassword() ? 'text' : 'password'" [placeholder]="t('auth.passwordPlaceholder')"
                      class="input-focus-ring block w-full rounded-xl border border-slate-200 bg-white/80 ps-11 pe-11 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none"
                      [class.border-red-300]="form.controls.password.touched && form.controls.password.invalid" />
                    <button type="button" class="absolute inset-y-0 end-0 flex items-center pe-3.5 text-slate-400 hover:text-slate-600 transition-colors" (click)="showPassword.set(!showPassword())">
                      @if (showPassword()) {
                        <svg class="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                      } @else {
                        <svg class="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      }
                    </button>
                  </div>
                  @if (form.controls.password.touched && form.controls.password.invalid) { <p class="mt-1.5 text-xs text-red-500 font-medium">{{ t('auth.passwordMinLength') }}</p> }
                </div>

                <button type="button" (click)="goToStep(2, ['firstName','lastName','email','phone','password'])"
                  class="btn-glow w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3.5 text-sm font-bold text-white transition-all duration-300 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                  {{ t('auth.registerClient.next') }}
                  <svg class="inline-block w-4 h-4 ms-1" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                </button>
              </div>
            }

            <!-- Step 2: Location -->
            @if (currentStep() === 2) {
              <div class="space-y-4" style="animation: fade-up 0.4s ease-out both">
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-1.5">{{ t('auth.wilaya') }} <span class="text-red-400">*</span></label>
                  <div class="relative">
                    <div class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5 z-10">
                      <svg class="w-4.5 h-4.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                    </div>
                    <select formControlName="wilaya"
                      class="select-styled input-focus-ring block w-full appearance-none rounded-xl border border-slate-200 bg-white/80 ps-11 pe-10 py-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none"
                      [class.border-red-300]="form.controls.wilaya.touched && form.controls.wilaya.invalid"
                      [class.text-slate-400]="!form.controls.wilaya.value">
                      <option value="" disabled>{{ t('auth.wilayaPlaceholder') }}</option>
                      @for (w of wilayas; track w.value) { <option [value]="w.value">{{ w.value }} - {{ w.label }}</option> }
                    </select>
                  </div>
                  @if (form.controls.wilaya.touched && form.controls.wilaya.invalid) { <p class="mt-1.5 text-xs text-red-500 font-medium">{{ t('auth.wilayaRequired') }}</p> }
                </div>

                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-1.5">{{ t('auth.address') }}</label>
                  <div class="relative">
                    <div class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5">
                      <svg class="w-4.5 h-4.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
                    </div>
                    <input formControlName="address" [placeholder]="t('auth.addressPlaceholder')"
                      class="input-focus-ring block w-full rounded-xl border border-slate-200 bg-white/80 ps-11 pe-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none" />
                  </div>
                </div>

                <div class="flex gap-3 pt-2">
                  <button type="button" (click)="currentStep.set(1)"
                    class="flex-1 rounded-xl border-2 border-slate-200 bg-white/60 px-6 py-3.5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-white hover:border-slate-300 hover:shadow-md">
                    <svg class="inline-block w-4 h-4 me-1" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
                    {{ t('auth.registerClient.back') }}
                  </button>
                  <button type="button" (click)="goToStep(3, ['wilaya'])"
                    class="btn-glow flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3.5 text-sm font-bold text-white transition-all duration-300 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                    {{ t('auth.registerClient.next') }}
                    <svg class="inline-block w-4 h-4 ms-1" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                  </button>
                </div>
              </div>
            }

            <!-- Step 3: Professional -->
            @if (currentStep() === 3) {
              <div class="space-y-4" style="animation: fade-up 0.4s ease-out both">
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-1.5">{{ t('auth.agrementNumber') }} <span class="text-red-400">*</span></label>
                  <div class="relative">
                    <div class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5">
                      <svg class="w-4.5 h-4.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" /></svg>
                    </div>
                    <input formControlName="agrementNumber" [placeholder]="t('auth.agrementNumberPlaceholder')"
                      class="input-focus-ring block w-full rounded-xl border border-slate-200 bg-white/80 ps-11 pe-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none"
                      [class.border-red-300]="form.controls.agrementNumber.touched && form.controls.agrementNumber.invalid" />
                  </div>
                  @if (form.controls.agrementNumber.touched && form.controls.agrementNumber.invalid) { <p class="mt-1.5 text-xs text-red-500 font-medium">{{ t('auth.agrementNumberRequired') }}</p> }
                </div>

                <!-- Specializations chips -->
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">{{ t('auth.specializations') }} <span class="text-red-400">*</span></label>
                  <div class="grid grid-cols-2 gap-2">
                    @for (spec of specializations; track spec.value) {
                      <button type="button"
                        class="spec-chip flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium text-start transition-all"
                        [class]="isSpecSelected(spec.value)
                          ? 'border-indigo-300 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                          : 'border-slate-200 bg-white/60 text-slate-600 hover:border-slate-300 hover:bg-white'"
                        (click)="toggleSpec(spec.value)">
                        <span class="text-lg leading-none">{{ spec.icon }}</span>
                        <span>{{ t(spec.labelKey) }}</span>
                        @if (isSpecSelected(spec.value)) {
                          <svg class="w-4 h-4 ms-auto text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                        }
                      </button>
                    }
                  </div>
                  @if (form.controls.specializations.touched && form.controls.specializations.invalid) { <p class="mt-1.5 text-xs text-red-500 font-medium">{{ t('auth.specializationsRequired') }}</p> }
                </div>

                <!-- Bio -->
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-1.5">{{ t('auth.bio') }}</label>
                  <textarea formControlName="bio" [placeholder]="t('auth.bioPlaceholder')" rows="3" maxlength="500"
                    class="input-focus-ring block w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none resize-none"></textarea>
                  <p class="mt-1 text-xs text-slate-400 text-end">{{ form.controls.bio.value.length || 0 }}/500</p>
                </div>

                <div class="flex gap-3 pt-2">
                  <button type="button" (click)="currentStep.set(2)"
                    class="flex-1 rounded-xl border-2 border-slate-200 bg-white/60 px-6 py-3.5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-white hover:border-slate-300 hover:shadow-md">
                    <svg class="inline-block w-4 h-4 me-1" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
                    {{ t('auth.registerClient.back') }}
                  </button>
                  <button type="submit" [disabled]="form.invalid || loading()"
                    class="btn-glow flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3.5 text-sm font-bold text-white transition-all duration-300 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none">
                    @if (loading()) {
                      <svg class="animate-spin h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                    } @else {
                      {{ t('auth.registerTranslator.submit') }}
                    }
                  </button>
                </div>
              </div>
            }

          </form>

          <!-- Divider + links -->
          <div class="my-8 flex items-center gap-3">
            <div class="h-px flex-1 bg-slate-200"></div>
            <span class="text-xs font-medium text-slate-400 uppercase tracking-wider">{{ t('auth.login.or') }}</span>
            <div class="h-px flex-1 bg-slate-200"></div>
          </div>

          <div class="space-y-3">
            <a routerLink="/auth/register"
              class="flex items-center justify-center gap-2 w-full rounded-xl border border-slate-200 bg-white/60 px-6 py-3 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-white hover:border-slate-300 hover:shadow-md">
              <svg class="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
              {{ t('auth.registerTranslator.registerClient') }}
            </a>
            <a routerLink="/auth/login"
              class="flex items-center justify-center gap-2 w-full rounded-xl border border-slate-200 bg-white/60 px-6 py-3 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-white hover:border-slate-300 hover:shadow-md">
              <svg class="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
              {{ t('auth.registerTranslator.login') }}
            </a>
          </div>

        </div>
      </div>
    </div>
  `,
})
export class RegisterTranslatorComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  loading = signal(false);
  showPassword = signal(false);
  currentStep = signal(1);

  readonly wilayas = WILAYAS;
  readonly specializations = SPECIALIZATIONS;

  form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^(0[5-7]\d{8})$/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    wilaya: ['', [Validators.required]],
    address: [''],
    agrementNumber: ['', [Validators.required]],
    specializations: [[] as string[], [Validators.required]],
    bio: [''],
  });

  isSpecSelected(value: string): boolean {
    return this.form.controls.specializations.value.includes(value);
  }

  toggleSpec(value: string): void {
    const current = [...this.form.controls.specializations.value];
    const idx = current.indexOf(value);
    if (idx >= 0) { current.splice(idx, 1); } else { current.push(value); }
    this.form.controls.specializations.setValue(current);
    this.form.controls.specializations.markAsTouched();
  }

  goToStep(step: number, fields: string[]): void {
    let valid = true;
    for (const key of fields) {
      const control = (this.form.controls as any)[key];
      control.markAsTouched();
      if (control.invalid) valid = false;
    }
    if (valid) this.currentStep.set(step);
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);

    const formValue = this.form.getRawValue();
    const payload: Record<string, string> = {
      ...formValue,
      specializations: (formValue.specializations).join(','),
    };

    this.authService.registerTranslator(payload).subscribe({
      next: () => {
        this.loading.set(false);
        // Don't auto-login — account is PENDING, clear any stored tokens
        localStorage.removeItem('tarjem_token');
        localStorage.removeItem('tarjem_refresh');
        localStorage.removeItem('tarjem_user');
        this.toast.success(this.transloco.translate('auth.registerTranslator.pendingMessage'));
        this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message || this.transloco.translate('auth.registerTranslator.error'));
      },
    });
  }
}
