import i18n from "i18next";
import {initReactI18next} from "react-i18next";
import es from "./locales/es.json";
import en from "./locales/en.json";

declare module "i18next" {
    interface CustomTypeOptions {
        returnNull: false;
    }
}

/**
 * Language used for the UI. Spanish is the only visible language for now,
 * English (the original Valetudo texts) is used as fallback for missing keys.
 */
export const DEFAULT_LANGUAGE = "es";
export const FALLBACK_LANGUAGE = "en";

/**
 * Locale used for all date, time and number formatting in the UI
 */
export const DISPLAY_LOCALE = "es-ES";

i18n
    .use(initReactI18next)
    .init({
        resources: {
            es: {translation: es},
            en: {translation: en}
        },
        lng: DEFAULT_LANGUAGE,
        fallbackLng: FALLBACK_LANGUAGE,
        returnNull: false,
        initImmediate: false,
        interpolation: {
            escapeValue: false // React already escapes
        },
        react: {
            useSuspense: false
        }
    });

if (typeof document !== "undefined") {
    document.documentElement.lang = DEFAULT_LANGUAGE;
}

export default i18n;

/**
 * Formats a number using the display locale (es-ES)
 *
 * @param {number} value
 * @param {Intl.NumberFormatOptions} [options]
 * @returns {string}
 */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return value.toLocaleString(DISPLAY_LOCALE, options);
}
