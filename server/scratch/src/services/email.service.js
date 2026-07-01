import nodemailer from "nodemailer";
export class EmailService {
    static transporter = null;
    static getTransporter() {
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
            throw new Error('Unable to fetch environment variable.');
        }
        if (!this.transporter) {
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT || 587),
                secure: Number(process.env.SMTP_PORT || 587) === 465,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
        }
        return this.transporter;
    }
    static async sendMail(options) {
        const transporter = this.getTransporter();
        await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html,
        });
        console.info('Mail send to email.', {
            to: options.to,
            subject: options.subject,
            text: options.text,
        });
        return true;
    }
}
