interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export class EmailService {
  static async sendMail(options: SendMailOptions): Promise<boolean> {
    if (process.env.MAIL_WEBHOOK_URL) {
      const response = await fetch(process.env.MAIL_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.MAIL_WEBHOOK_TOKEN
            ? { Authorization: `Bearer ${process.env.MAIL_WEBHOOK_TOKEN}` }
            : {}),
        },
        body: JSON.stringify({
          from: process.env.MAIL_FROM || 'noreply@urbanpiper.local',
          ...options,
        }),
      });

      if (!response.ok) {
        throw new Error(`Mail webhook failed with status ${response.status}`);
      }

      return true;
    }

    console.info('[mail skipped] Configure MAIL_WEBHOOK_URL to send email.', {
      to: options.to,
      subject: options.subject,
      text: options.text,
    });
    return false;
  }
}
