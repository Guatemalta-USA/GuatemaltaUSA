import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import {resources} from './translations';

i18n
  .use(LanguageDetector)
  .init({
    resources,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  }, (err: any) => {
    if (err) return console.error(err);
    updateContent();
  });

type TranslationKey = keyof typeof resources['en']['translation'];

export function updateContent() {
    const currentLang = (document.documentElement.lang as 'en' | 'es') || 'en';

    // 1. Static UI elements using data-i18n dictionary keys
    const elementsToTranslate = document.querySelectorAll('[data-i18n]');
    elementsToTranslate.forEach(element => {
        const key = element.getAttribute('data-i18n') as TranslationKey | null;
        if (key && resources[currentLang]?.translation?.[key]) {
            element.textContent = resources[currentLang].translation[key];
        }
    });

    // 2. Elements with placeholder attributes (e.g., input fields, textareas)
    const placeholdersToTranslate = document.querySelectorAll('[data-i18n-placeholder]');
    placeholdersToTranslate.forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder') as TranslationKey | null;
        if (key && resources[currentLang]?.translation?.[key]) {
            element.setAttribute('placeholder', resources[currentLang].translation[key]);
        }
    });

    // 3. Dynamic content titles (Projects, Posts, etc.) using direct localized string attributes
    const dynamicTitles = document.querySelectorAll('[data-title-en]');
    dynamicTitles.forEach(element => {
        const titleEn = element.getAttribute('data-title-en');
        const titleEs = element.getAttribute('data-title-es');
        
        if (currentLang === 'es' && titleEs) {
            element.textContent = titleEs;
        } else if (titleEn) {
            element.textContent = titleEn;
        }
    });

    // 4. Dynamic content body excerpts using direct localized string attributes
    const dynamicExcerpts = document.querySelectorAll('[data-excerpt-en]');
    dynamicExcerpts.forEach(element => {
        const excerptEn = element.getAttribute('data-excerpt-en');
        const excerptEs = element.getAttribute('data-excerpt-es');
        
        if (currentLang === 'es' && excerptEs) {
            element.textContent = excerptEs;
        } else if (excerptEn) {
            element.textContent = excerptEn;
        }
    });
}

export function getResolvedLanguage(): string | undefined {
  return i18n.resolvedLanguage;
}

export default i18n;