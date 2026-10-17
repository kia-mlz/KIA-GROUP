'use client';

import type { SupportTicketSummary } from '@kia./shared';
import { Headphones } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';
import { CardShell, EmptyState } from './CardShell';

export function TicketsCard() {
  const router = useRouter();
  const { t, format } = useLanguage();
  const [tickets, setTickets] = useState<SupportTicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.listTickets();
      setTickets(data.slice(0, 4));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('panel.tickets.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const categoryLabel = (category: string | null) => {
    switch (category) {
      case 'technical':
        return t('dashboard.tickets.category.technical');
      case 'admin':
        return t('dashboard.tickets.category.admin');
      case 'education':
        return t('dashboard.tickets.category.education');
      case 'finance':
        return t('dashboard.tickets.category.finance');
      default:
        return category || t('panel.tickets.general');
    }
  };

  const statusClass = (status: SupportTicketSummary['status']) => {
    if (status === 'OPEN') return 'open';
    if (status === 'IN_PROGRESS') return 'inProgress';
    return 'closed';
  };

  const statusLabel = (status: SupportTicketSummary['status']) =>
    t(`panel.tickets.status.${status.toLowerCase()}` as 'panel.tickets.status.open');

  return (
    <CardShell
      title={t('dashboard.tickets.title')}
      icon={Headphones}
      span={2}
      isLoading={loading}
      error={error}
      onRetry={load}
      cta={
        <Link href="/dashboard/tickets/new" className="dash-btn-ghost">
          {t('dashboard.tickets.new')}
        </Link>
      }
    >
      {tickets.length === 0 ? (
        <EmptyState
          icon="🎫"
          text={t('dashboard.tickets.empty')}
          cta={t('dashboard.tickets.first')}
          onCta={() => router.push('/dashboard/tickets/new')}
        />
      ) : (
        <div className="dash-stack">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/dashboard/tickets/${ticket.id}`}
              className={`dash-ticket-row dash-ticket-row--${statusClass(ticket.status)}`}
            >
              <div className="dash-tx-main">
                <div>{ticket.subject}</div>
                <span>
                  {categoryLabel(ticket.category)} · {format.date(ticket.createdAt)}
                </span>
              </div>
              <span className={`dash-tag dash-tag--${statusClass(ticket.status)}`}>
                {statusLabel(ticket.status)}
              </span>
            </Link>
          ))}
          <Link href="/dashboard/tickets" className="dash-link-footer">
            {t('dashboard.tickets.viewAll')}
          </Link>
        </div>
      )}
    </CardShell>
  );
}
