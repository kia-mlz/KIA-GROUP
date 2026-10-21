'use client';

import { BadgePercent, Loader2, ShoppingCart, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { useCart } from '@/context/CartProvider';
import { useLanguage } from '@/context/LanguageProvider';
import { ApiError } from '@/lib/api';

/** Coupon failure reasons the API can return — mapped to localized copy. */
const COUPON_ERROR_CODES = [
  'NOT_FOUND',
  'INACTIVE',
  'NOT_STARTED',
  'EXPIRED',
  'EXHAUSTED',
  'MIN_SUBTOTAL',
  'NOT_APPLICABLE',
  'CART_EMPTY',
  'DISCOUNT_REQUIRED',
] as const;

type CouponErrorCode = (typeof COUPON_ERROR_CODES)[number];

function couponErrorKey(err: unknown): string {
  if (err instanceof ApiError && err.details && typeof err.details === 'object') {
    const code = (err.details as { code?: unknown }).code;
    if (typeof code === 'string' && (COUPON_ERROR_CODES as readonly string[]).includes(code)) {
      return `cart.couponErrors.${code as CouponErrorCode}`;
    }
  }
  return 'cart.couponError';
}

function CartContent() {
  const { t, format } = useLanguage();
  const { cart, loading, error, removeItem, refresh, applyDiscount, removeDiscount } = useCart();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState('');

  const items = cart?.items ?? [];
  const appliedCoupon = cart?.discountCode ?? null;

  const handleApplyCoupon = async (event: FormEvent) => {
    event.preventDefault();
    const code = couponInput.trim();
    if (!code) return;
    setCouponError('');
    setCouponBusy(true);
    try {
      await applyDiscount(code);
      setCouponInput('');
    } catch (err) {
      setCouponError(t(couponErrorKey(err) as 'cart.couponError'));
    } finally {
      setCouponBusy(false);
    }
  };

  const handleRemoveCoupon = async () => {
    setCouponError('');
    setCouponBusy(true);
    try {
      await removeDiscount();
    } catch {
      setCouponError(t('cart.couponError'));
    } finally {
      setCouponBusy(false);
    }
  };

  const handleRemove = async (id: string) => {
    setActionError('');
    setRemovingId(id);
    try {
      await removeItem(id);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : t('cart.removeError'));
      await refresh();
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="page-content">
      <div className="container cart-shell">
        <span className="eyebrow">
          <ShoppingCart size={14} className="inline-leading-icon" />
          {t('nav.cart')}
        </span>
        <h1>{t('cart.title')}</h1>
        <p className="auth-sub">{t('cart.sub')}</p>

        {loading && !cart ? (
          <p className="auth-loading">
            <Loader2 size={18} className="spin" /> {t('common.loading')}
          </p>
        ) : null}

        {(error || actionError) && <p className="form-error">{actionError || error}</p>}

        {!loading && items.length === 0 ? (
          <div className="cart-empty">
            <p>{t('cart.empty')}</p>
            <Link href="/courses" className="cta-primary">
              {t('cart.continue')}
            </Link>
          </div>
        ) : null}

        {items.length > 0 ? (
          <>
            <div className="cart-list">
              {items.map((item) => (
                <article key={item.id} className="cart-item">
                  <span className="cart-item-thumb" aria-hidden="true">
                    {item.thumbnail || '📘'}
                  </span>
                  <div className="cart-item-body">
                    <h3>{item.title}</h3>
                    <p className="cart-item-meta">
                      <span>
                        {t('cart.instructor')}: {item.instructor}
                      </span>
                    </p>
                  </div>
                  <div className="cart-item-prices">
                    {item.discountCents > 0 ? (
                      <span className="price-strike">{format.currency(item.priceCents)}</span>
                    ) : (
                      <span>
                        {t('cart.price')}: {format.currency(item.priceCents)}
                      </span>
                    )}
                    {item.discountCents > 0 ? (
                      <span>
                        {t('cart.discount')}: −{format.currency(item.discountCents)}
                      </span>
                    ) : null}
                    <span className="price-final">
                      {t('cart.finalPrice')}: {format.currency(item.finalPriceCents)}
                    </span>
                  </div>
                  <div className="cart-item-actions">
                    <button
                      type="button"
                      className="btn-outline-full"
                      style={{ width: 'auto', paddingInline: '1rem' }}
                      onClick={() => void handleRemove(item.id)}
                      disabled={removingId === item.id}
                    >
                      {removingId === item.id ? (
                        <Loader2 size={14} className="spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}{' '}
                      {t('cart.remove')}
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="cart-summary glass-panel">
              {appliedCoupon ? (
                <div className="cart-coupon applied">
                  <span className="cart-coupon-tag">
                    <BadgePercent size={16} aria-hidden />
                    <span>{t('cart.couponApplied', { code: appliedCoupon.code })}</span>
                  </span>
                  <button
                    type="button"
                    className="admin-link-btn"
                    onClick={() => void handleRemoveCoupon()}
                    disabled={couponBusy}
                  >
                    <X size={13} aria-hidden /> {t('cart.couponRemove')}
                  </button>
                </div>
              ) : (
                <form className="cart-coupon" onSubmit={handleApplyCoupon}>
                  <label className="cart-coupon-field">
                    <span>{t('cart.couponTitle')}</span>
                    <input
                      className="admin-input ltr-isolate"
                      value={couponInput}
                      onChange={(event) => setCouponInput(event.target.value)}
                      placeholder={t('cart.couponPlaceholder')}
                      autoComplete="off"
                      spellCheck={false}
                      maxLength={40}
                    />
                  </label>
                  <button
                    type="submit"
                    className="btn-outline-full"
                    disabled={couponBusy || !couponInput.trim()}
                  >
                    {couponBusy ? (
                      <Loader2 size={14} className="spin" aria-hidden />
                    ) : (
                      <BadgePercent size={14} aria-hidden />
                    )}{' '}
                    {couponBusy ? t('cart.couponApplying') : t('cart.couponApply')}
                  </button>
                </form>
              )}
              {couponError ? (
                <p className="form-error" role="alert">
                  {couponError}
                </p>
              ) : null}
              <div className="cart-summary-row">
                <span>{t('cart.subtotal')}</span>
                <span className="mono ltr-isolate">{format.currency(cart?.subtotalCents ?? 0)}</span>
              </div>
              {(cart?.discountCents ?? 0) > 0 ? (
                <div className="cart-summary-row">
                  <span>{t('cart.discount')}</span>
                  <span className="mono ltr-isolate">
                    −{format.currency(cart?.discountCents ?? 0)}
                  </span>
                </div>
              ) : null}
              <div className="cart-summary-row total">
                <span>{t('cart.total')}</span>
                <span className="mono ltr-isolate">{format.currency(cart?.totalCents ?? 0)}</span>
              </div>
            </div>

            <div className="cart-actions">
              <Link href="/courses" className="btn-outline-full">
                {t('cart.continue')}
              </Link>
              <Link href="/checkout?from=cart" className="cta-primary">
                {t('cart.checkout')}
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function CartPage() {
  return (
    <RequireAuth nextPath="/cart" learnerFlow>
      <CartContent />
    </RequireAuth>
  );
}
