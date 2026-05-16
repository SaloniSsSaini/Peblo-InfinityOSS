import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cacheKeys } from '../cache/cache-keys';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { ListAiLogsQueryDto } from './dto/list-ai-logs-query.dto';

const USAGE_WINDOW_MS = 24 * 60 * 60 * 1000;
const AI_USAGE_CACHE_TTL = 15;
const PROMPT_PREVIEW_LEN = 160;
const RESPONSE_PREVIEW_LEN = 280;

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly cache: CacheService,
  ) {}

  dailyRequestLimit(): number {
    const raw = this.config.get<string>('AI_DAILY_REQUEST_LIMIT');
    const n = raw ? Number(raw) : 50;
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 50;
  }

  async getUsage(userId: string) {
    const cacheKey = cacheKeys.aiUsage(userId);
    const cached = await this.cache.get<Awaited<ReturnType<AiService['computeUsage']>>>(cacheKey);
    if (cached) return cached;
    const usage = await this.computeUsage(userId);
    await this.cache.set(cacheKey, usage, AI_USAGE_CACHE_TTL);
    return usage;
  }

  private async computeUsage(userId: string) {
    const limit = this.dailyRequestLimit();
    const since = new Date(Date.now() - USAGE_WINDOW_MS);
    const usedLast24h = await this.prisma.aiLog.count({
      where: { userId, createdAt: { gte: since } },
    });
    return {
      usedLast24h,
      limit,
      remaining: Math.max(0, limit - usedLast24h),
      windowHours: 24,
    };
  }

  async listLogs(userId: string, query: ListAiLogsQueryDto) {
    const limit = query.limit ?? 20;
    const usage = await this.getUsage(userId);

    let cursorWhere: object | undefined;
    if (query.cursor) {
      const anchor = await this.prisma.aiLog.findFirst({
        where: { id: query.cursor, userId },
      });
      if (anchor) {
        cursorWhere = {
          OR: [
            { createdAt: { lt: anchor.createdAt } },
            {
              AND: [{ createdAt: anchor.createdAt }, { id: { lt: anchor.id } }],
            },
          ],
        };
      }
    }

    const rows = await this.prisma.aiLog.findMany({
      where: cursorWhere ? { userId, ...cursorWhere } : { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return {
      usage,
      items: page.map((row) => this.toLogListItem(row)),
      nextCursor: hasMore ? page[page.length - 1]!.id : null,
    };
  }

  async getLog(logId: string, userId: string) {
    const row = await this.prisma.aiLog.findFirst({
      where: { id: logId, userId },
    });
    if (!row) {
      throw new NotFoundException('AI log not found');
    }
    return {
      id: row.id,
      model: row.model,
      tokens: row.tokens,
      createdAt: row.createdAt,
      noteTitle: this.extractNoteTitle(row.prompt),
      prompt: row.prompt,
      response: row.response,
    };
  }

  async summarize(noteId: string, userId: string) {
    const usage = await this.computeUsage(userId);
    if (usage.remaining <= 0) {
      throw new HttpException(
        `AI request quota exceeded (${usage.limit} per ${usage.windowHours}h). Try again later.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const note = await this.prisma.note.findUnique({ where: { id: noteId } });
    if (!note) {
      throw new NotFoundException('Note not found');
    }
    const member = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId: note.workspaceId, userId },
    });
    if (!member) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    const plain = this.stripHtml(note.content).slice(0, 12_000);
    const userPrompt = `Title: ${note.title}\n\nBody:\n${plain}`;
    const system =
      'You are a concise assistant. Summarize the following note for a busy reader in 5–8 short bullet points or one tight paragraph. Match the source language when possible.';

    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    let summary: string;
    let model = 'gpt-4o-mini';
    let tokens: number | undefined;

    if (!apiKey) {
      summary = this.offlineSummary(note.title, plain);
      model = 'offline-heuristic';
    } else {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.25,
          max_tokens: 700,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new BadRequestException(
          `OpenAI error ${res.status}: ${errText.slice(0, 240)}`,
        );
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { total_tokens?: number };
      };
      summary =
        data.choices?.[0]?.message?.content?.trim() || 'No summary returned.';
      tokens = data.usage?.total_tokens;
    }

    await this.prisma.aiLog.create({
      data: {
        userId,
        model,
        prompt: userPrompt.slice(0, 8000),
        response: summary.slice(0, 8000),
        tokens: tokens ?? null,
      },
    });
    await this.cache.del(cacheKeys.aiUsage(userId));

    return { summary, model, tokensUsed: tokens ?? null };
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private extractNoteTitle(prompt: string): string | null {
    const match = /^Title:\s*(.+?)(?:\n|$)/m.exec(prompt);
    const title = match?.[1]?.trim();
    return title?.length ? title : null;
  }

  private truncate(text: string, max: number): string {
    if (text.length <= max) return text;
    return `${text.slice(0, max - 1)}…`;
  }

  private toLogListItem(row: {
    id: string;
    model: string;
    prompt: string;
    response: string;
    tokens: number | null;
    createdAt: Date;
  }) {
    return {
      id: row.id,
      model: row.model,
      tokens: row.tokens,
      createdAt: row.createdAt,
      noteTitle: this.extractNoteTitle(row.prompt),
      promptPreview: this.truncate(row.prompt, PROMPT_PREVIEW_LEN),
      responsePreview: this.truncate(row.response, RESPONSE_PREVIEW_LEN),
    };
  }

  private offlineSummary(title: string, body: string): string {
    const head = body.slice(0, 420);
    return [
      'Demo summary (no OPENAI_API_KEY — add the key in apps/api/.env for live AI):',
      '',
      `• Title: ${title}`,
      `• Excerpt: ${head}${body.length > 420 ? '…' : ''}`,
      '',
      'Tip: summaries are stored in AiLog once OpenAI is configured.',
    ].join('\n');
  }
}
