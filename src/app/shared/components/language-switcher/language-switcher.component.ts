import { Component, inject, signal, OnInit, input } from '@angular/core';
import { TranslocoService, TranslocoModule } from '@jsverse/transloco';
import { DOCUMENT } from '@angular/common';
import { AnalyticsService } from '../../../core/services/analytics.service';

interface LangOption {
  code: string;
  label: string;
  flag: string;
  dir: 'rtl' | 'ltr';
}

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [TranslocoModule],
  styles: [`
    /* Use fixed CSS properties (not logical) so RTL doesn't move it */
    :host:not(.inline-mode) .lang-fab {
      position: fixed;
      right: 16px;
      bottom: 76px; /* above mobile nav */
      z-index: 60;
    }
    @media (min-width: 768px) {
      :host:not(.inline-mode) .lang-fab { bottom: 20px; }
    }
    .lang-fab {
      transition: all 0.2s ease;
    }
    .lang-fab:hover { transform: scale(1.05); }

    @keyframes dropdown-in {
      from { opacity: 0; transform: translateY(8px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .dropdown-enter { animation: dropdown-in 0.15s ease-out; }
    .flag { width: 20px; height: 14px; border-radius: 2px; object-fit: cover; box-shadow: 0 0 0 0.5px rgba(0,0,0,0.08); }

    /* Dropdown anchored with fixed CSS right, opens upward (FAB mode) */
    :host:not(.inline-mode) .lang-dropdown {
      position: fixed;
      right: 16px;
      z-index: 61;
      bottom: 132px;
    }
    @media (min-width: 768px) {
      :host:not(.inline-mode) .lang-dropdown { bottom: 76px; }
    }
    /* Inline mode: dropdown opens downward relative to button */
    :host.inline-mode { position: relative; display: inline-block; }
    :host.inline-mode .lang-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 4px;
      z-index: 100;
    }
  `],
  host: {
    '[class.inline-mode]': 'inline()',
  },
  template: `
    <!-- Button -->
    <button type="button" (click)="toggleDropdown()" class="lang-fab flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-lg hover:shadow-xl cursor-pointer">
      <img class="flag" [src]="getFlagUrl(activeLang())" [alt]="activeLang()" />
      <span class="text-xs font-bold text-slate-700">{{ activeLang().toUpperCase() }}</span>
      <svg class="w-3 h-3 text-slate-400 transition-transform" [class.rotate-180]="isOpen()" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
      </svg>
    </button>

    <!-- Dropdown -->
    @if (isOpen()) {
      <!-- Backdrop to close (only in FAB mode) -->
      @if (!inline()) {
        <div class="fixed inset-0 z-[60]" (click)="isOpen.set(false)"></div>
      }

      <div class="lang-dropdown dropdown-enter min-w-[150px] rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
        @for (lang of languages; track lang.code) {
          <button type="button" (click)="switchLanguage(lang)"
            class="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors cursor-pointer"
            [class]="activeLang() === lang.code ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'">
            <img class="flag" [src]="getFlagUrl(lang.code)" [alt]="lang.code" />
            <span>{{ lang.label }}</span>
            @if (activeLang() === lang.code) {
              <svg class="w-3.5 h-3.5 ml-auto text-blue-500" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            }
          </button>
        }
      </div>
    }
  `
})
export class LanguageSwitcherComponent implements OnInit {
  private static readonly STORAGE_KEY = 'tarjem_lang';
  private readonly translocoService = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);
  private readonly analytics = inject(AnalyticsService);

  /** Use inline mode (dropdown below button) instead of fixed FAB */
  inline = input(false);

  activeLang = signal(this.translocoService.getActiveLang());
  isOpen = signal(false);

  constructor() {
    // Close inline dropdown on outside click
    this.document.addEventListener('click', (e: Event) => {
      if (this.inline() && this.isOpen()) {
        const host = this.document.querySelector('app-language-switcher.inline-mode');
        if (host && !host.contains(e.target as Node)) {
          this.isOpen.set(false);
        }
      }
    });
  }

  private readonly flagMap: Record<string, string> = { ar: 'dz', fr: 'fr', en: 'gb' };

  readonly languages: LangOption[] = [
    { code: 'fr', label: 'Français', flag: 'fr', dir: 'ltr' },
    { code: 'ar', label: 'العربية', flag: 'dz', dir: 'rtl' },
    { code: 'en', label: 'English', flag: 'gb', dir: 'ltr' },
  ];

  getFlagUrl(langCode: string): string {
    return `https://flagcdn.com/w40/${this.flagMap[langCode] || langCode}.png`;
  }

  ngOnInit(): void { this.applyDir(this.activeLang()); }

  toggleDropdown(): void { this.isOpen.update(v => !v); }

  switchLanguage(lang: LangOption): void {
    this.analytics.track('language_switched', { language: lang.code });
    localStorage.setItem(LanguageSwitcherComponent.STORAGE_KEY, lang.code);
    this.translocoService.setActiveLang(lang.code);
    this.activeLang.set(lang.code);
    this.isOpen.set(false);
    this.applyDir(lang.code);
  }

  private applyDir(code: string): void {
    const lang = this.languages.find(l => l.code === code);
    if (!lang) return;
    const html = this.document.documentElement;
    html.setAttribute('dir', lang.dir);
    html.setAttribute('lang', lang.code);
  }
}
