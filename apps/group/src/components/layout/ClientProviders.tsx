'use client';

import { HistoryTracker } from '@/components/layout/HistoryTracker';
import { Modal } from '@/components/ui/Modal';
import { DepartmentBrowserTab } from '@/components/brand/DepartmentBrowserTab';
import { AppProvider, useApp } from '@/context/AppProvider';
import { AuthProvider } from '@/context/AuthProvider';
import { CartProvider } from '@/context/CartProvider';
import { LanguageProvider } from '@/context/LanguageProvider';
import { ThemeProvider } from '@/context/ThemeProvider';
import type { Locale } from '@/i18n/locales';

function ModalBridge() {
  const { modal, closeModal } = useApp();
  return <Modal modal={modal} onClose={closeModal} />;
}

export function ClientProviders({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  return (
    <ThemeProvider>
      <LanguageProvider initialLocale={initialLocale}>
        <AuthProvider>
          <CartProvider>
            <AppProvider>
              <HistoryTracker />
            <DepartmentBrowserTab />
              {children}
              <ModalBridge />
            </AppProvider>
          </CartProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
