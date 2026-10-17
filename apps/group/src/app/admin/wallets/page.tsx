'use client';

import type { AdminWalletDetail, AdminWalletSummary } from '@kia./shared';
import { Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';
import {
  AdminSortHeader,
  AdminTableToolbar,
  sortRows,
  type SortState,
} from '@/components/admin/AdminPro';

export default function AdminWalletsPage() {
  const { t, format } = useLanguage();
  const [wallets, setWallets] = useState<AdminWalletSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<AdminWalletDetail | null>(null);
  const [type, setType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState>(null);

  useEffect(() => {
    api
      .adminListWallets()
      .then(setWallets)
      .catch((err) => setError(err instanceof ApiError ? err.message : t('admin.wallets.error')))
      .finally(() => setLoading(false));
  }, [t]);

  const filtered = (() => {
    const q = search.trim().toLowerCase();
    const rows = q
      ? wallets.filter(
          (wallet) =>
            wallet.userName.toLowerCase().includes(q) ||
            (wallet.userEmail ?? '').toLowerCase().includes(q),
        )
      : wallets;
    return sortRows(rows, sort, {
      user: (row) => row.userName,
      balance: (row) => row.balanceCents,
      txns: (row) => row.transactionCount,
      lastTxn: (row) => row.lastTransactionAt ?? '',
    });
  })();

  const openDetail = async (userId: string) => {
    setError('');
    setSaved('');
    try {
      const next = await api.adminGetWallet(userId);
      setDetail(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.wallets.error'));
    }
  };

  const adjust = async () => {
    if (!detail || !amount.trim() || !description.trim()) return;
    const amountCents = Number(amount.replace(/[^\d]/g, ''));
    if (!Number.isFinite(amountCents) || amountCents <= 0) return;
    setBusy(true);
    setSaved('');
    setError('');
    try {
      const next = await api.adminAdjustWallet(detail.userId, {
        type,
        amountCents,
        description: description.trim(),
      });
      setDetail(next);
      setWallets((prev) =>
        prev.map((wallet) =>
          wallet.userId === next.userId
            ? {
                ...wallet,
                balanceCents: next.balanceCents,
                transactionCount: next.transactionCount,
                lastTransactionAt: next.lastTransactionAt,
              }
            : wallet,
        ),
      );
      setAmount('');
      setDescription('');
      setSaved(t('admin.wallets.adjusted'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.wallets.error'));
    } finally {
      setBusy(false);
    }
  };

  const totalBalance = wallets.reduce((acc, wallet) => acc + wallet.balanceCents, 0);
  const onSort = (key: string) => {
    setSort((prev) =>
      prev?.key === key ? (prev.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' },
    );
  };

  if (loading) {
    return (
      <div className="admin-content auth-loading">
        <Loader2 size={24} className="spin" /> {t('admin.wallets.loading')}
      </div>
    );
  }

  return (
    <div className="admin-content">
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="form-success" role="status">
          {saved}
        </p>
      ) : null}

      {/* Summary strip */}
      <div className="admin-stat-grid">
        <div className="admin-stat-card highlight">
          <div className="admin-stat-row">
            <div>
              <span className="admin-stat-label">{t('admin.pro.balance')}</span>
              <div className="admin-stat-value">{format.currency(totalBalance)}</div>
            </div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-row">
            <div>
              <span className="admin-stat-label">{t('admin.wallets.title')}</span>
              <div className="admin-stat-value">{format.number(wallets.length)}</div>
            </div>
          </div>
        </div>
      </div>

      <article className="admin-card">
        <div className="admin-section-head">
          <div>
            <h2>{t('admin.wallets.title')}</h2>
            <p>{t('admin.wallets.sub')}</p>
          </div>
        </div>

        <AdminTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchLabel={t('admin.pro.search')}
          searchPlaceholder={t('admin.pro.searchPlaceholder')}
        />

        <div className="admin-table-wrap" style={{ marginBottom: 0 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <AdminSortHeader
                  label={t('admin.wallets.col.user')}
                  sortKey="user"
                  sort={sort}
                  onSort={onSort}
                />
                <AdminSortHeader
                  label={t('admin.wallets.col.balance')}
                  sortKey="balance"
                  sort={sort}
                  onSort={onSort}
                />
                <AdminSortHeader
                  label={t('admin.wallets.col.txns')}
                  sortKey="txns"
                  sort={sort}
                  onSort={onSort}
                />
                <AdminSortHeader
                  label={t('admin.wallets.col.lastTxn')}
                  sortKey="lastTxn"
                  sort={sort}
                  onSort={onSort}
                />
                <th>
                  <span className="sr-only">{t('admin.wallets.manage')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    {wallets.length === 0 ? t('admin.wallets.empty') : t('admin.pro.emptyFiltered')}
                  </td>
                </tr>
              ) : (
                filtered.map((wallet) => (
                  <tr key={wallet.userId}>
                    <td>
                      <div>{wallet.userName}</div>
                      <div className="ltr-isolate admin-cell-meta">{wallet.userEmail}</div>
                    </td>
                    <td className="apro-num">{format.currency(wallet.balanceCents)}</td>
                    <td>{format.number(wallet.transactionCount)}</td>
                    <td>
                      {wallet.lastTransactionAt ? format.date(wallet.lastTransactionAt) : '—'}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="pill-btn pro-accent"
                        onClick={() => void openDetail(wallet.userId)}
                      >
                        {t('admin.wallets.manage')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      {detail ? (
        <article className="admin-card" style={{ marginTop: '1.25rem' }}>
          <div className="admin-section-head">
            <div>
              <h2>
                {t('admin.wallets.detailTitle')} — {detail.userName}
              </h2>
              <p>
                {t('admin.wallets.balance')}: <strong>{format.currency(detail.balanceCents)}</strong>
              </p>
            </div>
            <button
              type="button"
              className="admin-icon-button"
              aria-label={t('common.cancel')}
              onClick={() => {
                setDetail(null);
                setSaved('');
              }}
            >
              <X size={14} aria-hidden />
            </button>
          </div>

          <div className="apro-form-grid" style={{ maxWidth: 860 }}>
            <label className="apro-field">
              <span className="admin-sub">{t('admin.wallets.type')}</span>
              <select
                className="admin-input"
                value={type}
                onChange={(e) => setType(e.target.value as 'CREDIT' | 'DEBIT')}
              >
                <option value="CREDIT">{t('admin.wallets.credit')}</option>
                <option value="DEBIT">{t('admin.wallets.debit')}</option>
              </select>
            </label>
            <label className="apro-field">
              <span className="admin-sub">{t('admin.wallets.amount')}</span>
              <input
                className="admin-input ltr-isolate"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label className="apro-field apro-field-wide">
              <span className="admin-sub">{t('admin.wallets.description')}</span>
              <input
                className="admin-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <div className="apro-field" style={{ justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="cta-primary"
                onClick={() => void adjust()}
                disabled={busy || !amount.trim() || !description.trim()}
              >
                {busy ? <Loader2 size={16} className="spin" /> : null} {t('admin.wallets.apply')}
              </button>
            </div>
          </div>

          <div className="admin-table-wrap" style={{ marginTop: '1rem' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.wallets.col.txnType')}</th>
                  <th>{t('admin.wallets.col.txnAmount')}</th>
                  <th>{t('admin.wallets.col.txnDesc')}</th>
                  <th>{t('admin.wallets.col.txnDate')}</th>
                </tr>
              </thead>
              <tbody>
                {detail.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={4}>{t('admin.wallets.noTxns')}</td>
                  </tr>
                ) : (
                  detail.transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>
                        {transaction.type === 'CREDIT' ? (
                          <span className="admin-badge ok">
                            <span className="apro-dot" aria-hidden="true" />
                            {t('admin.wallets.credit')}
                          </span>
                        ) : (
                          <span className="admin-badge danger">
                            <span className="apro-dot" aria-hidden="true" />
                            {t('admin.wallets.debit')}
                          </span>
                        )}
                      </td>
                      <td className="apro-num">{format.currency(transaction.amountCents)}</td>
                      <td>{transaction.description}</td>
                      <td>{format.date(transaction.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      ) : null}
    </div>
  );
}
