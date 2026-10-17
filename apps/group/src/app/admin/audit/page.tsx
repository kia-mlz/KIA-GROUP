'use client';

import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Fragment, useCallback, useEffect, useState } from 'react';
import type { AdminAuditLog } from '@kia./shared';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';

const PAGE_SIZE = 20;

const SECTIONS = [
  'users',
  'courses',
  'challenges',
  'payments',
  'settings',
  'competitions',
  'tickets',
  'messages',
  'tests',
  'stats',
] as const;

const ACTIONS = [
  'user.create',
  'user.status_change',
  'user.role_change',
  'user.access_change',
  'role.create',
  'role.update',
  'role.delete',
  'course.create',
  'course.update',
  'course.delete',
  'lesson.create',
  'lesson.update',
  'lesson.delete',
  'lesson.video_upload',
  'lesson.video_delete',
  'challenge.create',
  'challenge.update',
  'challenge.delete',
  'message.send',
  'message.delete',
  'wallet.adjust',
  'entitlement.grant',
  'entitlement.revoke',
  'settings.update',
] as const;

const badgeTone = (section: string) => {
  switch (section) {
    case 'users':
      return 'info';
    case 'payments':
    case 'settings':
      return 'warning';
    default:
      return '';
  }
};

export default function AdminAuditPage() {
  const { t, format } = useLanguage();
  const [entries, setEntries] = useState<AdminAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [section, setSection] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setError('');
      try {
        const list = await api.adminListAuditLogs({
          page: targetPage,
          limit: PAGE_SIZE,
          search: search.trim() || undefined,
          section: section || undefined,
          action: action || undefined,
          from: from || undefined,
          to: to || undefined,
        });
        setEntries(list.items);
        setTotal(list.total);
        setPage(list.page);
        setHasNext(list.hasNext);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : t('admin.audit.loadError'));
      } finally {
        setLoading(false);
      }
    },
    [search, section, action, from, to, t],
  );

  useEffect(() => {
    void load(1);
  }, [section, action, from, to]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="admin-content">
      <div className="admin-header-row">
        <div>
          <h1>{t('admin.audit.title')}</h1>
          <p className="admin-sub">{t('admin.audit.sub')}</p>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="admin-toolbar">
        <label className="form-field" style={{ flex: '1 1 220px', margin: 0 }}>
          <span className="sr-only">{t('admin.audit.search')}</span>
          <input
            className="admin-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void load(1);
            }}
            placeholder={t('admin.audit.searchPlaceholder')}
          />
        </label>
        <label className="form-field" style={{ flex: '0 1 170px', margin: 0 }}>
          <span className="sr-only">{t('admin.audit.allSections')}</span>
          <select
            className="admin-select"
            value={section}
            onChange={(e) => setSection(e.target.value)}
          >
            <option value="">{t('admin.audit.allSections')}</option>
            {SECTIONS.map((s) => (
              <option key={s} value={s}>
                {t(`admin.audit.section.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field" style={{ flex: '0 1 200px', margin: 0 }}>
          <span className="sr-only">{t('admin.audit.allActions')}</span>
          <select
            className="admin-select"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            <option value="">{t('admin.audit.allActions')}</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {t(`admin.audit.action.${a}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field" style={{ flex: '0 1 150px', margin: 0 }}>
          <span className="sr-only">{t('admin.audit.from')}</span>
          <input
            type="date"
            className="admin-input"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="form-field" style={{ flex: '0 1 150px', margin: 0 }}>
          <span className="sr-only">{t('admin.audit.to')}</span>
          <input
            type="date"
            className="admin-input"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button type="button" className="btn-next admin-btn" onClick={() => void load(1)}>
          {loading ? <Loader2 size={14} className="spin" /> : null}
          {t('admin.audit.search')}
        </button>
      </div>

      {loading && entries.length === 0 ? (
        <div className="admin-content auth-loading">
          <Loader2 size={24} className="spin" /> {t('admin.audit.loading')}
        </div>
      ) : entries.length === 0 ? (
        <p className="admin-sub">{t('admin.audit.empty')}</p>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.audit.col.time')}</th>
                  <th>{t('admin.audit.col.actor')}</th>
                  <th>{t('admin.audit.col.action')}</th>
                  <th>{t('admin.audit.col.target')}</th>
                  <th>{t('admin.audit.col.reason')}</th>
                  <th>{t('admin.audit.col.ip')}</th>
                  <th>{t('admin.audit.details')}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const expanded = expandedId === entry.id;
                  return (
                    <Fragment key={entry.id}>
                      <tr>
                        <td>{format.date(entry.createdAt)}</td>
                        <td>
                          {entry.actorName}
                          <span className="admin-badge" style={{ marginInlineStart: '0.4rem' }}>
                            {entry.actorRole}
                          </span>
                        </td>
                        <td>
                          <span className={`admin-badge ${badgeTone(entry.section)}`}>
                            {t(`admin.audit.action.${entry.action}`)}
                          </span>
                        </td>
                        <td>{entry.target}</td>
                        <td>{entry.reason ?? t('admin.audit.noReason')}</td>
                        <td>{entry.ip ?? '—'}</td>
                        <td>
                          <button
                            type="button"
                            className="admin-btn"
                            onClick={() => setExpandedId(expanded ? null : entry.id)}
                          >
                            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                      </tr>
                      {expanded && (
                        <tr key={`${entry.id}-details`}>
                          <td colSpan={7}>
                            <div className="admin-audit-details">
                              <DetailRow label="before" value={entry.before} />
                              <DetailRow label="after" value={entry.after} />
                              {entry.userAgent && (
                                <div className="admin-audit-detail-row">
                                  <span className="admin-audit-detail-label">User-Agent</span>
                                  <code>{entry.userAgent}</code>
                                </div>
                              )}
                              {entry.requestId && (
                                <div className="admin-audit-detail-row">
                                  <span className="admin-audit-detail-label">Request ID</span>
                                  <code>{entry.requestId}</code>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="admin-pagination">
            <button
              type="button"
              className="btn-next admin-btn"
              disabled={page <= 1 || loading}
              onClick={() => void load(page - 1)}
            >
              {t('admin.audit.prev')}
            </button>
            <span>{t('admin.audit.pageInfo', { page, total: totalPages })}</span>
            <button
              type="button"
              className="btn-next admin-btn"
              disabled={!hasNext || loading}
              onClick={() => void load(page + 1)}
            >
              {t('admin.audit.next')}
            </button>
            <span className="admin-sub">{t('admin.audit.total', { count: total })}</span>
          </div>
        </>
      )}
    </div>
  );
}


function DetailRow({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="admin-audit-detail-row">
      <span className="admin-audit-detail-label">{label}</span>
      <pre className="admin-audit-json">{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}
