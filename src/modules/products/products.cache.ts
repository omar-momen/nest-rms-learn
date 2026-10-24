import { LANGUAGES, type Language } from '@/common/i18n.util';

/** Short enough that a missed invalidation heals itself within a minute. */
export const PRODUCTS_LIST_CACHE_TTL_SECONDS = 60;

/** One entry per language, because category names are localized in the list. */
export function productsListCacheKey(lang: Language): string {
  return `cache:products:list:${lang}`;
}

/** Every language variant: any product or category change makes all of them stale. */
export const PRODUCTS_LIST_CACHE_KEYS = LANGUAGES.map(productsListCacheKey);
