import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Optional } from '@nestjs/common';
import { Queue } from 'bullmq';
import { MailService, type PasswordResetEmailParams } from '../mail/mail.service';

export const MAIL_QUEUE = 'mail';
export const MAIL_JOB_PASSWORD_RESET = 'password-reset';

@Injectable()
export class MailQueueService {
  constructor(
    private readonly mail: MailService,
    @Optional() @InjectQueue(MAIL_QUEUE) private readonly mailQueue?: Queue,
  ) {}

  isQueueEnabled(): boolean {
    return Boolean(this.mailQueue);
  }

  isConfigured(): boolean {
    return this.mail.isConfigured();
  }

  async sendPasswordReset(params: PasswordResetEmailParams): Promise<void> {
    if (this.mailQueue) {
      await this.mailQueue.add(MAIL_JOB_PASSWORD_RESET, params, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      });
      return;
    }
    await this.mail.sendPasswordReset(params);
  }
}
