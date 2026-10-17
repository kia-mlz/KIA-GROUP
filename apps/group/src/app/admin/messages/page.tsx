'use client';

import type { AdminLearnerMessage, AdminUser } from '@kia./shared';
import { Loader2, Send, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';

export default function AdminMessagesPage() {
  const { t, format } = useLanguage();
  const [messages, setMessages] = useState<AdminLearnerMessage[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    Promise.all([api.adminListMessages(), api.adminListUsers()])
      .then(([nextMessages, nextUsers]) => {
        setMessages(nextMessages);
        setUsers(nextUsers.items);
        setUserId((current) => current || nextUsers.items[0]?.id || '');
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : t('admin.messages.error')))
      .finally(() => setLoading(false));
  }, [t]);

  const send = async () => {
    if (!userId || !subject.trim() || !body.trim()) return;
    setSending(true);
    setSaved('');
    try {
      const message = await api.adminSendMessage({
        userId,
        subject: subject.trim(),
        body: body.trim(),
      });
      setMessages((prev) => [message, ...prev]);
      setSubject('');
      setBody('');
      setSaved(t('admin.messages.sent'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.messages.error'));
    } finally {
      setSending(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.adminDeleteMessage(id);
      setMessages((prev) => prev.filter((message) => message.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.messages.error'));
    }
  };

  if (loading) {
    return (
      <div className="admin-content auth-loading">
        <Loader2 size={24} className="spin" /> {t('admin.messages.loading')}
      </div>
    );
  }

  return (
    <div className="admin-content">
      {error ? <p className="form-error">{error}</p> : null}

      <article className="admin-card" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-section-head">
          <div>
            <h2>{t('admin.messages.compose')}</h2>
            <p>{t('admin.messages.composeSub')}</p>
          </div>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', maxWidth: 640 }}>
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
          <input
            className="admin-input"
            value={subject}
            placeholder={t('admin.messages.subject')}
            onChange={(e) => setSubject(e.target.value)}
          />
          <textarea
            className="note-editor"
            rows={4}
            value={body}
            placeholder={t('admin.messages.body')}
            onChange={(e) => setBody(e.target.value)}
          />
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              type="button"
              className="cta-primary"
              onClick={() => void send()}
              disabled={sending || !userId || !subject.trim() || !body.trim()}
            >
              {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}{' '}
              {t('admin.messages.send')}
            </button>
            {saved ? <span className="form-success">{saved}</span> : null}
          </div>
        </div>
      </article>
      <article className="admin-card">
        <div className="admin-section-head">
          <div>
            <h2>{t('admin.messages.title')}</h2>
            <p>{t('admin.messages.sub')}</p>
          </div>
        </div>
        {messages.length === 0 ? (
          <p className="admin-sub">{t('admin.messages.empty')}</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  padding: '0.85rem 1rem',
                  border: '1px solid var(--border-soft)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <strong>{message.subject}</strong>
                    <div style={{ fontSize: '12px', color: 'var(--text-faint)' }}>
                      {message.userName}
                      {message.readAt
                        ? ` · ${t('admin.messages.read')}`
                        : ` · ${t('admin.messages.unread')}`}
                      {' · '}
                      {format.date(message.createdAt)}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="pill-btn"
                    onClick={() => void remove(message.id)}
                    aria-label={t('admin.messages.delete')}
                  >
                    <Trash2 size={14} /> {t('admin.messages.delete')}
                  </button>
                </div>
                <p style={{ margin: '0.5rem 0 0', whiteSpace: 'pre-wrap' }}>{message.body}</p>
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}