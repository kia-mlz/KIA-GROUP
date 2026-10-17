'use client';

import type { AdminEntitlement, AdminUser } from '@kia./shared';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';
import {
  AdminSortHeader,
  sortRows,
  type SortState,
} from '@/components/admin/AdminPro';

/** Legacy labels map server-side to the canonical `readiness`/`roadmap` enum. */
const RESOURCE_TYPES = ['course', 'readiness', 'roadmap'] as const;
const SOURCES = ['FREE', 'CHALLENGE', 'BUNDLE'] as const;

export default function AdminEntitlementsPage() {
  const { t, format } = useLanguage();
  const [entitlements, setEntitlements] = useState<AdminEntitlement[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState('');
  const [resourceType, setResourceType] = useState<string>('course');
  const [resourceId, setResourceId] = useState('');
  const [source, setSource] = useState<string>('FREE');
  const [sort, setSort] = useState<SortState>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.adminListEntitlements(), api.adminListUsers()])
      .then(([nextEntitlements, nextUsers]) => {
        setEntitlements(nextEntitlements);
        setUsers(nextUsers.items);
        setUserId((current) => current || nextUsers.items[0]?.id || '');
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : t('admin.entitlements.error')),
      )
      .finally(() => setLoading(false));
  }, [t]);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === userId),
    [users, userId],
  );

  const grantFormValid = Boolean(userId && resourceId.trim());

  const grantPreview = useMemo(
    () =>
      t('admin.pro.grantPreviewValue', {
        user: selectedUser?.name ?? '—',
        type: t(
          `admin.entitlements.type.${resourceType.replace('_', '')}` as 'admin.entitlements.type.course',
        ),
        resource: resourceId.trim() || '…',
        source,
      }),
    [t, selectedUser, resourceType, resourceId, source],
  );

  const grant = async () => {
    if (!grantFormValid) return;
    setBusy(true);
    setSaved('');
    try {
      const next = await api.adminGrantEntitlement({
        userId,
        resourceType,
        resourceId: resourceId.trim(),
        source,
      });
      setEntitlements((prev) => [next, ...prev]);
      setResourceId('');
      setSaved(t('admin.entitlements.granted'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.entitlements.error'));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    setConfirmingId(null);
    try {
      await api.adminRevokeEntitlement(id);
      setEntitlements((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.entitlements.error'));
    }
  };

  const sorted = useMemo(
    () =>
      sortRows(entitlements, sort, {
        user: (row) => row.userName,
        resource: (row) => `${row.resourceType}/${row.resourceId}`,
        source: (row) => row.source,
        date: (row) => row.createdAt,
      }),
    [entitlements, sort],
  );

  const onSort = (key: string) => {
    setSort((prev) =>
      prev?.key === key ? (prev.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' },
    );
  };

  if (loading) {
    return (
      <div className="admin-content auth-loading">
        <Loader2 size={24} className="spin" /> {t('admin.entitlements.loading')}
      </div>
    );
  }

  return (
    <div className="admin-content">
      {/* Success / error feedback with roles for screen readers */}
      {saved ? (
        <p className="form-success" role="status">
          {saved}
        </p>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <article className="admin-card" style={{ marginBottom: '1.25rem' }}>
        <div className="admin-section-head">
          <div>
            <h2>{t('admin.entitlements.grant')}</h2>
            <p>{t('admin.entitlements.grantSub')}</p>
          </div>
        </div>

        <div className="apro-form-grid" style={{ maxWidth: 760 }}>
          <label className="apro-field">
            <span className="admin-sub">{t('admin.entitlements.col.user')}</span>
            <select
              className="admin-input"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} {user.email ? `(${user.email})` : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="apro-field">
            <span className="admin-sub">{t('admin.entitlements.grant')}</span>
            <select
              className="admin-input"
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
            >
              {RESOURCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(
                    `admin.entitlements.type.${type.replace('_', '')}` as 'admin.entitlements.type.course',
                  )}
                </option>
              ))}
            </select>
          </label>

          <label className="apro-field">
            <span className="admin-sub">{t('admin.entitlements.resourceId')}</span>
            <input
              className="admin-input ltr-isolate"
              placeholder={t('admin.entitlements.resourceId')}
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
            />
          </label>

          <label className="apro-field">
            <span className="admin-sub">{t('admin.entitlements.source')}</span>
            <select
              className="admin-input"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              {SOURCES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Live grant preview — states the exact effect before submit */}
        <p className="admin-meta" style={{ marginTop: '0.85rem' }}>
          {t('admin.pro.grantPreview')}: <strong>{grantPreview}</strong>
        </p>

        <button
          type="button"
          className="cta-primary"
          style={{ marginTop: '1rem' }}
          onClick={() => void grant()}
          disabled={busy || !grantFormValid}
        >
          {busy ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}{' '}
          {t('admin.entitlements.grantBtn')}
        </button>
      </article>

      <article className="admin-card">
        <div className="admin-section-head">
          <div>
            <h2>{t('admin.entitlements.title')}</h2>
            <p>{t('admin.entitlements.sub')}</p>
          </div>
          <span className="admin-badge info">{format.number(entitlements.length)}</span>
        </div>

        <div className="admin-table-wrap" style={{ marginBottom: 0 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <AdminSortHeader
                  label={t('admin.entitlements.col.user')}
                  sortKey="user"
                  sort={sort}
                  onSort={onSort}
                />
                <AdminSortHeader
                  label={t('admin.entitlements.col.resource')}
                  sortKey="resource"
                  sort={sort}
                  onSort={onSort}
                />
                <AdminSortHeader
                  label={t('admin.entitlements.col.source')}
                  sortKey="source"
                  sort={sort}
                  onSort={onSort}
                />
                <AdminSortHeader
                  label={t('admin.entitlements.col.date')}
                  sortKey="date"
                  sort={sort}
                  onSort={onSort}
                />
                <th>
                  <span className="sr-only">{t('common.delete')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={5}>{t('admin.entitlements.empty')}</td>
                </tr>
              ) : (
                sorted.map((entitlement) => (
                  <tr key={entitlement.id}>
                    <td>
                      <div>{entitlement.userName}</div>
                      <div className="ltr-isolate admin-cell-meta">{entitlement.userEmail}</div>
                    </td>
                    <td>
                      <code>{entitlement.resourceType}</code> /{' '}
                      <code>{entitlement.resourceId}</code>
                    </td>
                    <td>
                      <span className="admin-badge info">{entitlement.source}</span>
                    </td>
                    <td>{format.date(entitlement.createdAt)}</td>
                    <td>
                      {confirmingId === entitlement.id ? (
                        <span className="apro-confirm">
                          <span>{t('admin.pro.revokeConfirm')}</span>
                          <button
                            type="button"
                            className="pill-btn"
                            onClick={() => void revoke(entitlement.id)}
                          >
                            {t('common.yes')}
                          </button>
                          <button
                            type="button"
                            className="pill-btn pro-accent"
                            onClick={() => setConfirmingId(null)}
                          >
                            {t('common.cancel')}
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="pill-btn"
                          onClick={() => setConfirmingId(entitlement.id)}
                          aria-label={t('admin.entitlements.revoke')}
                        >
                          <Trash2 size={14} /> {t('admin.entitlements.revoke')}
                        </button>
                      )}
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
