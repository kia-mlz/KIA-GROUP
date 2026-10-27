import { BadRequestException, Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import {
  getFileExtension,
  isAllowedTicketAttachment,
  MAX_TICKET_ATTACHMENT_BYTES,
  MAX_TICKET_ATTACHMENTS,
  TICKET_ATTACHMENT_ALLOWED_EXTENSIONS,
} from '@kia./shared';
import { assertSafePathSegment, resolveUnderRoot } from '@kia./platform';

const IMAGE_MAGIC: Array<{ mime: string; bytes: number[] }> = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] },
];

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // %PDF

@Injectable()
export class TicketAttachmentStorageService {
  readonly uploadsRoot = join(process.cwd(), 'uploads');
  readonly ticketsRoot = join(this.uploadsRoot, 'tickets');

  constructor() {
    this.ensureDir(this.uploadsRoot);
    this.ensureDir(this.ticketsRoot);
  }

  assertFiles(files: Express.Multer.File[] | undefined): Express.Multer.File[] {
    if (files !== undefined && !Array.isArray(files)) {
      throw new BadRequestException('Attachments payload is invalid');
    }
    const list = files ?? [];
    if (list.length > MAX_TICKET_ATTACHMENTS) {
      throw new BadRequestException(
        `You can attach at most ${MAX_TICKET_ATTACHMENTS} files`,
      );
    }
    for (const file of list) {
      this.assertFile(file);
    }
    return list;
  }

  assertFile(file: Express.Multer.File): void {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Attachment file is empty');
    }
    if (file.size > MAX_TICKET_ATTACHMENT_BYTES) {
      throw new BadRequestException(
        `Each attachment must be ${MAX_TICKET_ATTACHMENT_BYTES / (1024 * 1024)} MB or smaller`,
      );
    }
    const ext = getFileExtension(file.originalname);
    if (!isAllowedTicketAttachment(file.originalname, file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type. Allowed: ${TICKET_ATTACHMENT_ALLOWED_EXTENSIONS.join(', ')}`,
      );
    }
    if (!this.matchesMagic(file.buffer, file.mimetype, ext)) {
      throw new BadRequestException('File content does not match the declared type');
    }
  }

  saveTicketFiles(
    ticketId: string,
    files: Express.Multer.File[],
  ): Array<{ fileName: string; storedName: string; mimeType: string; sizeBytes: number; url: string }> {
    assertSafePathSegment(ticketId, 'ticket id');
    const dir = resolveUnderRoot(this.uploadsRoot, 'tickets', ticketId);
    this.ensureDir(dir);

    return files.map((file) => {
      const ext = this.resolveExt(file);
      const storedName = `${randomUUID()}${ext}`;
      writeFileSync(join(dir, storedName), file.buffer);
      return {
        fileName: this.sanitizeOriginalName(file.originalname),
        storedName,
        mimeType: file.mimetype || 'application/octet-stream',
        sizeBytes: file.size,
        url: `/api/tickets/${ticketId}/attachments/${storedName}`,
      };
    });
  }

  /** Absolute path for an attachment after ownership has already been checked. */
  resolveStoredFile(ticketId: string, storedName: string): string {
    assertSafePathSegment(ticketId, 'ticket id');
    assertSafePathSegment(storedName, 'attachment name');
    return resolveUnderRoot(this.uploadsRoot, 'tickets', ticketId, storedName);
  }

  private matchesMagic(buffer: Buffer, mimeType: string, ext: string): boolean {
    const mime = (mimeType || '').toLowerCase().split(';')[0]!.trim();
    if (mime.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      const hit = IMAGE_MAGIC.some((rule) => {
        if (mime && mime !== 'application/octet-stream' && rule.mime !== mime) return false;
        return rule.bytes.every((byte, idx) => buffer[idx] === byte);
      });
      // webp also needs WEBP at offset 8
      if (hit && (mime === 'image/webp' || ext === '.webp')) {
        return (
          buffer.length >= 12 &&
          buffer[8] === 0x57 &&
          buffer[9] === 0x45 &&
          buffer[10] === 0x42 &&
          buffer[11] === 0x50
        );
      }
      return hit;
    }
    if (mime === 'application/pdf' || ext === '.pdf') {
      return PDF_MAGIC.every((byte, idx) => buffer[idx] === byte);
    }
    // Office/text documents: extension + MIME allowlist already applied.
    return true;
  }

  private resolveExt(file: Express.Multer.File): string {
    const fromName = getFileExtension(file.originalname);
    if (fromName) return fromName;
    return extname(file.originalname).toLowerCase() || '.bin';
  }

  private sanitizeOriginalName(name: string): string {
    return String(name || 'file')
      .replace(/[\\/]/g, '_')
      .replace(/[^\w.\u0600-\u06FF\s()-]/g, '_')
      .trim()
      .slice(0, 180) || 'file';
  }

  private ensureDir(dir: string) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
}
