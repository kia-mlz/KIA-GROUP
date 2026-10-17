'use client';

import type { CourseSummary } from '@kia./shared';
import {
  containsProgrammingCode,
  isAllowedTicketAttachment,
  MAX_TICKET_ATTACHMENT_BYTES,
  MAX_TICKET_ATTACHMENTS,
} from '@kia./shared';
import { Loader2, Ticket } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { DashboardGate, PanelPage } from '@/components/dashboard/DashboardShell';
import {
  TicketAttachmentPicker,
  type SelectedAttachment,
} from '@/components/dashboard/TicketAttachmentPicker';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';
import { localizeCourse } from '@/lib/courseLocalization';

function NewTicketForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useLanguage();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [courseSlug, setCourseSlug] = useState(searchParams.get('course') ?? '');
  const [attachments, setAttachments] = useState<SelectedAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listMyCourses().then(setCourses).catch(() => setCourses([]));
  }, []);

  const handleAttachmentsChange = (next: SelectedAttachment[]) => {
    setAttachmentError('');
    if (next.length > MAX_TICKET_ATTACHMENTS) {
      setAttachmentError(t('panel.tickets.attachmentLimit'));
      return;
    }
    for (const item of next) {
      if (!isAllowedTicketAttachment(item.file.name, item.file.type)) {
        setAttachmentError(t('panel.tickets.attachmentType'));
        return;
      }
      if (item.file.size > MAX_TICKET_ATTACHMENT_BYTES) {
        setAttachmentError(t('panel.tickets.attachmentSize'));
        return;
      }
    }
    setAttachments(next);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError('');
    if (containsProgrammingCode(subject) || containsProgrammingCode(body)) {
      setError(t('panel.tickets.codeBlocked'));
      return;
    }
    setSaving(true);
    try {
      const ticket = await api.createTicket(
        {
          subject: subject.trim(),
          body: body.trim(),
          courseSlug: courseSlug || undefined,
        },
        attachments.map((item) => item.file),
      );
      router.replace(`/dashboard/tickets/${ticket.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('panel.tickets.saveError'));
      setSaving(false);
    }
  };

  return (
    <PanelPage
      eyebrow={
        <>
          <Ticket size={14} className="inline-leading-icon" />
          {t('panel.nav.newTicket')}
        </>
      }
      title={t('panel.tickets.newTitle')}
      sub={t('panel.tickets.newSub')}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>{t('panel.tickets.subject')}</span>
          <input
            className="input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            minLength={3}
            maxLength={160}
          />
        </label>
        <label className="field">
          <span>{t('panel.tickets.course')}</span>
          <select
            className="input"
            value={courseSlug}
            onChange={(e) => setCourseSlug(e.target.value)}
          >
            <option value="">{t('panel.tickets.general')}</option>
            {courses.map((course) => (
              <option key={course.id} value={course.slug}>
                {localizeCourse(course, locale).title}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t('panel.tickets.body')}</span>
          <textarea
            className="input"
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            minLength={10}
            maxLength={5000}
          />
        </label>
        <TicketAttachmentPicker
          files={attachments}
          onChange={handleAttachmentsChange}
          label={t('panel.tickets.attachments')}
          hint={t('panel.tickets.attachmentsHint')}
          removeLabel={t('panel.tickets.removeAttachment')}
          error={attachmentError}
        />
        {error ? <p className="form-error">{error}</p> : null}
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? t('common.saving') : t('panel.tickets.submit')}
        </button>
      </form>
    </PanelPage>
  );
}

export default function NewTicketPage() {
  const { t } = useLanguage();
  return (
    <DashboardGate nextPath="/dashboard/tickets/new">
      <Suspense
        fallback={
          <div className="page-content auth-loading">
            <Loader2 size={24} className="spin" /> {t('common.loading')}
          </div>
        }
      >
        <NewTicketForm />
      </Suspense>
    </DashboardGate>
  );
}
