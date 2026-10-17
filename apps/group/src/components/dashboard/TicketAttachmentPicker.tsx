'use client';

import {
  formatFileSize,
  isAllowedTicketAttachment,
  MAX_TICKET_ATTACHMENT_BYTES,
  MAX_TICKET_ATTACHMENTS,
} from '@kia./shared';
import { Paperclip, X } from 'lucide-react';
import { useRef } from 'react';

export type SelectedAttachment = {
  id: string;
  file: File;
};

type TicketAttachmentPickerProps = {
  files: SelectedAttachment[];
  onChange: (files: SelectedAttachment[]) => void;
  label: string;
  hint: string;
  removeLabel: string;
  error?: string;
};

export function TicketAttachmentPicker({
  files,
  onChange,
  label,
  hint,
  removeLabel,
  error,
}: TicketAttachmentPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const next = [...files];
    for (const file of Array.from(list)) {
      if (next.length >= MAX_TICKET_ATTACHMENTS) break;
      if (!isAllowedTicketAttachment(file.name, file.type)) continue;
      if (file.size > MAX_TICKET_ATTACHMENT_BYTES) continue;
      next.push({ id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`, file });
    }
    onChange(next);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="ticket-attachments">
      <div className="ticket-attachments__header">
        <span>{label}</span>
        <button
          type="button"
          className="btn btn--ghost ticket-attachments__add"
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip size={16} aria-hidden />
          {label}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.rtf,image/*,application/pdf,text/plain"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>
      <p className="form-hint">{hint}</p>
      {error ? <p className="form-error">{error}</p> : null}
      {files.length ? (
        <ul className="ticket-attachments__list">
          {files.map((item) => (
            <li key={item.id} className="ticket-attachments__item">
              <div>
                <strong>{item.file.name}</strong>
                <span className="panel-muted">
                  {' '}
                  · {item.file.type || 'file'} · {formatFileSize(item.file.size)}
                </span>
              </div>
              <button
                type="button"
                className="text-btn"
                aria-label={`${removeLabel}: ${item.file.name}`}
                onClick={() => onChange(files.filter((f) => f.id !== item.id))}
              >
                <X size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
