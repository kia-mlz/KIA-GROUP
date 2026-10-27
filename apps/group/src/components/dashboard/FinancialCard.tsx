'use client';

import type { WalletSummary } from '@kia./shared';
import { CreditCard, TrendingDown, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';
import { CardShell } from './CardShell';

function toToman(irr: number) {
  return Math.round(Math.abs(irr) / 10);
}

export function FinancialCard() {
  const { t, format } = useLanguage();
  const [data, setData] = useState<WalletSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTx, setShowTx] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const summary = await api.getWallet(5);
      setData(summary);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('dashboard.financial.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <CardShell
      title={t('dashboard.financial.title')}
      icon={CreditCard}
      span={2}
      isLoading={loading}
      error={error}
      onRetry={load}
      cta={
        <button
          type="button"
          className="dash-btn-ghost"
          onClick={() => setShowTx((v) => !v)}
          aria-expanded={showTx}
        >
          {showTx ? t('dashboard.financial.hide') : t('dashboard.financial.viewAll')}
        </button>
      }
    >
      {data ? (
        <>
          <div className="dash-bank-card">
            <div className="dash-bank-card__glow" aria-hidden="true" />
            <div className="dash-bank-card__top">
              <span>Kia</span>
              <span>{t('dashboard.financial.cardLabel')}</span>
            </div>
            <div className="dash-bank-card__balance mono ltr-isolate">
              {format.number(toToman(data.balanceCents))}
            </div>
            <div className="dash-bank-card__unit">{t('dashboard.financial.balanceUnit')}</div>
            <div className="dash-bank-card__bottom">
              <span className="mono ltr-isolate">
                **** **** **** {format.number(Number(data.cardLast4))}
              </span>
              <span>{data.expiresLabel}</span>
            </div>
          </div>

          {showTx ? (
            <div className="dash-tx-list">
              <p className="dash-section-label">{t('dashboard.financial.recent')}</p>
              {data.transactions.length === 0 ? (
                <p className="dash-muted">{t('panel.finance.empty')}</p>
              ) : (
                data.transactions.map((tx) => (
                  <div key={tx.id} className="dash-tx-row">
                    <div
                      className={`dash-tx-icon ${tx.type === 'credit' ? 'is-credit' : 'is-debit'}`}
                    >
                      {tx.type === 'credit' ? (
                        <TrendingUp size={13} aria-hidden="true" />
                      ) : (
                        <TrendingDown size={13} aria-hidden="true" />
                      )}
                    </div>
                    <div className="dash-tx-main">
                      <div>{tx.description}</div>
                      <span>{format.date(tx.createdAt)}</span>
                    </div>
                    <div
                      className={`dash-tx-amount mono ltr-isolate ${tx.type === 'credit' ? 'is-credit' : 'is-debit'}`}
                    >
                      {tx.type === 'credit' ? '+' : '-'}
                      {format.number(toToman(tx.amountCents))}
                    </div>
                  </div>
                ))
              )}
              <Link href="/dashboard/finance" className="dash-link-footer">
                {t('dashboard.financial.openFinance')}
              </Link>
            </div>
          ) : null}
        </>
      ) : null}
    </CardShell>
  );
}
