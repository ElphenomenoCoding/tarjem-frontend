import { isDevMode } from '@angular/core';
import { provideTransloco } from '@jsverse/transloco';
import { TranslocoHttpLoader } from './transloco-loader';

function getSavedLang(): string {
  try {
    const saved = localStorage.getItem('tarjem_lang');
    if (saved && ['ar', 'fr', 'en'].includes(saved)) return saved;
  } catch {}
  return 'fr';
}

export function provideTranslocoConfig() {
  return provideTransloco({
    config: {
      availableLangs: ['ar', 'fr', 'en'],
      defaultLang: getSavedLang(),
      reRenderOnLangChange: true,
      prodMode: !isDevMode(),
      fallbackLang: 'fr',
      missingHandler: {
        useFallbackTranslation: true,
      },
    },
    loader: TranslocoHttpLoader,
  });
}
