import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MainLayoutComponent } from '../../../shared/layouts/main-layout/main-layout.component';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateLangPipe } from '../../../shared/pipes/translate-lang.pipe';

const WILAYAS: { value: string; label: string }[] = [
  { value: '01', label: 'Adrar' }, { value: '02', label: 'Chlef' }, { value: '03', label: 'Laghouat' },
  { value: '04', label: 'Oum El Bouaghi' }, { value: '05', label: 'Batna' }, { value: '06', label: 'Bejaia' },
  { value: '07', label: 'Biskra' }, { value: '08', label: 'Bechar' }, { value: '09', label: 'Blida' },
  { value: '10', label: 'Bouira' }, { value: '11', label: 'Tamanrasset' }, { value: '12', label: 'Tebessa' },
  { value: '13', label: 'Tlemcen' }, { value: '14', label: 'Tiaret' }, { value: '15', label: 'Tizi Ouzou' },
  { value: '16', label: 'Alger' }, { value: '17', label: 'Djelfa' }, { value: '18', label: 'Jijel' },
  { value: '19', label: 'Setif' }, { value: '20', label: 'Saida' }, { value: '21', label: 'Skikda' },
  { value: '22', label: 'Sidi Bel Abbes' }, { value: '23', label: 'Annaba' }, { value: '24', label: 'Guelma' },
  { value: '25', label: 'Constantine' }, { value: '26', label: 'Medea' }, { value: '27', label: 'Mostaganem' },
  { value: '28', label: "M'Sila" }, { value: '29', label: 'Mascara' }, { value: '30', label: 'Ouargla' },
  { value: '31', label: 'Oran' }, { value: '32', label: 'El Bayadh' }, { value: '33', label: 'Illizi' },
  { value: '34', label: 'Bordj Bou Arreridj' }, { value: '35', label: 'Boumerdes' }, { value: '36', label: 'El Tarf' },
  { value: '37', label: 'Tindouf' }, { value: '38', label: 'Tissemsilt' }, { value: '39', label: 'El Oued' },
  { value: '40', label: 'Khenchela' }, { value: '41', label: 'Souk Ahras' }, { value: '42', label: 'Tipaza' },
  { value: '43', label: 'Mila' }, { value: '44', label: 'Ain Defla' }, { value: '45', label: 'Naama' },
  { value: '46', label: 'Ain Temouchent' }, { value: '47', label: 'Ghardaia' }, { value: '48', label: 'Relizane' },
  { value: '49', label: "El M'Ghair" }, { value: '50', label: 'El Meniaa' }, { value: '51', label: 'Ouled Djellal' },
  { value: '52', label: 'Bordj Badji Mokhtar' }, { value: '53', label: 'Beni Abbes' }, { value: '54', label: 'Timimoun' },
  { value: '55', label: 'Touggourt' }, { value: '56', label: 'Djanet' }, { value: '57', label: 'In Salah' },
  { value: '58', label: 'In Guezzam' },
];

const SPECIALIZATION_OPTIONS = [
  'LEGAL', 'MEDICAL', 'TECHNICAL', 'FINANCIAL', 'ACADEMIC', 'LITERARY', 'ADMINISTRATIVE', 'GENERAL',
];

interface ActiveLanguage { id: string; code: string; name: string; countryCode: string; isActive: boolean; }

interface ProfileData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  wilaya: string;
  address: string;
  preferredLanguage: string;
  role: string;
  status: string;
  agrementNumber: string;
  specializations: string;
  bio: string;
  isVerified: boolean;
  interviewStatus: string;
  completedOrdersCount: number;
  createdAt: string;
}

@Component({
  selector: 'app-translator-profile',
  standalone: true,
  imports: [MainLayoutComponent, TranslocoModule, FormsModule, ConfirmDialogComponent, TranslateLangPipe],
  styles: [`
    .field-disabled { background-color: #f8fafc; color: #64748b; cursor: not-allowed; }
    .card { transition: all 0.3s ease; }
    .card:hover { box-shadow: 0 4px 12px -2px rgba(0,0,0,0.06); }
    @keyframes fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    .anim { animation: fade-up 0.4s ease-out both; }
    .anim-1 { animation-delay: 0.05s; }
    .anim-2 { animation-delay: 0.1s; }
    .anim-3 { animation-delay: 0.15s; }
  `],
  template: `
    <app-main-layout>
      <div *transloco="let t" class="max-w-4xl mx-auto">

        <!-- Header -->
        <div class="anim mb-8">
          <h1 class="text-2xl sm:text-3xl font-bold text-slate-900">{{ t('nav.profile') }}</h1>
          <p class="mt-1 text-sm text-slate-500">{{ t('profile.subtitle') }}</p>
        </div>

        <!-- Status Banner -->
        <div class="anim mb-6 rounded-2xl p-4 flex items-center gap-3"
          [class]="profile().isVerified ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'">
          @if (profile().isVerified) {
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
              <svg class="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z" /></svg>
            </div>
            <div>
              <p class="text-sm font-bold text-emerald-800">{{ t('profile.verified') }}</p>
              <p class="text-xs text-emerald-600">{{ t('profile.verifiedDesc') }}</p>
            </div>
          } @else {
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
              <svg class="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
            </div>
            <div>
              <p class="text-sm font-bold text-amber-800">{{ t('profile.pendingVerification') }}</p>
              <p class="text-xs text-amber-600">{{ t('profile.pendingVerificationDesc') }}</p>
            </div>
          }
        </div>

        <!-- Identity Card (read-only) -->
        <div class="anim anim-1 card rounded-2xl border border-slate-200 bg-white p-6 mb-6">
          <div class="flex items-center gap-2 mb-5">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
              <svg class="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" /></svg>
            </div>
            <h2 class="text-base font-bold text-slate-900">{{ t('profile.identity') }}</h2>
            <span class="ms-auto text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">{{ t('profile.readOnly') }}</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{{ t('profile.firstName') }}</label>
              <div class="field-disabled px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium">{{ profile().firstName }}</div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{{ t('profile.lastName') }}</label>
              <div class="field-disabled px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium">{{ profile().lastName }}</div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{{ t('profile.email') }}</label>
              <div class="field-disabled px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium">{{ profile().email }}</div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{{ t('profile.wilaya') }}</label>
              <div class="field-disabled px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium">{{ wilayaDisplay() }}</div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{{ t('profile.agrementNumber') }}</label>
              <div class="field-disabled px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium">{{ profile().agrementNumber || '---' }}</div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{{ t('profile.memberSince') }}</label>
              <div class="field-disabled px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium">{{ formatDate(profile().createdAt) }}</div>
            </div>
          </div>
        </div>

        <!-- Editable Contact Info -->
        <div class="anim anim-2 card rounded-2xl border border-slate-200 bg-white p-6 mb-6">
          <div class="flex items-center gap-2 mb-5">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
              <svg class="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
            </div>
            <h2 class="text-base font-bold text-slate-900">{{ t('profile.contactInfo') }}</h2>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{{ t('profile.phone') }}</label>
              <input type="tel" [(ngModel)]="phone" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{{ t('profile.address') }}</label>
              <input type="text" [(ngModel)]="address" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" [placeholder]="t('profile.addressPlaceholder')" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{{ t('profile.preferredLanguage') }}</label>
              <select [(ngModel)]="preferredLanguage" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white">
                <option value="fr">Francais</option>
                <option value="ar">Arabe</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Professional Info (bio + specializations) -->
        <div class="anim anim-3 card rounded-2xl border border-slate-200 bg-white p-6 mb-6">
          <div class="flex items-center gap-2 mb-5">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
              <svg class="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" /></svg>
            </div>
            <h2 class="text-base font-bold text-slate-900">{{ t('profile.professionalInfo') }}</h2>
          </div>

          <!-- Bio -->
          <div class="mb-5">
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{{ t('profile.bio') }}</label>
            <textarea [(ngModel)]="bio" rows="4"
              class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
              [placeholder]="t('profile.bioPlaceholder')"></textarea>
            <p class="mt-1 text-xs text-slate-400 text-end">{{ bio.length }}/500</p>
          </div>

          <!-- Specializations -->
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{{ t('profile.specializations') }}</label>
            <div class="flex flex-wrap gap-2">
              @for (spec of allSpecializations; track spec) {
                <button (click)="toggleSpecialization(spec)"
                  class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border transition-all duration-200"
                  [class]="selectedSpecs().includes(spec)
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'">
                  @if (selectedSpecs().includes(spec)) {
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  }
                  {{ t('specialization.' + spec) }}
                </button>
              }
            </div>
          </div>
        </div>

        <!-- Language Pairs -->
        <div class="anim anim-3 card rounded-2xl border border-slate-200 bg-white p-6 mb-6">
          <div class="flex items-center gap-2 mb-5">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
              <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" /></svg>
            </div>
            <h2 class="text-base font-bold text-slate-900">{{ t('profile.languagePairs') }}</h2>
          </div>

          <!-- Current pairs -->
          @if (languagePairs().length > 0) {
            <div class="space-y-2 mb-5">
              @for (pair of languagePairs(); track pair.id) {
                <div class="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div dir="ltr" class="flex items-center gap-3">
                    <div class="flex items-center gap-2">
                      <img [src]="'https://flagcdn.com/w40/' + getCountryCode(pair.sourceLanguage) + '.png'" class="w-5 h-3.5 rounded-sm object-cover" />
                      <span class="text-sm font-semibold text-slate-800">{{ pair.sourceLanguage | translateLang }}</span>
                    </div>
                    <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                    <div class="flex items-center gap-2">
                      <img [src]="'https://flagcdn.com/w40/' + getCountryCode(pair.targetLanguage) + '.png'" class="w-5 h-3.5 rounded-sm object-cover" />
                      <span class="text-sm font-semibold text-slate-800">{{ pair.targetLanguage | translateLang }}</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                      [class]="pair.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : pair.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'">
                      {{ pair.status === 'ACTIVE' ? t('profile.lpActive') : pair.status === 'PENDING' ? t('profile.lpPending') : t('profile.lpRejected') }}
                    </span>
                    @if (pair.status === 'PENDING') {
                      <button (click)="confirmRemovePair(pair)" class="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all" [title]="t('common.delete')">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          } @else {
            <p class="text-sm text-slate-500 mb-5">{{ t('profile.noLanguagePairs') }}</p>
          }

          <!-- Add new pair -->
          @if (!addingPair()) {
            <button (click)="addingPair.set(true)" class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-slate-300 text-sm font-semibold text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-all cursor-pointer">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              {{ t('profile.addLanguagePair') }}
            </button>
          } @else if (!selectedNewSource()) {
            <!-- Step 1: Select source -->
            <div class="p-4 rounded-xl border border-blue-200 bg-blue-50/50">
              <div class="flex items-center justify-between mb-3">
                <p class="text-xs font-semibold text-slate-600">{{ t('newOrder.selectSource') }}</p>
                <button (click)="addingPair.set(false)" class="text-xs text-slate-400 hover:text-red-500 cursor-pointer">{{ t('common.cancel') }}</button>
              </div>
              <div class="flex flex-wrap gap-2">
                @for (lang of availableSourceLangs(); track lang.code) {
                  <button (click)="selectedNewSource.set(lang)" class="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:border-blue-300 transition-all cursor-pointer">
                    <img [src]="'https://flagcdn.com/w40/' + lang.countryCode + '.png'" class="w-5 h-3.5 rounded-sm object-cover" />
                    {{ lang.name | translateLang }}
                  </button>
                }
              </div>
              @if (availableSourceLangs().length === 0) {
                <p class="text-sm text-slate-400 text-center py-2">{{ t('profile.allPairsAdded') }}</p>
              }
            </div>
          } @else {
            <!-- Step 2: Select target -->
            <div class="p-4 rounded-xl border border-blue-200 bg-blue-50/50">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <img [src]="'https://flagcdn.com/w40/' + selectedNewSource()!.countryCode + '.png'" class="w-5 h-3.5 rounded-sm object-cover" />
                  <span class="text-sm font-semibold text-slate-800">{{ selectedNewSource()!.name | translateLang }}</span>
                  <button (click)="selectedNewSource.set(null)" class="text-xs text-slate-400 hover:text-red-500 cursor-pointer">&times;</button>
                </div>
                <button (click)="addingPair.set(false); selectedNewSource.set(null)" class="text-xs text-slate-400 hover:text-red-500 cursor-pointer">{{ t('common.cancel') }}</button>
              </div>
              <p class="text-xs text-slate-500 mb-2">{{ t('newOrder.selectTarget') }}</p>
              <div class="flex flex-wrap gap-2">
                @for (lang of availableTargetLangs(); track lang.code) {
                  <button (click)="requestNewPair(lang)" [disabled]="requestingPair()" class="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:border-blue-300 disabled:opacity-40 transition-all cursor-pointer">
                    <img [src]="'https://flagcdn.com/w40/' + lang.countryCode + '.png'" class="w-5 h-3.5 rounded-sm object-cover" />
                    {{ lang.name | translateLang }}
                  </button>
                }
              </div>
            </div>
          }
          <p class="mt-2 text-xs text-slate-400">{{ t('profile.lpNote') }}</p>
        </div>

        <!-- Save Button -->
        <div class="anim anim-3 flex items-center gap-4 mb-8">
          <button (click)="saveProfile()" [disabled]="saving()"
            class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
            @if (saving()) {
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
            } @else {
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            }
            {{ saving() ? t('common.saving') : t('common.save') }}
          </button>
          @if (saved()) {
            <span class="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {{ t('common.saved') }}
            </span>
          }
        </div>

        <!-- Remove pair confirmation -->
        <app-confirm-dialog
          [isOpen]="showRemoveDialog()"
          [title]="t('profile.removePairTitle')"
          [message]="t('profile.removePairMessage', { source: pairToRemove()?.sourceLanguage, target: pairToRemove()?.targetLanguage })"
          [confirmText]="'common.delete'"
          [cancelText]="'common.cancel'"
          variant="danger"
          [requireCheckbox]="true"
          [checkboxLabel]="t('profile.removePairCheckbox')"
          (confirmed)="executeRemovePair()"
          (cancelled)="showRemoveDialog.set(false)"
        />


      </div>
    </app-main-layout>
  `,
})
export class TranslatorProfileComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  saving = signal(false);
  saved = signal(false);
  profile = signal<ProfileData>({
    id: '', firstName: '', lastName: '', email: '', phone: '', wilaya: '', address: '',
    preferredLanguage: 'fr', role: '', status: '', agrementNumber: '', specializations: '',
    bio: '', isVerified: false, interviewStatus: '', completedOrdersCount: 0, createdAt: '',
  });

  phone = '';
  address = '';
  preferredLanguage = 'fr';
  bio = '';
  selectedSpecs = signal<string[]>([]);
  allSpecializations = SPECIALIZATION_OPTIONS;

  languagePairs = signal<{ id: string; sourceLanguage: string; targetLanguage: string; status: string }[]>([]);
  activeLanguages = signal<ActiveLanguage[]>([]);
  addingPair = signal(false);
  selectedNewSource = signal<ActiveLanguage | null>(null);
  requestingPair = signal(false);

  showRemoveDialog = signal(false);
  pairToRemove = signal<{ id: string; sourceLanguage: string; targetLanguage: string } | null>(null);

  wilayaDisplay = computed(() => {
    const code = this.profile().wilaya;
    const w = WILAYAS.find(w => w.value === code);
    return w ? `${w.value} - ${w.label}` : code || '---';
  });

  ngOnInit() {
    this.api.get<ProfileData>('/api/v1/auth/me').subscribe({
      next: (res) => {
        if (res.data) {
          this.profile.set(res.data);
          this.phone = res.data.phone || '';
          this.address = res.data.address || '';
          this.preferredLanguage = res.data.preferredLanguage || 'fr';
          this.bio = res.data.bio || '';
          this.selectedSpecs.set(
            res.data.specializations ? res.data.specializations.split(',').map(s => s.trim()).filter(Boolean) : []
          );
        }
      },
    });
    this.loadLanguagePairs();
    this.api.get<any[]>('/api/v1/languages').subscribe({
      next: (res) => this.activeLanguages.set(res.data ?? []),
    });
  }

  loadLanguagePairs() {
    this.api.get<{ id: string; sourceLanguage: string; targetLanguage: string; status: string }[]>(
      '/api/v1/translator/language-pairs'
    ).subscribe({
      next: (res) => { if (res.data) this.languagePairs.set(res.data); },
    });
  }

  getCountryCode(langName: string): string {
    return this.activeLanguages().find(l => l.name === langName)?.countryCode ?? '';
  }

  availableSourceLangs(): ActiveLanguage[] {
    const existing = this.languagePairs().map(p => p.sourceLanguage + '\u2192' + p.targetLanguage);
    return this.activeLanguages().filter(lang => {
      return this.activeLanguages().some(target =>
        target.name !== lang.name && !existing.includes(lang.name + '\u2192' + target.name)
      );
    });
  }

  availableTargetLangs(): ActiveLanguage[] {
    const source = this.selectedNewSource();
    if (!source) return [];
    const existing = this.languagePairs().map(p => p.sourceLanguage + '\u2192' + p.targetLanguage);
    return this.activeLanguages().filter(lang =>
      lang.name !== source.name && !existing.includes(source.name + '\u2192' + lang.name)
    );
  }

  requestNewPair(target: ActiveLanguage) {
    const source = this.selectedNewSource();
    if (!source) return;
    this.requestingPair.set(true);
    this.api.post<any>('/api/v1/translator/language-pairs', {
      sourceLanguage: source.name, targetLanguage: target.name
    }).subscribe({
      next: () => {
        this.requestingPair.set(false);
        this.addingPair.set(false);
        this.selectedNewSource.set(null);
        this.loadLanguagePairs();
        this.toast.success(this.transloco.translate('profile.pairRequested'));
      },
      error: (err: HttpErrorResponse) => {
        this.requestingPair.set(false);
        this.toast.error(err.error?.message || 'Error');
      },
    });
  }

  confirmRemovePair(pair: { id: string; sourceLanguage: string; targetLanguage: string }) {
    this.pairToRemove.set(pair);
    this.showRemoveDialog.set(true);
  }

  executeRemovePair() {
    const pair = this.pairToRemove();
    this.showRemoveDialog.set(false);
    this.pairToRemove.set(null);
    if (!pair) return;
    this.api.delete('/api/v1/translator/language-pairs/' + pair.id).subscribe({
      next: () => {
        this.loadLanguagePairs();
        this.toast.success(this.transloco.translate('profile.lpRemoved'));
      },
      error: (err: HttpErrorResponse) => {
        const msg = err.error?.message || this.transloco.translate('common.error');
        this.toast.error(msg);
      },
    });
  }

  toggleSpecialization(spec: string) {
    const current = this.selectedSpecs();
    if (current.includes(spec)) {
      this.selectedSpecs.set(current.filter(s => s !== spec));
    } else {
      this.selectedSpecs.set([...current, spec]);
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '---';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return dateStr; }
  }

  saveProfile() {
    this.saving.set(true);
    this.saved.set(false);
    const body = {
      phone: this.phone,
      address: this.address,
      preferredLanguage: this.preferredLanguage,
      bio: this.bio,
      specializations: this.selectedSpecs().join(','),
    };
    this.api.patch<ProfileData>('/api/v1/auth/me', body).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.saved.set(true);
        if (res.data) this.profile.set(res.data);
        this.toast.success(this.transloco.translate('common.saved'));
        setTimeout(() => this.saved.set(false), 3000);
      },
      error: () => {
        this.saving.set(false);
        this.toast.error(this.transloco.translate('common.error'));
      },
    });
  }
}
