import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtUser } from '../auth/jwt.strategy';
import { AiService } from './ai.service';
import { ListAiLogsQueryDto } from './dto/list-ai-logs-query.dto';
import { SummarizeNoteDto } from './dto/summarize-note.dto';

@ApiTags('ai')
@ApiBearerAuth()
@Throttle({ default: { limit: 20, ttl: 60_000 } })
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('usage')
  @ApiOperation({ summary: 'AI usage quota (rolling 24h window)' })
  usage(@Req() req: Request & { user: JwtUser }) {
    return this.ai.getUsage(req.user.userId);
  }

  @Get('logs')
  @ApiOperation({ summary: 'List current user AiLog history (paginated)' })
  listLogs(
    @Query() query: ListAiLogsQueryDto,
    @Req() req: Request & { user: JwtUser },
  ) {
    return this.ai.listLogs(req.user.userId, query);
  }

  @Get('logs/:id')
  @ApiOperation({ summary: 'Get one AiLog entry (full prompt/response)' })
  getLog(@Param('id') id: string, @Req() req: Request & { user: JwtUser }) {
    return this.ai.getLog(id, req.user.userId);
  }

  @Post('summarize')
  @ApiOperation({ summary: 'Summarize a note (workspace member); logs to AiLog' })
  summarize(
    @Body() dto: SummarizeNoteDto,
    @Req() req: Request & { user: JwtUser },
  ) {
    return this.ai.summarize(dto.noteId, req.user.userId);
  }
}
