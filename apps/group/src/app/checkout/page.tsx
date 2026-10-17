'use client';

import type { CartResponse } from '@kia./shared';
import { Check, CreditCard, Loader2, ShoppingCart } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { api, ApiError } from '@/lib/api';
import { useApp } from '@/context/AppProvider';
import { useAuth } from '@/context/AuthProvider';
import { useCart } from '@/context/CartProvider';
import { useLanguage } from '@/context/LanguageProvider';
import { useSiteSettings } from '@/hooks/useSiteSettings';

type ProductChoice = 'ROADMAP_BUNDLE' | 'COURSE';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, format } = useLanguage();
  const { refreshSession, learnerState, user } = useAuth();
  const { refresh: refreshCart } = useCart();
  const { roadmap } = useApp();
  const { settings } = useSiteSettings();

  const fromCart = searchParams.get('from') === 'cart';
  const queryProduct = searchParams.get('product');
  const courseSlugs = useMemo(
    () =>
      (searchParams.get('slugs') ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    [searchParams],
  );
  const isCourseCheckout = !fromCart && queryProduct === 'COURSE' && courseSlugs.length > 0;

  const initialProduct: ProductChoice = queryProduct === 'COURSE' ? 'COURSE' : 'ROADMAP_BUNDLE';

  const roadmapId = searchParams.get('roadmapId') ?? roadmap?.id ?? null;
  const [product, setProduct] = useState<ProductChoice>(initialProduct);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [returnProcessing, setReturnProcessing] = useState(false);
  const [cartSummary, setCartSummary] = useState<CartResponse | null>(null);
  const [cartLoading, setCartLoading] = useState(fromCart);
  const [bundlePrice, setBundlePrice] = useState<number | null>(
    roadmap?.id === roadmapId ? (roadmap?.pricing?.discounted ?? null) : null,
  );

  const courseUnitPrice = settings.pricing.courseCents;
  const courseTotal = courseSlugs.length * courseUnitPrice;
  const amount = fromCart
    ? (cartSummary?.totalCents ?? 0)
    : isCourseCheckout
      ? courseTotal
      : (bundlePrice ?? 0);
  const sessionId = searchParams.get('session_id');
  const paymentCfg = settings.payment;
  const providerLabel =
    paymentCfg.displayName.trim() ||
    t(`checkout.providers.${paymentCfg.provider}` as 'checkout.providers.dev');

  useEffect(() => {
    if (!fromCart) return;
    let cancelled = false;
    setCartLoading(true);
    api
      .getCart()
      .then((cart) => {
        if (!cancelled) setCartSummary(cart);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : t('checkout.fromCart.loadError'));
        }
      })
      .finally(() => {
        if (!cancelled) setCartLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromCart, t]);

  useEffect(() => {
    if (fromCart || !roadmapId) {
      if (!fromCart && !roadmapId) setBundlePrice(null);
      return;
    }
    if (roadmap?.id === roadmapId && roadmap.pricing) {
      setBundlePrice(roadmap.pricing.discounted);
      return;
    }
    let cancelled = false;
    api
      .getRoadmap(roadmapId)
      .then((remote) => {
        if (!cancelled) setBundlePrice(remote.pricing.discounted);
      })
      .catch(() => {
        if (!cancelled) setBundlePrice(null);
      });
    return () => {
      cancelled = true;
    };
  }, [fromCart, roadmapId, roadmap]);

  useEffect(() => {
    if (isCourseCheckout) setProduct('COURSE');
  }, [isCourseCheckout]);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    (async () => {
      setReturnProcessing(true);
      setError('');
      try {
        try {
          await api.confirmPayment(sessionId);
        } catch {
          // Stripe webhook may have already completed the payment.
        }
        await refreshSession();
        await refreshCart();
        if (!cancelled) {
          setSuccess(t('checkout.confirmedInline'));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : t('checkout.confirmFailed'));
        }
      } finally {
        if (!cancelled) setReturnProcessing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, refreshSession, refreshCart, t]);

  const handleCheckout = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (fromCart) {
        if (!cartSummary || cartSummary.itemCount === 0) {
          setError(t('checkout.fromCart.empty'));
          return;
        }
        const payment = await api.checkoutCart();
        if (payment.checkoutUrl) {
          window.location.href = payment.checkoutUrl;
          return;
        }
        const confirmed = await api.confirmPayment(payment.id);
        if (confirmed.status === 'COMPLETED') {
          await refreshSession();
          await refreshCart();
          setSuccess(t('checkout.successInline'));
          setTimeout(() => {
            router.push('/dashboard/finance');
          }, 1500);
        } else {
          setError(t('checkout.incomplete'));
        }
        return;
      }

      if (product === 'ROADMAP_BUNDLE' && !roadmapId) {
        setError(t('checkout.missingRoadmap'));
        return;
      }
      if (product === 'COURSE' && courseSlugs.length === 0) {
        setError(t('checkout.missingCourses'));
        return;
      }

      const payment = await api.checkout({
        productType: product,
        productRef: product === 'ROADMAP_BUNDLE' ? (roadmapId ?? undefined) : undefined,
        courseSlugs: product === 'COURSE' ? courseSlugs : undefined,
      });
      if (payment.checkoutUrl) {
        window.location.href = payment.checkoutUrl;
        return;
      }
      const confirmed = await api.confirmPayment(payment.id);
      if (confirmed.status === 'COMPLETED') {
        await refreshSession();
        setSuccess(t('checkout.successInline'));
        setTimeout(() => {
          router.push(product === 'COURSE' ? '/courses' : '/roadmap');
        }, 1500);
      } else {
        setError(t('checkout.incomplete'));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('checkout.failed'));
    } finally {
      setLoading(false);
    }
  };

  const payDisabled =
    loading ||
    returnProcessing ||
    cartLoading ||
    (fromCart
      ? !cartSummary || cartSummary.itemCount === 0
      : !isCourseCheckout && amount <= 0 && !bundlePrice);

  return (
    <div className="page-content">
      <div className="container checkout-shell">
        <span className="eyebrow amber">
          <CreditCard size={14} className="inline-leading-icon" />
          {t('checkout.eyebrow')}
        </span>
        <h1>{t('checkout.review.title')}</h1>
        <p className="auth-sub">{t('checkout.review.sub')}</p>

        {returnProcessing && (
          <p className="auth-sub">
            <Loader2 size={14} className="spin" style={{ display: 'inline' }} />{' '}
            {t('checkout.confirming')}
          </p>
        )}

        {fromCart ? (
          <div className="checkout-card selected highlight" style={{ cursor: 'default' }}>
            <div className="checkout-card-head">
              <span className="ci">
                <ShoppingCart size={22} />
              </span>
              <div>
                <b>{t('checkout.fromCart.title')}</b>
                <span>
                  {cartLoading
                    ? t('common.loading')
                    : t('checkout.fromCart.meta', { count: cartSummary?.itemCount ?? 0 })}
                </span>
              </div>
              <span className="checkout-price">{format.currency(amount)}</span>
            </div>
            {cartSummary && cartSummary.items.length > 0 ? (
              <ul className="checkout-features">
                {cartSummary.items.map((item) => (
                  <li key={item.id}>
                    <Check size={14} /> {item.title} — {format.currency(item.finalPriceCents)}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="checkout-card selected highlight" style={{ cursor: 'default' }}>
            <div className="checkout-card-head">
              <span className="ci">{isCourseCheckout ? '📘' : '🗺️'}</span>
              <div>
                <b>
                  {isCourseCheckout
                    ? t('checkout.courses.selected', { count: courseSlugs.length })
                    : t('checkout.bundle.title')}
                </b>
                <span>
                  {isCourseCheckout ? courseSlugs.join(' · ') : t('checkout.bundle.meta')}
                </span>
              </div>
              <span className="checkout-price">{format.currency(amount)}</span>
            </div>
            <ul className="checkout-features">
              {isCourseCheckout ? (
                <>
                  <li>
                    <Check size={14} /> {t('checkout.courses.feature1')}
                  </li>
                  <li>
                    <Check size={14} /> {t('checkout.courses.feature2')}
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Check size={14} /> {t('checkout.bundle.feature1')}
                  </li>
                  <li>
                    <Check size={14} /> {t('checkout.bundle.feature2')}
                  </li>
                  <li>
                    <Check size={14} /> {t('checkout.bundle.feature3')}
                  </li>
                </>
              )}
            </ul>
            {!isCourseCheckout && learnerState?.roadmapEnrolled && (
              <span className="checkout-owned">{t('checkout.bundle.owned')}</span>
            )}
          </div>
        )}

        <div className="checkout-summary glass-panel" style={{ marginTop: '1rem', padding: '1rem' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>{t('checkout.review.details')}</h2>
          <dl className="checkout-summary-list">
            <div>
              <dt>{t('checkout.review.buyer')}</dt>
              <dd>{user?.name || '—'}</dd>
            </div>
            <div>
              <dt>{t('checkout.review.email')}</dt>
              <dd className="ltr-isolate">{user?.email || user?.phone || '—'}</dd>
            </div>
            <div>
              <dt>{t('checkout.review.product')}</dt>
              <dd>
                {fromCart
                  ? t('checkout.fromCart.title')
                  : isCourseCheckout
                    ? t('checkout.courses.title')
                    : t('checkout.bundle.title')}
              </dd>
            </div>
            <div>
              <dt>{t('checkout.review.amount')}</dt>
              <dd>
                <strong>{format.currency(amount)}</strong>
              </dd>
            </div>
            <div>
              <dt>{t('checkout.review.provider')}</dt>
              <dd>{providerLabel}</dd>
            </div>
          </dl>
          <p className="auth-sub" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
            {paymentCfg.provider === 'dev'
              ? t('checkout.review.devHint')
              : t('checkout.review.gatewayHint')}
          </p>
        </div>

        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">{success}</p>}

        <button
          type="button"
          className="cta-primary checkout-pay"
          onClick={handleCheckout}
          disabled={payDisabled}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="spin" /> {t('checkout.processing')}
            </>
          ) : (
            <>{t('checkout.payFinal')}</>
          )}
        </button>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <RequireAuth nextPath="/checkout" learnerFlow>
      <Suspense fallback={<CheckoutFallback />}>
        <CheckoutContent />
      </Suspense>
    </RequireAuth>
  );
}

function CheckoutFallback() {
  const { t } = useLanguage();
  return <div className="page-content auth-loading">{t('common.loading')}</div>;
}
