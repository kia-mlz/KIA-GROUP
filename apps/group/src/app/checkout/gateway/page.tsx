'use client';

import { CreditCard, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/context/LanguageProvider';
import type { PaymentResponse } from '@kia./shared';

function GatewayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, format } = useLanguage();
  const { refreshSession } = useAuth();
  const paymentId = searchParams.get('payment_id') ?? '';
  const provider = searchParams.get('provider') ?? 'gateway';
  const sandbox = searchParams.get('sandbox') === '1';
  const merchant = searchParams.get('merchant') ?? '';

  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!paymentId) {
      setLoading(false);
      setError(t('checkout.gateway.missing'));
      return;
    }
    let cancelled = false;
    api
      .getPayment(paymentId)
      .then((p) => {
        if (!cancelled) setPayment(p);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : t('checkout.gateway.loadError'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [paymentId, t]);

  const complete = async () => {
    if (!paymentId) return;
    setActing(true);
    setError('');
    try {
      await api.confirmPayment(paymentId);
      await refreshSession();
      router.push(`/checkout/success?payment_id=${encodeURIComponent(paymentId)}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('checkout.failed'));
    } finally {
      setActing(false);
    }
  };

  const providerName = t(`checkout.providers.${provider}` as 'checkout.providers.dev');

  return (
    <div className="page-content">
      <div className="container checkout-shell checkout-gateway">
        <span className="eyebrow amber">
          <CreditCard size={14} className="inline-leading-icon" />
          {t('checkout.gateway.eyebrow')}
        </span>
        <h1>{t('checkout.gateway.title', { provider: providerName })}</h1>
        <p className="auth-sub">{t('checkout.gateway.sub')}</p>

        {sandbox && <p className="checkout-mode-note dev">{t('checkout.gateway.sandbox')}</p>}
        {merchant ? (
          <p className="auth-sub ltr-isolate">
            {t('checkout.gateway.merchant')}: {merchant}
          </p>
        ) : null}

        {loading ? (
          <p className="auth-sub">
            <Loader2 size={16} className="spin" /> {t('common.loading')}
          </p>
        ) : payment ? (
          <div className="checkout-summary" style={{ padding: '1rem' }}>
            <dl className="checkout-summary-list">
              <div>
                <dt>{t('checkout.review.amount')}</dt>
                <dd>
                  <strong>{format.currency(payment.amountCents)}</strong>
                </dd>
              </div>
              <div>
                <dt>{t('checkout.review.product')}</dt>
                <dd>{payment.productType}</dd>
              </div>
              <div>
                <dt>{t('checkout.gateway.paymentId')}</dt>
                <dd className="ltr-isolate">{payment.id}</dd>
              </div>
            </dl>
          </div>
        ) : null}

        {error && <p className="form-error">{error}</p>}

        <div className="checkout-result-actions" style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="cta-primary"
            disabled={!payment || acting || payment?.status === 'COMPLETED'}
            onClick={() => void complete()}
          >
            {acting ? (
              <>
                <Loader2 size={16} className="spin" /> {t('checkout.processing')}
              </>
            ) : (
              t('checkout.gateway.complete')
            )}
          </button>
          <Link href={`/checkout/cancel?payment_id=${encodeURIComponent(paymentId)}`} className="btn-next">
            {t('checkout.gateway.cancel')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutGatewayPage() {
  return (
    <RequireAuth nextPath="/checkout/gateway" learnerFlow>
      <Suspense fallback={<div className="page-content auth-loading">…</div>}>
        <GatewayContent />
      </Suspense>
    </RequireAuth>
  );
}
