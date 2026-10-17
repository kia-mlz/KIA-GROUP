import { BadRequestException, Injectable } from '@nestjs/common';
import type { ContactFormDto, ContactFormResponse } from '@kia./shared';
import { containsUnsafeText, isValidEmail, sanitizeProfileText } from '@kia./shared';
import { EmailService } from '@kia./platform';
import { PrismaService } from '@kia./platform';
import { SiteSettingsService } from '@kia./platform';

/** Strip control chars but keep newlines/tabs; cap length. */
function sanitizeMultiline(value: string, maxLength: number): string {
  return Array.from(String(value ?? ''))
    .filter((ch) => ch === '\n' || ch === '\t' || (ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) !== 127))
    .join('')
    .trim()
    .slice(0, maxLength);
}

@Injectable()
export class ContactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly siteSettings: SiteSettingsService,
  ) {}

  async submit(dto: ContactFormDto): Promise<ContactFormResponse> {
    const name = sanitizeProfileText(dto.name, 120);
    const subject = sanitizeProfileText(dto.subject, 200);
    const message = sanitizeMultiline(dto.message, 5000);
    const email = String(dto.email ?? '').trim().toLowerCase();

    if (!name || !subject || !message) {
      throw new BadRequestException('All fields are required');
    }
    if (!isValidEmail(email) || containsUnsafeText(email)) {
      throw new BadRequestException('Invalid email address');
    }
    if (
      containsUnsafeText(name) ||
      containsUnsafeText(subject) ||
      containsUnsafeText(message)
    ) {
      throw new BadRequestException('Message contains unsafe content');
    }

    await this.prisma.contactMessage.create({
      data: {
        name,
        email,
        subject,
        message,
      },
    });

    const settings = await this.siteSettings.get();
    await this.emailService.sendContactForm(settings.general.supportEmail, {
      name,
      email,
      subject,
      message,
    });

    return {
      ok: true,
      message: 'Message received',
    };
  }
}
