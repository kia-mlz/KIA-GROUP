'use client';

import { useState } from 'react';
import type { TicketAttachmentDto } from '@kia./shared';
import { formatFileSize } from '@kia./shared';
import { FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { getAccessToken } from '@/lib/auth';

async function downloadAuthenticated(url: string, fileName: string) {
  const token = getAccessToken();
  const response = await fetch(url, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`);
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = 'noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export function TicketAttachmentList({
  attachments,
}: {
  attachments: TicketAttachmentDto[];
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  if (!attachments?.length) return null;

  return (
    <ul className="ticket-attachments__list ticket-attachments__list--sent">
      {attachments.map((item) => {
        const isImage = item.mimeType.startsWith('image/');
        const busy = busyId === item.id;
        return (
          <li key={item.id} className="ticket-attachments__item">
            {isImage ? <ImageIcon size={16} aria-hidden /> : <FileText size={16} aria-hidden />}
            <div>
              <button
                type="button"
                className="ticket-attachments__link"
                disabled={busy}
                onClick={() => {
                  setErrorId(null);
                  setBusyId(item.id);
                  void downloadAuthenticated(item.url, item.fileName)
                    .catch(() => setErrorId(item.id))
                    .finally(() => setBusyId(null));
                }}
              >
                {busy ? <Loader2 size={14} className="spin" aria-hidden /> : null}
                {item.fileName}
              </button>
              <span className="panel-muted">
                {' '}
                · {item.mimeType || 'file'} · {formatFileSize(item.sizeBytes)}
                {errorId === item.id ? ' · دانلود ناموفق' : ''}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
