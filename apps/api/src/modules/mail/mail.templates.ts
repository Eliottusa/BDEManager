export type MailTemplateResult = {
  subject: string;
  html: string;
  text: string;
};

export type WelcomeTemplateData = {
  firstName?: string;
};

export type EventConfirmationTemplateData = {
  firstName?: string;
  eventName: string;
  eventDate?: string;
  eventLocation?: string;
  actionUrl?: string;
};

export type EventReminderTemplateData = {
  firstName?: string;
  eventName: string;
  eventDate?: string;
  eventLocation?: string;
  actionUrl?: string;
};

export type GenericTemplateData = {
  subject: string;
  heading?: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
  footer?: string;
};

const DEFAULT_ACTION_LABEL = 'Voir les détails';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const sanitizeHeader = (value: string) => value.replace(/[\r\n]+/g, ' ').trim();

const formatGreeting = (firstName?: string) =>
  firstName ? `Bonjour ${firstName},` : 'Bonjour,';

const formatEventDetailsText = (
  eventDate?: string,
  eventLocation?: string,
) => {
  const lines: string[] = [];
  if (eventDate) {
    lines.push(`Date : ${eventDate}`);
  }
  if (eventLocation) {
    lines.push(`Lieu : ${eventLocation}`);
  }
  return lines.join('\n');
};

const formatEventDetailsHtml = (
  eventDate?: string,
  eventLocation?: string,
) => {
  const items: string[] = [];
  if (eventDate) {
    items.push(`<li><strong>Date :</strong> ${escapeHtml(eventDate)}</li>`);
  }
  if (eventLocation) {
    items.push(
      `<li><strong>Lieu :</strong> ${escapeHtml(eventLocation)}</li>`,
    );
  }
  return items.length ? `<ul>${items.join('')}</ul>` : '';
};

const formatBodyHtml = (body: string) => {
  const paragraphs = body
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!paragraphs.length) {
    return '<p>&nbsp;</p>';
  }
  return paragraphs.map((line) => `<p>${escapeHtml(line)}</p>`).join('');
};

const buildTemplate = ({
  subject,
  heading,
  contentHtml,
  contentText,
  actionUrl,
  actionLabel,
  footer,
}: {
  subject: string;
  heading: string;
  contentHtml: string;
  contentText: string;
  actionUrl?: string;
  actionLabel?: string;
  footer?: string;
}): MailTemplateResult => {
  const safeSubjectValue = sanitizeHeader(subject);
  const safeHeading = escapeHtml(heading);
  const safeSubject = escapeHtml(safeSubjectValue);
  const label = actionLabel ?? DEFAULT_ACTION_LABEL;
  const actionHtml = actionUrl
    ? `<p style="margin:24px 0;"><a href="${escapeHtml(actionUrl)}" style="background:#4f46e5;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;display:inline-block;">${escapeHtml(label)}</a></p>`
    : '';
  const actionText = actionUrl ? `\n\n${label}: ${actionUrl}` : '';
  const footerHtml = footer
    ? `<p style="margin-top:24px;color:#6b7280;font-size:13px;">${escapeHtml(footer)}</p>`
    : '';
  const footerText = footer ? `\n\n${footer}` : '';

  return {
    subject: safeSubjectValue,
    html: `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeSubject}</title>
  </head>
  <body style="margin:0;padding:0;background:#f9fafb;font-family:Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;box-shadow:0 4px 12px rgba(15, 23, 42, 0.08);">
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:22px;color:#111827;">${safeHeading}</h1>
                ${contentHtml}
                ${actionHtml}
                ${footerHtml}
              </td>
            </tr>
          </table>
          <p style="margin-top:16px;color:#9ca3af;font-size:12px;">BDE Manager</p>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    text: `${heading}\n\n${contentText}${actionText}${footerText}`,
  };
};

export const mailTemplates = {
  welcome: ({ firstName }: WelcomeTemplateData): MailTemplateResult => {
    const greeting = formatGreeting(firstName);
    const subject = 'Bienvenue sur BDE Manager';
    const bodyText =
      'Votre compte est bien créé. Vous pouvez dès maintenant découvrir les prochains événements et gérer vos inscriptions.';
    const contentText = `${greeting}\n\n${bodyText}`;
    const contentHtml = `${formatBodyHtml(greeting)}${formatBodyHtml(bodyText)}`;
    return buildTemplate({
      subject,
      heading: 'Bienvenue !',
      contentHtml,
      contentText,
      footer:
        "Si vous n'êtes pas à l'origine de cette inscription, ignorez simplement cet email.",
    });
  },
  eventConfirmation: ({
    firstName,
    eventName,
    eventDate,
    eventLocation,
    actionUrl,
  }: EventConfirmationTemplateData): MailTemplateResult => {
    const greeting = formatGreeting(firstName);
    const subject = `Inscription confirmée : ${eventName}`;
    const detailsText = formatEventDetailsText(eventDate, eventLocation);
    const detailsHtml = formatEventDetailsHtml(eventDate, eventLocation);
    const contentText = `${greeting}\n\nVotre inscription à l'événement "${eventName}" est confirmée.${
      detailsText ? `\n\n${detailsText}` : ''
    }`;
    const contentHtml = `${formatBodyHtml(
      `${greeting}\n\nVotre inscription à l'événement "${eventName}" est confirmée.`,
    )}${detailsHtml}`;
    return buildTemplate({
      subject,
      heading: 'Inscription confirmée',
      contentHtml,
      contentText,
      actionUrl,
      actionLabel: 'Voir mon inscription',
    });
  },
  eventReminder: ({
    firstName,
    eventName,
    eventDate,
    eventLocation,
    actionUrl,
  }: EventReminderTemplateData): MailTemplateResult => {
    const greeting = formatGreeting(firstName);
    const subject = `Rappel : ${eventName} approche`;
    const detailsText = formatEventDetailsText(eventDate, eventLocation);
    const detailsHtml = formatEventDetailsHtml(eventDate, eventLocation);
    const contentText = `${greeting}\n\nPetit rappel pour l'événement "${eventName}".${
      detailsText ? `\n\n${detailsText}` : ''
    }`;
    const contentHtml = `${formatBodyHtml(
      `${greeting}\n\nPetit rappel pour l'événement "${eventName}".`,
    )}${detailsHtml}`;
    return buildTemplate({
      subject,
      heading: 'Rappel événement',
      contentHtml,
      contentText,
      actionUrl,
    });
  },
  generic: ({
    subject,
    heading,
    body,
    actionUrl,
    actionLabel,
    footer,
  }: GenericTemplateData): MailTemplateResult =>
    buildTemplate({
      subject,
      heading: heading ?? subject,
      contentHtml: formatBodyHtml(body),
      contentText: body,
      actionUrl,
      actionLabel,
      footer,
    }),
};
