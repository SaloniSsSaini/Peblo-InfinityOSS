import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MAIL_QUEUE, MailQueueService } from './mail-queue.service';
import { MailProcessor } from './mail.processor';

const redisEnabled = Boolean(process.env.REDIS_URL?.trim());

@Module({
  imports: [
    ...(redisEnabled
      ? [
          BullModule.registerQueue({
            name: MAIL_QUEUE,
          }),
        ]
      : []),
  ],
  providers: [
    MailQueueService,
    ...(redisEnabled ? [MailProcessor] : []),
  ],
  exports: [MailQueueService],
})
export class QueueModule {}
