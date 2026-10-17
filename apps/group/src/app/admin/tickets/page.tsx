'use client';

import type { AdminTicketStatus, AdminTicketSummary } from '@kia./shared';
import { Loader2, Ticket } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';
import {
  AdminSortHeader,
  AdminTableToolbar,
  sortRows,
  type SortState,
} from '@/components/admin/AdminPro';

const STATUSES: AdminTicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

function ticketStatusTone(status: AdminTicketStatus): 'ok' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'RESOLVED':
    case 'CLOSED':
      return 'ok';
    case 'IN_PROGRESS':
      return 'info';
    default:
      return 'warning';
  }
}

export default function AdminTicketsPage() {
  const { t, format } = useLanguage();
  const [tickets, setTickets] = useState<AdminTicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState>(null);

  useEffect(() => {
    api
      .adminListTickets()
      .then(setTickets)
      .catch((err) => setError(err instanceof ApiError ? err.message : t('admin.tickets.error')))
      .finally(() => setLoading(false));
  }, [t]);

  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ticket of tickets) {
      counts.set(ticket.status, (counts.get(ticket.status) ?? 0) + 1);
    }
    return counts;
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = tickets.filter((ticket) => {
      if (statusFilter && ticket.status !== statusFilter) return false;
      if (!q) return true;
      return (
        ticket.subject.toLowerCase().includes(q) ||
        ticket.userName.toLowerCase().includes(q) ||
        (ticket.userEmail ?? '').toLowerCase().includes(q) ||
        ticket.id.toLowerCase().includes(q)
      );
    });
    return sortRows(rows, sort, {
      subject: (row) => row.subject,
      user: (row) => row.userName,
      status: (row) => row.status,
      priority: (row) => {
        const order = { HIGH: 0, NORMAL: 1, LOW: 2 } as Record<string, number>;
        return order[row.priority] ?? 1;
      },
      replies: (row) => row.replyCount,
      date: (row) => row.createdAt,
    });
  }, [tickets, search, statusFilter, sort]);

  const onSort = (key: string) => {
    setSort((prev) =>
      prev?.key === key ? (prev.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' },
    );
  };

  if (loading) {
    return (
      <div className="admin-content auth-loading">
        <Loader2 size={24} className="spin" /> {t('admin.tickets.loading')}
      </div>
    );
  }

  const hasFilters = Boolean(search || statusFilter || sort);

  return (
    <div className="admin-content">
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <article className="admin-card">
        <div className="admin-section-head">
          <div>
            <h2>{t('admin.tickets.title')}</h2>
            <p>{t('admin.tickets.sub')}</p>
          </div>
          <span className="admin-badge info">
            <Ticket size={12} />
            {format.number(filtered.length)} / {format.number(tickets.length)}
          </span>
        </div>

        <AdminTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchLabel={t('admin.tickets.search')}
          searchPlaceholder={t('admin.tickets.search')}
        >
          <div className="apro-chips" role="group" aria-label={t('admin.tickets.allStatuses')}>
            <button
              type="button"
              className="apro-chip"
              aria-pressed={statusFilter === ''}
              onClick={() => setStatusFilter('')}
            >
              {t('admin.pro.all')}
              <span className="apro-chip-count">{format.number(tickets.length)}</span>
            </button>
            {STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                className="apro-chip"
                aria-pressed={statusFilter === status}
                onClick={() => setStatusFilter((current) => (current === status ? '' : status))}
              >
                {t(`admin.tickets.status.${status.toLowerCase()}` as 'admin.tickets.status.open')}
                <span className="apro-chip-count">
                  {format.number(statusCounts.get(status) ?? 0)}
                </span>
              </button>
            ))}
          </div>
          {hasFilters ? (
            <button
              type="button"
              className="admin-link-btn"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setSort(null);
              }}
            >
              {t('admin.pro.resetFilters')}
            </button>
          ) : null}
        </AdminTableToolbar>

        <div className="admin-table-wrap" style={{ marginBottom: 0 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <AdminSortHeader
                  label={t('admin.tickets.col.subject')}
                  sortKey="subject"
                  sort={sort}
                  onSort={onSort}
                />
                <AdminSortHeader
                  label={t('admin.tickets.col.user')}
                  sortKey="user"
                  sort={sort}
                  onSort={onSort}
                />
                <th>{t('admin.tickets.col.course')}</th>
                <AdminSortHeader
                  label={t('admin.tickets.col.status')}
                  sortKey="status"
                  sort={sort}
                  onSort={onSort}
                />
                <AdminSortHeader
                  label={t('admin.tickets.col.priority')}
                  sortKey="priority"
                  sort={sort}
                  onSort={onSort}
                />
                <AdminSortHeader
                  label={t('admin.tickets.col.replies')}
                  sortKey="replies"
                  sort={sort}
                  onSort={onSort}
                />
                <AdminSortHeader
                  label={t('admin.tickets.col.date')}
                  sortKey="date"
                  sort={sort}
                  onSort={onSort}
                />
                <th>
                  <span className="sr-only">{t('admin.tickets.back')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    {tickets.length === 0 ? t('admin.tickets.empty') : t('admin.pro.emptyFiltered')}
                  </td>
                </tr>
              ) : (
                filtered.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>
                      <Link href={`/admin/tickets/${ticket.id}`} className="admin-link">
                        {ticket.subject}
                      </Link>
                    </td>
                    <td>
                      <div>{ticket.userName}</div>
                      <div className="ltr-isolate admin-cell-meta">{ticket.userEmail}</div>
                    </td>
                    <td>{ticket.courseTitle ?? '—'}</td>
                    <td>
                      <span className={`admin-badge ${ticketStatusTone(ticket.status)}`}>
                        <span className="apro-dot" aria-hidden="true" />
                        {t(
                          `admin.tickets.status.${ticket.status.toLowerCase()}` as 'admin.tickets.status.open',
                        )}
                      </span>
                    </td>
                    <td>
                      {t(
                        `admin.tickets.priority.${ticket.priority.toLowerCase()}` as 'admin.tickets.priority.normal',
                      )}
                    </td>
                    <td className="apro-num">{format.number(ticket.replyCount)}</td>
                    <td>{format.date(ticket.createdAt)}</td>
                    <td>
                      <Link
                        href={`/admin/tickets/${ticket.id}`}
                        className="pill-btn pro-accent"
                        style={{ display: 'inline-flex', alignItems: 'center' }}
                      >
                        {t('panel.tickets.open')}
                      </Link>
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
