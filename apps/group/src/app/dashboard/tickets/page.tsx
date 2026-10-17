'use client';

import type { SupportTicketSummary } from '@kia./shared';
import { Loader2, Plus, Ticket } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DashboardGate, PanelPage } from '@/components/dashboard/DashboardShell';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';

export default function TicketsPage() {
  const { t, format } = useLanguage();
  const [tickets, setTickets] = useState<SupportTicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .listTickets()
      .then((data) => {
        if (!cancelled) setTickets(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : t('panel.tickets.loadError'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <DashboardGate nextPath="/dashboard/tickets">
      <PanelPage
        eyebrow={
          <>
            <Ticket size={14} className="inline-leading-icon" />
            {t('panel.nav.previousTickets')}
          </>
        }
        title={t('panel.tickets.title')}
        sub={t('panel.tickets.sub')}
        actions={
          <Link href="/dashboard/tickets/new" className="btn btn--primary">
            <Plus size={16} aria-hidden="true" />
            {t('panel.nav.newTicket')}
          </Link>
        }
      >
        {loading ? (
          <p className="auth-loading">
            <Loader2 size={18} className="spin" /> {t('common.loading')}
          </p>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
        {!loading && tickets.length === 0 ? (
          <p className="panel-muted">{t('panel.tickets.empty')}</p>
        ) : null}
        <div className="panel-list">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="panel-row">
              <div className="panel-row__main">
                <b>{ticket.subject}</b>
                <span>
                  {format.date(ticket.createdAt)}
                  {ticket.courseTitle ? ` · ${ticket.courseTitle}` : ''}
                  {` · ${t(`panel.tickets.status.${ticket.status.toLowerCase()}`)}`}
                </span>
              </div>
              <div className="panel-row__actions">
                <Link href={`/dashboard/tickets/${ticket.id}`} className="btn btn--secondary">
                  {t('panel.tickets.open')}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </PanelPage>
    </DashboardGate>
  );
}
