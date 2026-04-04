import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MainLayoutComponent } from '../../../shared/layouts/main-layout/main-layout.component';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { HttpErrorResponse } from '@angular/common/http';
import { AnalyticsService } from '../../../core/services/analytics.service';

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
  createdAt: string;
  profilePicUrl?: string;
}

@Component({
  selector: 'app-client-profile',
  standalone: true,
  imports: [MainLayoutComponent, TranslocoModule, FormsModule],
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
          <p class="mt-1 text-sm text-slate-500">{{ t('profile.clientSubtitle') }}</p>
        </div>

        <!-- Identity (read-only) -->
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
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{{ t('profile.memberSince') }}</label>
              <div class="field-disabled px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium">{{ formatDate(profile().createdAt) }}</div>
            </div>
          </div>
        </div>

        <!-- Contact Info (editable) -->
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
              <input type="tel" [(ngModel)]="phone"
                class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{{ t('profile.address') }}</label>
              <input type="text" [(ngModel)]="address"
                class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                [placeholder]="t('profile.addressPlaceholder')" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{{ t('profile.preferredLanguage') }}</label>
              <select [(ngModel)]="preferredLanguage"
                class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white">
                <option value="fr">Francais</option>
                <option value="ar">Arabe</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
          <div class="mt-5 flex items-center gap-4">
            <button (click)="saveProfile()" [disabled]="saving()"
              class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
              @if (saving()) {
                <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
              }
              {{ saving() ? t('common.saving') : t('common.save') }}
            </button>
            @if (profileSaved()) {
              <span class="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {{ t('common.saved') }}
              </span>
            }
          </div>
        </div>

        <!-- Change Password -->
        <div class="anim anim-3 card rounded-2xl border border-slate-200 bg-white p-6 mb-8">
          <div class="flex items-center gap-2 mb-5">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
              <svg class="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
            </div>
            <h2 class="text-base font-bold text-slate-900">{{ t('profile.changePassword') }}</h2>
          </div>

          <!-- Password error -->
          @if (passwordError()) {
            <div class="mb-4 rounded-xl bg-red-50 border border-red-200 p-3.5 flex items-start gap-2.5">
              <svg class="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
              <p class="text-sm text-red-700">{{ passwordError() }}</p>
            </div>
          }

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <div class="sm:col-span-2">
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{{ t('profile.currentPassword') }}</label>
              <input type="password" [(ngModel)]="currentPassword"
                class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                [placeholder]="t('profile.currentPasswordPlaceholder')" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{{ t('profile.newPassword') }}</label>
              <input type="password" [(ngModel)]="newPassword"
                class="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                [class]="newPassword && newPassword.length < 8 ? 'border-red-300' : 'border-slate-200'"
                [placeholder]="t('profile.newPasswordPlaceholder')" />
              @if (newPassword && newPassword.length < 8) {
                <p class="mt-1 text-xs text-red-500">{{ t('profile.passwordMinLength') }}</p>
              }
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{{ t('profile.confirmPassword') }}</label>
              <input type="password" [(ngModel)]="confirmPassword"
                class="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                [class]="confirmPassword && confirmPassword !== newPassword ? 'border-red-300' : 'border-slate-200'"
                [placeholder]="t('profile.confirmPasswordPlaceholder')" />
              @if (confirmPassword && confirmPassword !== newPassword) {
                <p class="mt-1 text-xs text-red-500">{{ t('profile.passwordMismatch') }}</p>
              }
            </div>
          </div>
          <div class="mt-5 flex items-center gap-4">
            <button (click)="changePassword()" [disabled]="!canChangePassword()"
              class="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all duration-200 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed">
              @if (changingPassword()) {
                <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
              } @else {
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
              }
              {{ changingPassword() ? t('common.saving') : t('profile.changePassword') }}
            </button>
          </div>
        </div>

      </div>
    </app-main-layout>
  `,
})
export class ClientProfileComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly analytics = inject(AnalyticsService);

  saving = signal(false);
  profileSaved = signal(false);
  changingPassword = signal(false);
  passwordError = signal('');
  profile = signal<ProfileData>({
    id: '', firstName: '', lastName: '', email: '', phone: '', wilaya: '', address: '',
    preferredLanguage: 'fr', role: '', status: '', createdAt: '',
  });

  phone = '';
  address = '';
  preferredLanguage = 'fr';
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  wilayaDisplay = computed(() => {
    const code = this.profile().wilaya;
    const w = WILAYAS.find(w => w.value === code);
    return w ? `${w.value} - ${w.label}` : code || '---';
  });

  canChangePassword(): boolean {
    return !this.changingPassword()
      && !!this.currentPassword
      && !!this.newPassword
      && this.newPassword.length >= 8
      && this.newPassword === this.confirmPassword
      && this.newPassword !== this.currentPassword;
  }

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    this.api.get<ProfileData>('/api/v1/auth/me').subscribe({
      next: (res) => {
        if (res.data) {
          this.profile.set(res.data);
          this.phone = res.data.phone || '';
          this.address = res.data.address || '';
          this.preferredLanguage = res.data.preferredLanguage || 'fr';
        }
      },
    });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '---';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return dateStr; }
  }

  saveProfile() {
    this.saving.set(true);
    this.profileSaved.set(false);
    this.api.patch<ProfileData>('/api/v1/auth/me', {
      phone: this.phone,
      address: this.address,
      preferredLanguage: this.preferredLanguage,
    }).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.profileSaved.set(true);
        if (res.data) this.profile.set(res.data);
        this.toast.success(this.transloco.translate('common.saved'));
        this.analytics.track('profile_saved', { role: 'client' });
        setTimeout(() => this.profileSaved.set(false), 3000);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.toast.error(err.error?.message || this.transloco.translate('common.error'));
      },
    });
  }

  changePassword() {
    if (!this.canChangePassword()) return;

    this.changingPassword.set(true);
    this.passwordError.set('');

    this.api.patch('/api/v1/auth/me/password', {
      currentPassword: this.currentPassword,
      newPassword: this.newPassword,
    }).subscribe({
      next: () => {
        this.changingPassword.set(false);
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.toast.success(this.transloco.translate('profile.passwordChanged'));
        this.analytics.track('password_changed', { role: 'client' });
      },
      error: (err: HttpErrorResponse) => {
        this.changingPassword.set(false);
        const msg = err.error?.message || this.transloco.translate('common.error');
        this.passwordError.set(this.translateError(msg));
      },
    });
  }

  private translateError(msg: string): string {
    const map: Record<string, string> = {
      'Current password is incorrect': this.transloco.translate('profile.errorWrongPassword'),
      'New password must be different from current password': this.transloco.translate('profile.errorSamePassword'),
      'New password must be at least 8 characters': this.transloco.translate('profile.passwordMinLength'),
    };
    return map[msg] || msg;
  }
}
