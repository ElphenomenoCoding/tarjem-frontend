import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MainLayoutComponent } from '../../../shared/layouts/main-layout/main-layout.component';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { TranslateLangPipe } from '../../../shared/pipes/translate-lang.pipe';

interface ConfigEntry {
  id: number;
  key: string;
  value: string;
  description: string;
  editing?: boolean;
  editValue?: string;
}

interface AdminLanguage {
  id: number;
  code: string;
  name: string;
  countryCode: string;
  isActive: boolean;
}

interface PendingPairRequest {
  id: number;
  translatorId: number;
  translatorName: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: string;
  createdAt: string;
}

@Component({
  selector: 'app-admin-config',
  standalone: true,
  imports: [MainLayoutComponent, TranslocoModule, FormsModule, NgTemplateOutlet, TranslateLangPipe],
  styles: [],
  template: `
    <app-main-layout>
      <div *transloco="let t">
        <h1 class="text-2xl font-bold text-gray-900 mb-6">{{ t('admin.configuration') }}</h1>

        <!-- Tabs -->
        <div class="flex gap-1 mb-6 border-b border-gray-200">
          <button
            (click)="activeTab.set('languages')"
            class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
            [class]="activeTab() === 'languages' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
          >{{ t('langMgmt.tabLanguages') }}</button>
          <button
            (click)="activeTab.set('pricing'); loadPricing()"
            class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer"
            [class]="activeTab() === 'pricing' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
          >{{ t('langMgmt.tabPricing') }}</button>
          <button
            (click)="activeTab.set('config')"
            class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer"
            [class]="activeTab() === 'config' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
          >{{ t('langMgmt.tabConfig') }}</button>
        </div>

        <!-- TAB: Languages -->
        @if (activeTab() === 'languages') {
          <div class="space-y-6">
            <div>
              <h2 class="text-lg font-bold text-gray-900 mb-1">{{ t('langMgmt.title') }}</h2>
              <p class="text-sm text-gray-500 mb-4">{{ t('langMgmt.subtitle') }}</p>
            </div>

            @if (langLoading()) {
              <div class="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">{{ t('common.loading') }}</div>
            } @else {
              <!-- Active Languages -->
              @if (activeLanguages().length > 0) {
                <div>
                  <h3 class="text-sm font-semibold text-gray-700 mb-2">{{ t('langMgmt.activeLangs') }}</h3>
                  <div class="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                    @for (lang of activeLanguages(); track lang.id) {
                      <div class="flex items-center justify-between px-4 py-3">
                        <div class="flex items-center gap-3">
                          <img [src]="'https://flagcdn.com/w40/' + lang.countryCode + '.png'" class="w-6 h-4 rounded-sm object-cover" [alt]="lang.name" />
                          <span class="text-sm font-medium text-gray-900">{{ lang.name | translateLang }}</span>
                          <span class="text-xs text-gray-400 font-mono">{{ lang.code }}</span>
                        </div>
                        <button
                          (click)="toggleLanguage(lang)"
                          [disabled]="togglingLang() === lang.id"
                          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-blue-600"
                        >
                          <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6"></span>
                        </button>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Inactive Languages -->
              @if (inactiveLanguages().length > 0) {
                <div>
                  <h3 class="text-sm font-semibold text-gray-700 mb-2">{{ t('langMgmt.inactiveLangs') }}</h3>
                  <div class="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                    @for (lang of inactiveLanguages(); track lang.id) {
                      <div class="flex items-center justify-between px-4 py-3">
                        <div class="flex items-center gap-3">
                          <img [src]="'https://flagcdn.com/w40/' + lang.countryCode + '.png'" class="w-6 h-4 rounded-sm object-cover opacity-50" [alt]="lang.name" />
                          <span class="text-sm font-medium text-gray-400">{{ lang.name | translateLang }}</span>
                          <span class="text-xs text-gray-300 font-mono">{{ lang.code }}</span>
                        </div>
                        <button
                          (click)="toggleLanguage(lang)"
                          [disabled]="togglingLang() === lang.id"
                          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-gray-300"
                        >
                          <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1"></span>
                        </button>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Pending Pair Requests -->
              <div>
                <h3 class="text-sm font-semibold text-gray-700 mb-2">{{ t('langMgmt.pendingRequests') }}</h3>
                @if (pendingRequests().length === 0) {
                  <div class="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-400">{{ t('langMgmt.noPending') }}</div>
                } @else {
                  <div class="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                    @for (req of pendingRequests(); track req.id) {
                      <div class="flex items-center justify-between px-4 py-3 gap-3">
                        <div class="flex-1 min-w-0">
                          <p class="text-sm font-medium text-gray-900">{{ req.translatorName }}</p>
                          <p class="text-xs text-gray-500"><bdi dir="ltr">{{ req.sourceLanguage | translateLang }} &rarr; {{ req.targetLanguage | translateLang }}</bdi></p>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                          <button
                            (click)="approvePair(req)"
                            [disabled]="actioningPair() === req.id"
                            class="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                          >{{ t('langMgmt.approve') }}</button>
                          <button
                            (click)="rejectPair(req)"
                            [disabled]="actioningPair() === req.id"
                            class="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                          >{{ t('langMgmt.reject') }}</button>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- TAB: Pricing -->
        @if (activeTab() === 'pricing') {
          <div class="space-y-5">
            <!-- Active & configured pairs -->
            @if (activePricingPairs().length > 0) {
              <div class="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div class="px-5 py-3 border-b border-slate-100">
                  <h3 class="text-sm font-bold text-emerald-700">{{ t('langMgmt.configuredPairs') }}</h3>
                </div>
                <div class="divide-y divide-slate-50">
                  @for (pair of activePricingPairs(); track pair.id) {
                    <ng-container *ngTemplateOutlet="pricingRow; context: { $implicit: pair }" />
                  }
                </div>
              </div>
            }

            <!-- Unconfigured pairs (no price) -->
            @if (unconfiguredPricingPairs().length > 0) {
              <div class="rounded-2xl border border-amber-200 bg-amber-50/30 overflow-hidden">
                <div class="px-5 py-3 border-b border-amber-200">
                  <h3 class="text-sm font-bold text-amber-700">{{ t('langMgmt.unconfiguredPairs') }}</h3>
                  <p class="text-[10px] text-amber-500 mt-0.5">{{ t('langMgmt.unconfiguredDesc') }}</p>
                </div>
                <div class="divide-y divide-amber-100/50 bg-white">
                  @for (pair of unconfiguredPricingPairs(); track pair.id) {
                    <ng-container *ngTemplateOutlet="pricingRow; context: { $implicit: pair }" />
                  }
                </div>
              </div>
            }

            <!-- Inactive language pairs -->
            @if (inactivePricingPairs().length > 0) {
              <div class="rounded-2xl border border-slate-200 bg-slate-50/50 overflow-hidden">
                <div class="px-5 py-3 border-b border-slate-200">
                  <h3 class="text-sm font-bold text-slate-400">{{ t('langMgmt.inactivePairs') }}</h3>
                </div>
                <div class="divide-y divide-slate-100 bg-white/50 opacity-60">
                  @for (pair of inactivePricingPairs(); track pair.id) {
                    <ng-container *ngTemplateOutlet="pricingRow; context: { $implicit: pair }" />
                  }
                </div>
              </div>
            }
          </div>

          <ng-template #pricingRow let-pair>
            <div class="flex items-center justify-between px-5 py-3 gap-4">
              <div dir="ltr" class="flex items-center gap-3 shrink-0">
                <div class="flex items-center gap-1.5">
                  @if (pair.fromCountryCode) { <img [src]="'https://flagcdn.com/w40/' + pair.fromCountryCode + '.png'" class="w-5 h-3.5 rounded-sm object-cover" /> }
                  <span class="text-sm font-semibold text-slate-800">{{ pair.fromLanguage | translateLang }}</span>
                </div>
                <svg class="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
                <div class="flex items-center gap-1.5">
                  @if (pair.toCountryCode) { <img [src]="'https://flagcdn.com/w40/' + pair.toCountryCode + '.png'" class="w-5 h-3.5 rounded-sm object-cover" /> }
                  <span class="text-sm font-semibold text-slate-800">{{ pair.toLanguage | translateLang }}</span>
                </div>
              </div>
              <div class="flex items-center gap-4">
                @if (editingPrice() === pair.id) {
                  <div class="flex items-center gap-2">
                    <div class="flex flex-col gap-1">
                      <label class="text-[10px] text-slate-400 font-medium">{{ t('langMgmt.standardPrice') }}</label>
                      <div class="flex items-center gap-1">
                        <input type="number" [(ngModel)]="editPriceValue" class="w-20 px-2 py-1 border border-blue-300 rounded-lg text-sm text-end focus:ring-2 focus:ring-blue-400" min="0" />
                        <span class="text-[10px] text-slate-400">{{ t('common.currency') }}</span>
                      </div>
                    </div>
                    <div class="flex flex-col gap-1">
                      <label class="text-[10px] text-amber-500 font-medium">{{ t('langMgmt.officialPrice') }}</label>
                      <div class="flex items-center gap-1">
                        <input type="number" [(ngModel)]="editOfficialPriceValue" class="w-20 px-2 py-1 border border-amber-300 rounded-lg text-sm text-end focus:ring-2 focus:ring-amber-400" min="0" />
                        <span class="text-[10px] text-slate-400">{{ t('common.currency') }}</span>
                      </div>
                    </div>
                    <button (click)="savePrice(pair.id)" class="px-2.5 py-1 text-[10px] font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer">OK</button>
                    <button (click)="editingPrice.set(null)" class="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer">{{ t('common.cancel') }}</button>
                  </div>
                } @else {
                  <div class="flex items-center gap-4">
                    <div class="text-center">
                      <span class="text-[10px] text-slate-400 block">{{ t('langMgmt.standardPrice') }}</span>
                      @if (pair.configured) {
                        <span class="text-sm font-black text-emerald-600">{{ pair.pricePerPage }}</span>
                      } @else {
                        <span class="text-xs font-bold text-amber-500">{{ t('langMgmt.noPrice') }}</span>
                      }
                      <span class="text-[10px] text-slate-400"> {{ t('common.currencyPerPage') }}</span>
                    </div>
                    <div class="text-center">
                      <span class="text-[10px] text-amber-500 block">{{ t('langMgmt.officialPrice') }}</span>
                      @if (pair.officialPricePerPage) {
                        <span class="text-sm font-black text-amber-600">{{ pair.officialPricePerPage }}</span>
                      } @else {
                        <span class="text-xs font-bold text-amber-500">{{ t('langMgmt.noPrice') }}</span>
                      }
                      <span class="text-[10px] text-slate-400"> {{ t('common.currencyPerPage') }}</span>
                    </div>
                  </div>
                  <button (click)="editingPrice.set(pair.id); editPriceValue = pair.pricePerPage || ''; editOfficialPriceValue = pair.officialPricePerPage || ''" class="p-1 text-slate-400 hover:text-blue-600 cursor-pointer">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
                  </button>
                }
              </div>
            </div>
          </ng-template>
        }

        <!-- TAB: Configuration (existing price configs) -->
        @if (activeTab() === 'config') {
          @if (loading()) {
            <div class="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">{{ t('common.loading') }}</div>
          } @else if (configs().length === 0) {
            <div class="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">{{ t('common.noData') }}</div>
          } @else {
            <!-- Mobile Cards -->
            <div class="sm:hidden space-y-3">
              @for (config of configs(); track config.id) {
                <div class="bg-white rounded-xl border border-gray-200 p-4">
                  <p class="text-sm font-medium text-gray-900">{{ config.key }}</p>
                  @if (config.description) {
                    <p class="text-xs text-gray-400 mt-0.5">{{ config.description }}</p>
                  }
                  @if (config.editing) {
                    <div class="flex gap-2 mt-2">
                      <input
                        type="text"
                        [(ngModel)]="config.editValue"
                        class="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                      <button (click)="saveConfig(config)" [disabled]="saving() === config.id" class="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
                        {{ t('common.save') }}
                      </button>
                      <button (click)="cancelEdit(config)" class="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                        {{ t('common.cancel') }}
                      </button>
                    </div>
                  } @else {
                    <div class="flex justify-between items-center mt-2">
                      <p class="text-sm text-gray-700 font-mono">{{ config.value }}</p>
                      <button (click)="startEdit(config)" class="text-xs text-blue-600 hover:text-blue-700 font-medium">
                        {{ t('common.edit') }}
                      </button>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Desktop Table -->
            <div class="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table class="w-full">
                <thead class="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th class="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">{{ t('admin.configKey') }}</th>
                    <th class="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">{{ t('admin.configValue') }}</th>
                    <th class="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">{{ t('common.description') }}</th>
                    <th class="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">{{ t('admin.actions') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  @for (config of configs(); track config.id) {
                    <tr class="hover:bg-gray-50">
                      <td class="px-4 py-3 text-sm font-medium text-gray-900 font-mono">{{ config.key }}</td>
                      <td class="px-4 py-3">
                        @if (config.editing) {
                          <input
                            type="text"
                            [(ngModel)]="config.editValue"
                            class="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                          />
                        } @else {
                          <span class="text-sm text-gray-700 font-mono">{{ config.value }}</span>
                        }
                      </td>
                      <td class="px-4 py-3 text-sm text-gray-500">{{ config.description }}</td>
                      <td class="px-4 py-3">
                        @if (config.editing) {
                          <div class="flex gap-2">
                            <button (click)="saveConfig(config)" [disabled]="saving() === config.id" class="text-xs text-green-600 hover:text-green-700 font-medium disabled:opacity-50">
                              {{ t('common.save') }}
                            </button>
                            <button (click)="cancelEdit(config)" class="text-xs text-gray-500 hover:text-gray-600 font-medium">
                              {{ t('common.cancel') }}
                            </button>
                          </div>
                        } @else {
                          <button (click)="startEdit(config)" class="text-xs text-blue-600 hover:text-blue-700 font-medium">
                            {{ t('common.edit') }}
                          </button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      </div>
    </app-main-layout>
  `,
})
export class AdminConfigComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  // Tab state
  activeTab = signal<'languages' | 'pricing' | 'config'>('languages');

  // Pricing state
  pricingPairs = signal<any[]>([]);
  editingPrice = signal<string | null>(null);
  editPriceValue = '';
  editOfficialPriceValue = '';
  activePricingPairs = computed(() => this.pricingPairs().filter(p => p.active && p.configured));
  unconfiguredPricingPairs = computed(() => this.pricingPairs().filter(p => p.active && !p.configured));
  inactivePricingPairs = computed(() => this.pricingPairs().filter(p => !p.active));

  // Config state
  loading = signal(true);
  configs = signal<ConfigEntry[]>([]);
  saving = signal<number | null>(null);

  // Language management state
  langLoading = signal(true);
  languages = signal<AdminLanguage[]>([]);
  togglingLang = signal<number | null>(null);
  pendingRequests = signal<PendingPairRequest[]>([]);
  actioningPair = signal<number | null>(null);

  activeLanguages = signal<AdminLanguage[]>([]);
  inactiveLanguages = signal<AdminLanguage[]>([]);

  ngOnInit() {
    this.loadConfigs();
    this.loadLanguages();
    this.loadPendingRequests();
  }

  private loadConfigs() {
    this.api.get<ConfigEntry[]>('/api/v1/admin/config').subscribe({
      next: (res) => {
        this.configs.set((res.data ?? []).map((c) => ({ ...c, editing: false, editValue: c.value })));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadLanguages() {
    this.api.get<AdminLanguage[]>('/api/v1/admin/languages').subscribe({
      next: (res) => {
        const langs = res.data ?? [];
        this.languages.set(langs);
        this.activeLanguages.set(langs.filter(l => l.isActive));
        this.inactiveLanguages.set(langs.filter(l => !l.isActive));
        this.langLoading.set(false);
      },
      error: () => this.langLoading.set(false),
    });
  }

  private loadPendingRequests() {
    this.api.get<PendingPairRequest[]>('/api/v1/admin/languages/pairs/pending').subscribe({
      next: (res) => this.pendingRequests.set(res.data ?? []),
    });
  }

  loadPricing() {
    this.api.get<any[]>('/api/v1/admin/languages/pricing').subscribe({
      next: (res) => this.pricingPairs.set(res.data ?? []),
    });
  }

  savePrice(pairId: string) {
    this.api.patch(`/api/v1/admin/languages/pricing/${pairId}`, { pricePerPage: parseFloat(this.editPriceValue), officialPricePerPage: parseFloat(this.editOfficialPriceValue) }).subscribe({
      next: () => {
        this.editingPrice.set(null);
        this.loadPricing();
        this.toast.success(this.transloco.translate('langMgmt.priceUpdated'));
      },
      error: () => this.toast.error('Error'),
    });
  }

  toggleLanguage(lang: AdminLanguage) {
    this.togglingLang.set(lang.id);
    this.api.patch(`/api/v1/admin/languages/${lang.id}/toggle`, {}).subscribe({
      next: () => {
        this.togglingLang.set(null);
        this.toast.success(this.transloco.translate(lang.isActive ? 'langMgmt.deactivated' : 'langMgmt.activated'));
        this.loadLanguages();
      },
      error: () => this.togglingLang.set(null),
    });
  }

  approvePair(req: PendingPairRequest) {
    this.actioningPair.set(req.id);
    this.api.patch(`/api/v1/admin/languages/pairs/${req.id}/approve`, {}).subscribe({
      next: () => {
        this.actioningPair.set(null);
        this.toast.success(this.transloco.translate('langMgmt.approved'));
        this.loadPendingRequests();
      },
      error: (err: any) => { this.actioningPair.set(null); this.toast.error(err.error?.message || 'Error'); },
    });
  }

  rejectPair(req: PendingPairRequest) {
    this.actioningPair.set(req.id);
    this.api.patch(`/api/v1/admin/languages/pairs/${req.id}/reject`, {}).subscribe({
      next: () => {
        this.actioningPair.set(null);
        this.toast.success(this.transloco.translate('langMgmt.rejected'));
        this.loadPendingRequests();
      },
      error: (err: any) => { this.actioningPair.set(null); this.toast.error(err.error?.message || 'Error'); },
    });
  }

  startEdit(config: ConfigEntry) {
    config.editing = true;
    config.editValue = config.value;
  }

  cancelEdit(config: ConfigEntry) {
    config.editing = false;
    config.editValue = config.value;
  }

  saveConfig(config: ConfigEntry) {
    this.saving.set(config.id);
    this.api.patch(`/api/v1/admin/config/${config.key}`, { value: config.editValue }).subscribe({
      next: () => {
        config.value = config.editValue!;
        config.editing = false;
        this.saving.set(null);
      },
      error: () => this.saving.set(null),
    });
  }
}
