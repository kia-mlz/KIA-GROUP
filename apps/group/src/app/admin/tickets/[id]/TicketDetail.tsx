'use client';

import type { AdminTicketDetail, AdminTicketPriority, AdminTicketStatus } from '@kia./shared';
import { ArrowRight, Loader2, Send } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';

const STATUSES: AdminTicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PRIORITIES: AdminTicketPriority[] = ['LOW', 'NORMAL', 'HIGH'];

export default function AdminTicketDetailPage() {
  const { t, format } = useLanguage();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [ticket, setTicket] = useState<AdminTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [saved, setSaved] = useState('');

  useEffect(() => {
    if (!id) return;
    api
      .adminGetTicket(id)
      .then(setTicket)
      .catch((err) => setError(err instanceof ApiError ? err.message : t('admin.tickets.error')))
      .finally(() => setLoading(false));
  }, [id, t]);

  const sendReply = async () => {
    if (!id || !reply.trim()) return;
    setSending(true);
    setSaved('');
    try {
      const next = await api.adminReplyTicket(id, reply.trim());
      setTicket(next);
      setReply('');
      setSaved(t('admin.tickets.replySent'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.tickets.error'));
    } finally {
      setSending(false);
    }
  };

  const patchTicket = async (dto: {
    status?: AdminTicketStatus;
    priority?: AdminTicketPriority;
  }) => {
    if (!id) return;
    setSaved('');
    try {
      const next = await api.adminUpdateTicket(id, dto);
      setTicket(next);
      setSaved(t('admin.tickets.updated'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.tickets.error'));
    }
  };

  if (loading) {
    return (
      <div className="admin-content auth-loading">
        <Loader2 size={24} className="spin" /> {t('admin.tickets.loading')}
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="admin-content">
        <Link href="/admin/tickets" className="admin-link">
          <ArrowRight size={14} className="inline-leading-icon" /> {t('admin.tickets.back')}
        </Link>
        <p className="form-error">{error || t('admin.tickets.error')}</p>
      </div>
    );
  }

  return (
    <div className="admin-content">
      <Link href="/admin/tickets" className="admin-link">
        <ArrowRight size={14} className="inline-leading-icon" /> {t('admin.tickets.back')}
      </Link>

      <article className="admin-card" style={{ marginTop: '0.75rem' }}>
        <div className="admin-section-head">
          <div>
            <h2>{ticket.subject}</h2>
            <p>
              {ticket.userName}
              {ticket.courseTitle ? ` · ${ticket.courseTitle}` : ''} · {format.date(ticket.createdAt)}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <select
              className="admin-input"
              value={ticket.status}
              onChange={(e) => void patchTicket({ status: e.target.value as AdminTicketStatus })}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`admin.tickets.status.${status.toLowerCase()}` as 'admin.tickets.status.open')}
                </option>
              ))}
            </select>
            <select
              className="admin-input"
              value={ticket.priority}
              onChange={(e) => void patchTicket({ priority: e.target.value as AdminTicketPriority })}
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {t(`admin.tickets.priority.${priority.toLowerCase()}` as 'admin.tickets.priority.normal')}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p style={{ whiteSpace: 'pre-wrap' }}>{ticket.body}</p>
      </article>
      <article className="admin-card" style={{ marginTop: '1.25rem' }}>
        <div className="admin-section-head">
          <div>
            <h2>{t('admin.tickets.thread')}</h2>
            <p>{t('admin.tickets.threadSub')}</p>
          </div>
        </div>
        {ticket.replies.length === 0 ? (
          <p className="admin-sub">{t('admin.tickets.noReplies')}</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {ticket.replies.map((entry) => (
              <div
                key={entry.id}
                style={{
                  padding: '0.75rem 1rem',
                  border: '1px solid var(--border-soft)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <strong>
                    {entry.authorName}
                    {entry.isStaff ? ` · ${t('admin.tickets.staff')}` : ''}
                  </strong>
                  <span style={{ fontSize: '12px', color: 'var(--text-faint)' }}>
                    {format.date(entry.createdAt)}
                  </span>
                </div>
                <p style={{ margin: '0.4rem 0 0', whiteSpace: 'pre-wrap' }}>{entry.body}</p>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem' }}>
          <textarea
            className="note-editor"
            rows={4}
            value={reply}
            placeholder={t('admin.tickets.replyPlaceholder')}
            onChange={(e) => setReply(e.target.value)}
          />
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              type="button"
              className="cta-primary"
              onClick={() => void sendReply()}
              disabled={sending || !reply.trim()}
            >
              {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}{' '}
              {t('admin.tickets.sendReply')}
            </button>
            {saved ? <span className="form-success">{saved}</span> : null}
          </div>
        </div>
      </article>
    </div>
  );
}