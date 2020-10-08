import * as mg from 'nodemailer-mailgun-transport';
import { mailerConfig } from 'src/config/mailer.config';

export const mailgunTransport = mg({
  auth: mailerConfig.mailgun,
});
