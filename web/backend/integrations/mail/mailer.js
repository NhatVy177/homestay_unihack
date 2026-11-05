import nodemailer from 'nodemailer';
// Q-08 still open: without SMTP_* the mailer runs in dev-log mode (prints the message, sends nothing).
// MAIL_REDIRECT_TO sends every demo email to one inbox so seed addresses are never contacted.
export function createMailer(env = process.env, transport) {
  const smtp = Boolean(env.SMTP_HOST);
  const mode = transport ? 'custom' : smtp ? 'smtp' : 'dev-log';
  transport ||= smtp
    ? nodemailer.createTransport({
      host: env.SMTP_HOST, port: Number(env.SMTP_PORT || 587), secure: env.SMTP_SECURE === 'true',
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
    : nodemailer.createTransport({ jsonTransport: true });
  const from = env.MAIL_FROM || 'HomeStayDorm <no-reply@homestaydorm.local>';
  return {
    mode,
    async send({ to, subject, text, attachments = [] }) {
      const recipient = env.MAIL_REDIRECT_TO || to;
      if (!recipient) return { status: 'skipped' };
      const info = await transport.sendMail({ from, to: recipient, subject, text, attachments });
      if (mode === 'dev-log') console.info('[mail:dev-log] %s\n%s\n(đính kèm: %d)', subject, text, attachments.length);
      return { status: mode === 'dev-log' ? 'logged' : 'sent', messageId: info.messageId };
    },
  };
}
