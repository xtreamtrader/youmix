import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as ejs from 'ejs';
import { mailgunTransport } from './transports';
import { IMailTemplate } from './mailer.interface';
import { mailerConfig } from 'src/config/mailer.config';
import { pathToS3Url } from 'src/common/transforms/s3.transform';
import { tokenToUrl } from 'src/common/transforms/verificationToken.transform';
import { ETemplateName } from './templates/template.enum';
import * as fs from 'fs';

@Injectable()
export class MailerService {
  private transport = nodemailer.createTransport(mailgunTransport);

  /**
   * A single storage under a generic Map object whose key is a predefined enum of 
   * template's name and value is a TemplateFunction returned from ejs.compile
   */
  private compiledTemplates: Map<ETemplateName, ejs.TemplateFunction>;

  constructor() {
    // Read valid ejs template files from templates folder and store in a Map

    // Retrieve the list of filenames contained in templates folder
    const filesArray = fs.readdirSync(__dirname + '/templates', {
      encoding: 'utf8',
    });

    // Loop through the array of filenames and `reduce` into a single storage
    this.compiledTemplates = filesArray.reduce((acc, cur) => {
      if (cur.toLowerCase().endsWith('.ejs')) {
        acc.set(
          cur.split('.ejs')[0] as ETemplateName,
          ejs.compile(fs.readFileSync(__dirname + `/templates/${cur}`, 'utf8')),
        );
      }

      return acc;
    }, new Map<ETemplateName, ejs.TemplateFunction>());
  }

  /**
   * A public function which is used to send a template email to a recipent
   *
   * Internally use nodemailer.sendMail to handle the action
   * @param recipient
   * @param template
   * @param attachments
   */
  sendMail(
    recipient: string | string[],
    template: IMailTemplate,
    attachments?: [],
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.transport.sendMail(
        {
          from: template.from,
          to: recipient,
          subject: template.subject,
          html: template.html,
          attachments: attachments,
        },
        err => {
          if (err) reject(err);
          resolve();
        },
      );
    });
  }

  /**
   * Create an email template for sending verificationToken after signing up
   * @param userId
   * @param token
   */
  createSignUpVerificationToken(userId: string, token: string): IMailTemplate {
    const template = this.compiledTemplates.get(
      ETemplateName.SIGNUP_VERIFICATION_TOKEN,
    );

    const html = template({
      logoPath: pathToS3Url('logo.png'),
      verificationLink: tokenToUrl(userId, token),
    });

    return {
      from: mailerConfig.fromList.NO_REPLY,
      subject:
        '[Youmix] Please confirm  email address to complete the registration',
      html: html,
    };
  }

  /**
   * Create an email template for sending verificationToken after user requested a password recovery
   * @param userId
   * @param username
   * @param token
   */
  createRequestResetPasswordVerificationToken(
    userId: string,
    username: string,
    token: string,
  ): IMailTemplate {
    const template = this.compiledTemplates.get(
      ETemplateName.REQUEST_RESET_PASSWORD_VERIFICATION_TOKEN,
    );

    const html = template({
      logoPath: pathToS3Url('logo.png'),
      verificationLink: tokenToUrl(userId, token),
      username: username,
    });

    return {
      from: mailerConfig.fromList.NO_REPLY,
      subject: '[Youmix] Account credentials recovery',
      html: html,
    };
  }
}
