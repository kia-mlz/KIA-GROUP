'use client';

import type { TicketAttachmentDto } from '@kia./shared';
import { formatFileSize } from '@kia./shared';
import { FileText, Image as ImageIcon } from 'lucide-react';

export function TicketAttachmentList({
  attachments,
}: {
  attachments: TicketAttachmentDto[];
}) {
  if (!attachments?.length) return null;

  return (
    <ul className="ticket-attachments__list ticket-attachments__list--sent">
      {attachments.map((item) => {
        const isImage = item.mimeType.startsWith('image/');
        return (
          <li key={item.id} className="ticket-attachments__item">
            {isImage ? <ImageIcon size={16} aria-hidden /> : <FileText size={16} aria-hidden />}
            <div>
              <a href={item.url} target="_blank" rel="noreferrer">
                {item.fileName}
              </a>
              <span className="panel-muted">
                {' '}
                · {item.mimeType || 'file'} · {formatFileSize(item.sizeBytes)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
