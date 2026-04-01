import { inject, Pipe, PipeTransform } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

/**
 * Maps a backend language name (e.g. "Arabe", "Francais") to a translated
 * display name using the current UI locale via the `lang.*` translation keys.
 *
 * Usage:  {{ order.sourceLanguage | translateLang }}
 */
const LANG_KEY_MAP: Record<string, string> = {
  'Arabe':     'lang.arabic',
  'Francais':  'lang.french',
  'Anglais':   'lang.english',
  'Espagnol':  'lang.spanish',
  'Allemand':  'lang.german',
  'Italien':   'lang.italian',
  'Turc':      'lang.turkish',
  'Chinois':   'lang.chinese',
  'Portugais': 'lang.portuguese',
  'Russe':     'lang.russian',
};

@Pipe({ name: 'translateLang', standalone: true, pure: false })
export class TranslateLangPipe implements PipeTransform {
  private transloco = inject(TranslocoService);

  transform(value: string | null | undefined): string {
    if (!value) return '';
    const key = LANG_KEY_MAP[value];
    return key ? this.transloco.translate(key) : value;
  }
}
