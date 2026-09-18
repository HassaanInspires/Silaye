'use client';

import * as React from 'react';
import {
  DASHBOARD_I18N,
  NEW_ORDER_I18N,
  POST_BOOKING_I18N,
  CUSTOMERS_I18N,
  ORDERS_QUEUE_I18N,
  type Language,
  type DashboardTranslations,
  type NewOrderTranslations,
  type PostBookingTranslations,
  type CustomersTranslations,
  type OrdersQueueTranslations,
} from './i18n/translations';

export type {
  Language,
  DashboardTranslations,
  NewOrderTranslations,
  PostBookingTranslations,
  CustomersTranslations,
  OrdersQueueTranslations,
};
export const SILAYE_LANGUAGE_KEY = 'silaye_language';
export const SILAYE_LANGUAGE_CHANGED_EVENT = 'silaye:language-changed';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  dir: 'rtl' | 'ltr';
  isMounted: boolean;
  t: DashboardTranslations;
  newOrderT: NewOrderTranslations;
  postBookingT: PostBookingTranslations;
  customersT: CustomersTranslations;
  ordersQueueT: OrdersQueueTranslations;
}


const LanguageContext = React.createContext<LanguageContextType | undefined>(undefined);

export function applyLanguageToDOM(lang: Language) {
  if (typeof document === 'undefined') return;
  const dir = lang === 'ur' ? 'rtl' : 'ltr';
  const root = document.documentElement;
  const body = document.body;

  root.setAttribute('dir', dir);
  root.setAttribute('lang', lang);

  if (body) {
    body.setAttribute('dir', dir);
    body.setAttribute('lang', lang);
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = React.useState<Language>('ur');
  const [isMounted, setIsMounted] = React.useState<boolean>(false);

  React.useEffect(() => {
    setIsMounted(true);
    try {
      const stored = localStorage.getItem(SILAYE_LANGUAGE_KEY) as Language | null;
      const activeLang: Language = stored === 'en' ? 'en' : 'ur';
      setLanguageState(activeLang);
      applyLanguageToDOM(activeLang);
    } catch {
      // Storage access guard
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SILAYE_LANGUAGE_KEY && (e.newValue === 'en' || e.newValue === 'ur')) {
        setLanguageState(e.newValue);
        applyLanguageToDOM(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const setLanguage = React.useCallback((newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(SILAYE_LANGUAGE_KEY, newLang);
      window.dispatchEvent(new CustomEvent(SILAYE_LANGUAGE_CHANGED_EVENT, { detail: newLang }));
    } catch {
      // Storage access guard
    }
    applyLanguageToDOM(newLang);
  }, []);

  const toggleLanguage = React.useCallback(() => {
    setLanguage(language === 'ur' ? 'en' : 'ur');
  }, [language, setLanguage]);

  const dir: 'rtl' | 'ltr' = language === 'ur' ? 'rtl' : 'ltr';
  const t = DASHBOARD_I18N[language] || DASHBOARD_I18N.ur;
  const newOrderT = NEW_ORDER_I18N[language] || NEW_ORDER_I18N.ur;
  const postBookingT = POST_BOOKING_I18N[language] || POST_BOOKING_I18N.ur;
  const customersT = CUSTOMERS_I18N[language] || CUSTOMERS_I18N.ur;
  const ordersQueueT = ORDERS_QUEUE_I18N[language] || ORDERS_QUEUE_I18N.ur;

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        dir,
        isMounted,
        t,
        newOrderT,
        postBookingT,
        customersT,
        ordersQueueT,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = React.useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
