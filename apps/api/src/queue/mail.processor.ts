import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MailService, type PasswordResetEmailParams } from '../mail/mail.service';
import { MAIL_JOB_PASSWORD_RESET, MAIL_QUEUE } from './mail-queue.service';

@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mail: MailService) {
    super();
  }

  async process(job: Job<PasswordResetEmailParams>): Promise<void> {
    if (job.name === MAIL_JOB_PASSWORD_RESET) {
      await this.mail.sendPasswordReset(job.data);
      return;
    }
    this.logger.warn(`Unknown mail job: ${job.name}`);
  }
}
