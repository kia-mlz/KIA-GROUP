import { BadRequestException } from '@nestjs/common';
import {
  containsProgrammingCode,
  MAX_TICKET_ATTACHMENT_BYTES,
  MAX_TICKET_ATTACHMENTS,
  isAllowedTicketAttachment,
} from '@kia./shared';
import { TicketAttachmentStorageService } from './ticket-attachment-storage.service';

describe('TicketAttachmentStorageService', () => {
  const service = new TicketAttachmentStorageService();

  it('rejects oversized and disallowed files', () => {
    expect(() =>
      service.assertFile({
        originalname: 'virus.exe',
        mimetype: 'application/octet-stream',
        size: 100,
        buffer: Buffer.from([0x4d, 0x5a]),
      } as Express.Multer.File),
    ).toThrow(BadRequestException);

    expect(() =>
      service.assertFile({
        originalname: 'big.png',
        mimetype: 'image/png',
        size: MAX_TICKET_ATTACHMENT_BYTES + 1,
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      } as Express.Multer.File),
    ).toThrow(BadRequestException);
  });

  it('accepts a valid PNG and enforces attachment count', () => {
    const png = {
      originalname: 'shot.png',
      mimetype: 'image/png',
      size: 8,
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    } as Express.Multer.File;

    expect(() => service.assertFile(png)).not.toThrow();
    expect(isAllowedTicketAttachment(png.originalname, png.mimetype)).toBe(true);

    const tooMany = Array.from({ length: MAX_TICKET_ATTACHMENTS + 1 }, () => png);
    expect(() => service.assertFiles(tooMany)).toThrow(BadRequestException);
  });

  it('rejects mismatched magic bytes for images', () => {
    expect(() =>
      service.assertFile({
        originalname: 'fake.png',
        mimetype: 'image/png',
        size: 4,
        buffer: Buffer.from([0x00, 0x01, 0x02, 0x03]),
      } as Express.Multer.File),
    ).toThrow(BadRequestException);
  });
});

describe('ticket code gate', () => {
  it('flags programming code while allowing normal text', () => {
    expect(containsProgrammingCode('const x = 1;\nfunction run() { return x; }')).toBe(true);
    expect(containsProgrammingCode('Order #12345 failed on 2024-08-01')).toBe(false);
  });
});
