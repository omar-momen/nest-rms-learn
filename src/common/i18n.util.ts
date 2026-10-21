import { I18nContext } from 'nestjs-i18n';

type I18nArgs = Record<string, string>;

export type LocalizedText = {
  en: string;
  ar: string;
};

export function parseLocalizedText(value: unknown): LocalizedText {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('en' in value) ||
    typeof value.en !== 'string' ||
    !('ar' in value) ||
    typeof value.ar !== 'string'
  ) {
    throw new Error('Invalid localized text stored in the database');
  }

  return { en: value.en, ar: value.ar };
}

export type Language = keyof LocalizedText;

/** The request language as used for localized text: `ar-EG` → `ar`, anything else → `en`. */
export function currentLanguage(): Language {
  const lang = (I18nContext.current()?.lang ?? 'en').toLowerCase();
  return lang.startsWith('ar') ? 'ar' : 'en';
}

export function resolveLocalizedText(value: unknown): string {
  return parseLocalizedText(value)[currentLanguage()];
}

export function translateKey(key: string, args?: I18nArgs): string {
  const i18n = I18nContext.current();
  if (!i18n) {
    return key;
  }
  return i18n.t(key, { lang: i18n.lang, args, defaultValue: key });
}

export function translateIssueMessages<
  T extends { message: string; i18nArgs?: I18nArgs },
>(issues: T[]): Omit<T, 'i18nArgs'>[] {
  return issues.map(({ i18nArgs, ...issue }) => ({
    ...issue,
    message: translateKey(issue.message, i18nArgs),
  }));
}
