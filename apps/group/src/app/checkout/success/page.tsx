'use client';

import Link from 'next/link';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/context/AuthProvider';
import { useCart } from '@/context/CartProvider';
import { useLanguage } from '@/context/LanguageProvider';
import type { PaymentResponse } from '@kia./shared';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { refreshSession } = useAuth();
  const { refresh: refreshCart } = useCart();
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [error, setError] = useState('');
  const [payment, setPayment] = useState<PaymentResponse | null>(null);

  const paymentId = searchParams.get('payment_id');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Stripe: webhook completes payment; dev/simulator may still need confirm.
        if (paymentId && !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
          try {
            await api.confirmPayment(paymentId);
          } catch {
            /* may already be confirmed via callback */
          }
        }
        if (paymentId) {
          try {
            const p = await api.getPayment(paymentId);
            if (!cancelled) setPayment(p);
          } catch {
            /* optional */
          }
        }
        await refreshSession();
        await refreshCart();
        if (!cancelled) setStatus('ok');
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setError(err instanceof ApiError ? err.message : t('checkout.success.verifyError'));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [paymentId, refreshSession, refreshCart, t]);

  const primaryHref =
    payment?.productType === 'COURSE'
      ? '/dashboard/my-courses'
      : payment?.productType === 'ROADMAP_BUNDLE'
        ? '/roadmap'
        : '/dashboard/finance#orders';
  const primaryLabel =
    payment?.productType === 'COURSE'
      ? t('checkout.success.goCourses')
      : payment?.productType === 'ROADMAP_BUNDLE'
        ? t('checkout.success.goReadiness')
        : t('checkout.success.goOrders');

  if (status === 'loading') {
    return (
      <div className="page-content auth-loading">
        <Loader2 size={24} className="spin" /> {t('checkout.confirming')}
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="container checkout-result">
        {status === 'ok' ? (
          <>
            <CheckCircle size={48} className="checkout-result-icon ok" />
            <h1>{t('checkout.success.title')}</h1>
            <p className="auth-sub">{t('checkout.success.sub')}</p>
            <div className="checkout-result-actions">
              <button
                type="button"
                className="cta-primary"
                onClick={() => router.push(primaryHref)}
              >
                {primaryLabel}
              </button>
              <Link href="/dashboard/finance#orders" className="cta-secondary">
                {t('checkout.success.goOrders')}
              </Link>
              <Link href="/dashboard" className="cta-secondary">
                {t('checkout.success.dashboard')}
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1>{t('checkout.success.verifyIssue')}</h1>
            <p className="form-error">{error}</p>
            <Link href="/cart" className="cta-primary">
              {t('checkout.success.return')}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function SuccessFallback() {
  const { t } = useLanguage();
  return <div className="page-content auth-loading">{t('common.loading')}</div>;
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<SuccessFallback />}>
      <SuccessContent />
    </Suspense>
  );
}
