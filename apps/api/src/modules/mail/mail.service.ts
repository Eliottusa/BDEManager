import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import {
  EventConfirmationTemplateData,
  EventReminderTemplateData,
  GenericTemplateData,
  MailTemplateResult,
  WelcomeTemplateData,
  mailTemplates,
} from './mail.templates';

const DEFAULT_SMTP_PORT = 1025;
const EMAIL_RFC5322_PATTERN =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

@Injectable()
export class MailService {
  private readonly transporter: Transporter;
  private readonly defaultFrom: string;

  constructor(private readonly config: ConfigService) {
    const host = config.get('SMTP_HOST', 'localhost');
    const portValue = Number(config.get('SMTP_PORT', DEFAULT_SMTP_PORT));
    const port = Number.isNaN(portValue) ? DEFAULT_SMTP_PORT : portValue;
    const user =
      // Trim to avoid auth failures when env vars include copy/paste whitespace.
      config.get<string>('SMTP_USER')?.trim() ?? '';
    const pass = config.get<string>('SMTP_PASS') ?? '';
    const hasUser = user.length > 0;
    const hasPass = pass.length > 0;
    if (hasUser !== hasPass) {
      const missing = hasUser ? 'SMTP_PASS' : 'SMTP_USER';
      throw new Error(
        `SMTP authentication configuration error: ${missing} is missing. Both SMTP_USER and SMTP_PASS must be provided together, or both omitted for unauthenticated connections.`,
      );
    }
    this.defaultFrom = config.get(
      'SMTP_FROM',
      'BDE Manager <noreply@bde-manager.fr>',
    );

    this.transporter = createTransport({
      host,
      port,
      secure: port === 465,
      auth: hasUser ? { user, pass } : undefined,
    });
  }

  async sendWelcome(to: string, data: WelcomeTemplateData) {
    const template = mailTemplates.welcome(data);
    await this.send(to, template);
  }

  async sendEventConfirmation(
    to: string,
    data: EventConfirmationTemplateData,
  ) {
    const template = mailTemplates.eventConfirmation(data);
    await this.send(to, template);
  }

  async sendEventReminder(to: string, data: EventReminderTemplateData) {
    const template = mailTemplates.eventReminder(data);
    await this.send(to, template);
  }

  async sendGeneric(to: string, data: GenericTemplateData) {
    const template = mailTemplates.generic(data);
    await this.send(to, template);
  }

  private async send(to: string, template: MailTemplateResult) {
    const recipient = to.trim();
    this.ensureValidEmail(recipient);
    const recipientForLog = this.formatRecipientForLog(recipient);

    try {
      await this.transporter.sendMail({
        to: recipient,
        from: this.defaultFrom,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to send email to ${recipientForLog} (subject: ${template.subject}): ${message}`,
      );
    }
  }

  private ensureValidEmail(value: string) {
    if (!EMAIL_RFC5322_PATTERN.test(value)) {
      throw new Error(
        `Invalid email address provided: ${this.formatRecipientForLog(value)}`,
      );
    }
  }

  private formatRecipientForLog(value: string) {
    const atIndex = value.lastIndexOf('@');
    if (atIndex <= 0 || atIndex === value.length - 1) {
      return 'invalid-address';
    }
    const local = value.slice(0, atIndex);
    const domain = value.slice(atIndex + 1);
    if (!local || !domain) {
      return 'invalid-address';
    }
    return `${this.maskLocalPart(local)}@${domain}`;
  }

  private maskLocalPart(local: string) {
    if (local.length === 1) {
      return `${local}*`;
    }
    if (local.length === 2) {
      return `${local[0]}*`;
    }
    return `${local.slice(0, 2)}***`;
  }
}
