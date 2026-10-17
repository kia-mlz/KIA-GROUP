'use client';

import Link from 'next/link';
import { Bell, Mail, Ticket } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AdminLearnerMessage, AdminTicketSummary } from '@kia./shared';
import { useLanguage } from '@/context/LanguageProvider';
import { api } from '@/lib/api';

type NotificationItem = {
  id: string;
  kind: 'ticket' | 'message';
  title: string;
  meta: string;
  href: string;
  date: string;
};

/**
 * Single lightweight fetch of REAL attention data (open support tickets +
 * unread learner inbox messages). Shared by the sidebar badges and the
 * notification bell so the panel never duplicates these requests.
 */
export function useAdminAttention(enabled: boolean): {
  tickets: AdminTicketSummary[];
  messages: AdminLearnerMessage[];
} {
  const [tickets, setTickets] = useState<AdminTicketSummary[]>([]);
  const [messages, setMessages] = useState<AdminLearnerMessage[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    api
      .adminListTickets()
      .then((items) => {
        if (!cancelled) setTickets(items);
      })
      .catch(() => undefined);
    api
      .adminListMessages()
      .then((items) => {
        if (!cancelled) setMessages(items);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { tickets, messages };
}

export default function AdminNotifications({
  tickets,
  messages,
}: {
  tickets: AdminTicketSummary[];
  messages: AdminLearnerMessage[];
}) {
  const { t, format } = useLanguage();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const items = useMemo<NotificationItem[]>(() => {
    const openTickets = (tickets ?? [])
      .filter((ticket) => ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS')
      .slice(0, 6)
      .map<NotificationItem>((ticket) => ({
        id: `ticket-${ticket.id}`,
        kind: 'ticket',
        title: ticket.subject,
        meta: ticket.userName || ticket.userEmail || '',
        href: `/admin/tickets/${ticket.id}`,
        date: ticket.createdAt,
      }));
    const unread = (messages ?? [])
      .filter((message) => !message.readAt)
      .slice(0, 6)
      .map<NotificationItem>((message) => ({
        id: `message-${message.id}`,
        kind: 'message',
        title: message.subject,
        meta: message.userName || message.userEmail || '',
        href: '/admin/messages',
        date: message.createdAt,
      }));
    return [...openTickets, ...unread];
  }, [tickets, messages]);

  const ticketCount = useMemo(
    () =>
      (tickets ?? []).filter((ticket) => ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS')
        .length,
    [tickets],
  );
  const messageCount = useMemo(
    () => (messages ?? []).filter((message) => !message.readAt).length,
    [messages],
  );
  const totalCount = ticketCount + messageCount;

  return (
    <div className="admin-dropdown-wrap" ref={wrapRef}>
      <button
        type="button"
        className="admin-icon-button"
        aria-label={t('admin.notifications.title')}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={16} aria-hidden />
        {totalCount > 0 ? (
          <span className="admin-count-dot" aria-hidden>
            {totalCount > 99 ? '99+' : totalCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="admin-header-dropdown" role="dialog" aria-label={t('admin.notifications.title')}>
          <div className="admin-dropdown-head">
            {t('admin.notifications.title')}
            <span className="admin-badge info">
              {ticketCount} {t('admin.notifications.tickets')} · {messageCount}{' '}
              {t('admin.notifications.messages')}
            </span>
          </div>
          {items.length === 0 ? (
            <p className="admin-dropdown-empty">{t('admin.notifications.empty')}</p>
          ) : (
            <ul className="admin-dropdown-list">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="admin-dropdown-item unread"
                    onClick={() => setOpen(false)}
                  >
                    <span className="admin-dropdown-item-icon" aria-hidden>
                      {item.kind === 'ticket' ? <Ticket size={14} /> : <Mail size={14} />}
                    </span>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <strong>{item.title}</strong>
                      <small>{item.meta}</small>
                      <time dateTime={item.date}>{format.date(item.date)}</time>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="admin-dropdown-footer">
            <Link href="/admin/tickets" onClick={() => setOpen(false)}>
              {t('admin.notifications.viewTickets')}
            </Link>
            {' · '}
            <Link href="/admin/messages" onClick={() => setOpen(false)}>
              {t('admin.notifications.viewMessages')}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
