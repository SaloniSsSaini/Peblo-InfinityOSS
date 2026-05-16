import { Logger } from '@nestjs/common';
import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'ws';

@WebSocketGateway({ path: '/ws' })
export class CollaborationGateway {
  private readonly logger = new Logger(CollaborationGateway.name);

  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('ping')
  handlePing(@MessageBody() data: unknown) {
    this.logger.debug('ping');
    return { event: 'pong', data };
  }
}
