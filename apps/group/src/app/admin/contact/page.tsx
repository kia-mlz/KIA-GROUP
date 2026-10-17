'use client';

import { Loader2, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AdminContactMessage } from '@kia./shared';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';

export default function AdminContactPage() {
  const { t, format } = useLanguage();
  const [messages, setMessages] = useState<AdminContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api
      .adminListContactMessages()
      .then(setMessages)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : t('admin.contact.error'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [t]);

  const markRead = async (id: string) => {
    setBusyId(id);
    try {
      const updated = await api.adminMarkContactRead(id);
      setMessages((prev) => prev.map((m) => (m.id === id ? updated : m)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.contact.markReadError'));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="admin-content auth-loading">
        <Loader2 size={24} className="spin" /> {t('admin.contact.loading')}
      </div>
    );
  }

  return (
    <div className="admin-content">
      <h1>
        <Mail size={22} className="inline-leading-icon" /> {t('admin.contact.title')}
      </h1>
      <p className="admin-sub">{t('admin.contact.sub')}</p>

      {error && <p className="form-error">{error}</p>}

      {messages.length === 0 ? (
        <p className="admin-sub">{t('admin.contact.empty')}</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.contact.col.date')}</th>
                <th>{t('admin.contact.col.from')}</th>
                <th>{t('admin.contact.col.subject')}</th>
                <th>{t('admin.contact.col.message')}</th>
                <th>{t('admin.contact.col.status')}</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg) => (
                <tr key={msg.id} className={msg.readAt ? 'contact-read' : 'contact-unread'}>
                  <td>{format.date(msg.createdAt)}</td>
                  <td>
                    <div>{msg.name}</div>
                    <div className="admin-meta ltr-isolate">{msg.email}</div>
                  </td>
                  <td>{msg.subject}</td>
                  <td className="admin-contact-message">{msg.message}</td>
                  <td>
                    {msg.readAt ? (
                      <span className="admin-badge ok">{t('admin.contact.read')}</span>
                    ) : (
                      <button
                        type="button"
                        className="admin-link-btn"
                        disabled={busyId === msg.id}
                        onClick={() => void markRead(msg.id)}
                      >
                        {busyId === msg.id ? t('admin.contact.marking') : t('admin.contact.markRead')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
