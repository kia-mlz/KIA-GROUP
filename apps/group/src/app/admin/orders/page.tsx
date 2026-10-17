'use client';

import type { AdminOrder } from '@kia./shared';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';
import {
  AdminSortHeader,
  AdminStatusBadge,
  AdminTableToolbar,
  sortRows,
  type SortState,
} from '@/components/admin/AdminPro';

function orderTone(status: string): 'ok' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'PAID':
      return 'ok';
    case 'PENDING':
      return 'warning';
    case 'FAILED':
    case 'CANCELED':
    case 'CANCELLED':
      return 'danger';
    default:
      return 'info';
  }
}

export default function AdminOrdersPage() {
  const { t, format } = useLanguage();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState>(null);

  useEffect(() => {
    api
      .adminListOrders()
      .then(setOrders)
      .catch((err) => setError(err instanceof ApiError ? err.message : t('admin.orders.error')))
      .finally(() => setLoading(false));
  }, [t]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = orders.filter((order) => {
      if (!q) return true;
      return (
        order.userName.toLowerCase().includes(q) ||
        (order.userEmail ?? '').toLowerCase().includes(q) ||
        order.status.toLowerCase().includes(q) ||
        order.id.toLowerCase().includes(q)
      );
    });
    return sortRows(rows, sort, {
      date: (row) => row.createdAt,
      user: (row) => row.userName,
      items: (row) => row.itemCount,
      total: (row) => row.totalCents,
      status: (row) => row.status,
    });
  }, [orders, search, sort]);

  const filteredTotal = useMemo(
    () => filtered.reduce((acc, order) => acc + order.totalCents, 0),
    [filtered],
  );

  const paidCount = useMemo(
    () => orders.filter((order) => order.status === 'PAID').length,
    [orders],
  );

  const onSort = (key: string) => {
    setSort((prev) =>
      prev?.key === key ? (prev.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' },
    );
  };

  if (loading) {
    return (
      <div className="admin-content auth-loading">
        <Loader2 size={24} className="spin" /> {t('admin.orders.loading')}
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

      {/* Summary strip */}
      <div className="admin-stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 11rem), 1fr))' }}>
        <div className="admin-stat-card">
          <div className="admin-stat-row">
            <div>
              <span className="admin-stat-label">{t('admin.orders.title')}</span>
              <div className="admin-stat-value">{format.number(orders.length)}</div>
            </div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-row">
            <div>
              <span className="admin-stat-label">{t('admin.pro.positive')}</span>
              <div className="admin-stat-value">{format.number(paidCount)}</div>
            </div>
          </div>
        </div>
        <div className="admin-stat-card highlight">
          <div className="admin-stat-row">
            <div>
              <span className="admin-stat-label">{t('admin.pro.total')}</span>
              <div className="admin-stat-value">{format.currency(filteredTotal)}</div>
            </div>
          </div>
        </div>
      </div>

      <article className="admin-card">
        <div className="admin-section-head">
          <div>
            <h2>{t('admin.orders.title')}</h2>
            <p>{t('admin.orders.sub')}</p>
          </div>
          <span className="admin-badge info">
            {format.number(filtered.length)} / {format.number(orders.length)}
          </span>
        </div>

        <AdminTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchLabel={t('admin.orders.search')}
          searchPlaceholder={t('admin.orders.search')}
        />

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <AdminSortHeader
                  label={t('admin.orders.col.date')}
                  sortKey="date"
                  sort={sort}
                  onSort={onSort}
                />
                <AdminSortHeader
                  label={t('admin.orders.col.user')}
                  sortKey="user"
                  sort={sort}
                  onSort={onSort}
                />
                <AdminSortHeader
                  label={t('admin.orders.col.items')}
                  sortKey="items"
                  sort={sort}
                  onSort={onSort}
                />
                <AdminSortHeader
                  label={t('admin.orders.col.total')}
                  sortKey="total"
                  sort={sort}
                  onSort={onSort}
                />
                <AdminSortHeader
                  label={t('admin.orders.col.status')}
                  sortKey="status"
                  sort={sort}
                  onSort={onSort}
                />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    {orders.length === 0 ? t('admin.orders.empty') : t('admin.pro.emptyFiltered')}
                  </td>
                </tr>
              ) : (
                filtered.map((order) => (
                  <tr key={order.id}>
                    <td>{format.date(order.createdAt)}</td>
                    <td>
                      <div>{order.userName}</div>
                      <div className="ltr-isolate admin-cell-meta">{order.userEmail}</div>
                    </td>
                    <td>{format.number(order.itemCount)}</td>
                    <td className="apro-num">{format.currency(order.totalCents)}</td>
                    <td>
                      <AdminStatusBadge tone={orderTone(order.status)}>{order.status}</AdminStatusBadge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}
