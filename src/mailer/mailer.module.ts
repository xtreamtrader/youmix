import { Module } from '@nestjs/common';
import { MailerService } from './mailer.service';

@Module({})
export class MailerModule {
  exports: [MailerService];
}
