'use client';

import type { LearnerMessageDto } from '@kia./shared';
import { Loader2, MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DashboardGate, PanelPage } from '@/components/dashboard/DashboardShell';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';

export default function MessagesPage() {
  const { t, format } = useLanguage();
  const [messages, setMessages] = useState<LearnerMessageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .listMessages()
      .then(async (data) => {
        if (cancelled) return;
        setMessages(data);
        const unread = data.filter((message) => !message.readAt);
        await Promise.all(
          unread.map((message) => api.markMessageRead(message.id).catch(() => null)),
        );
        if (!cancelled && unread.length) {
          setMessages((prev) =>
            prev.map((message) =>
              message.readAt ? message : { ...message, readAt: new Date().toISOString() },
            ),
          );
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : t('panel.messages.loadError'));
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
    <DashboardGate nextPath="/dashboard/messages">
      <PanelPage
        eyebrow={
          <>
            <MessageSquare size={14} className="inline-leading-icon" />
            {t('panel.nav.messages')}
          </>
        }
        title={t('panel.messages.title')}
        sub={t('panel.messages.sub')}
      >
        {loading ? (
          <p className="auth-loading">
            <Loader2 size={18} className="spin" /> {t('common.loading')}
          </p>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
        {!loading && messages.length === 0 ? (
          <p className="panel-muted">{t('panel.messages.empty')}</p>
        ) : null}
        <div className="panel-list">
          {messages.map((message) => (
            <article
              key={message.id}
              className={`panel-row message-card${!message.readAt ? ' unread' : ''}`}
            >
              <div className="panel-row__main">
                <b>{message.subject}</b>
                <span>{format.date(message.createdAt)}</span>
                <p style={{ marginTop: '0.5rem', color: 'var(--text)' }}>{message.body}</p>
              </div>
            </article>
          ))}
        </div>
      </PanelPage>
    </DashboardGate>
  );
}
