'use client';

import type { LearnerMessageDto } from '@kia./shared';
import { MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';
import { CardShell, EmptyState } from './CardShell';

export function AdminMessages() {
  const { t, format } = useLanguage();
  const [messages, setMessages] = useState<LearnerMessageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.listMessages();
      setMessages(data.slice(0, 3));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('panel.messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const unreadCount = messages.filter((m) => !m.readAt).length;

  return (
    <CardShell
      title={t('dashboard.messages.title')}
      icon={MessageSquare}
      isLoading={loading}
      error={error}
      onRetry={load}
      cta={
        <Link href="/dashboard/messages" className="dash-btn-ghost">
          {t('dashboard.messages.viewAll')}
        </Link>
      }
    >
      {messages.length === 0 ? (
        <EmptyState icon="📬" text={t('panel.messages.empty')} />
      ) : (
        <div className="dash-stack">
          {unreadCount > 0 ? (
            <div className="dash-unread-hint">
              {t('dashboard.messages.unread', { count: format.number(unreadCount) })}
            </div>
          ) : null}
          {messages.map((message) => {
            const unread = !message.readAt;
            const initial = (message.subject?.[0] || '?').toUpperCase();
            return (
              <Link
                key={message.id}
                href="/dashboard/messages"
                className={`dash-message-row${unread ? ' is-unread' : ''}`}
              >
                <div className="dash-avatar-sm" aria-hidden="true">
                  {initial}
                </div>
                <div className="dash-tx-main">
                  <div className="dash-message-row__top">
                    <span className={unread ? 'is-strong' : ''}>{message.subject}</span>
                    <span>{format.date(message.createdAt)}</span>
                  </div>
                  <div className="dash-muted">{t('dashboard.messages.fromAdmin')}</div>
                  <div className="dash-clamp">{message.body}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </CardShell>
  );
}
