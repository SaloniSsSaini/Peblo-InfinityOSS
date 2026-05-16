import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { cacheKeys } from '../cache/cache-keys';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { SearchQueryDto } from './dto/search-query.dto';

const SEARCH_CACHE_TTL = 60;

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async search(userId: string, query: SearchQueryDto) {
    const workspaceId = query.workspaceId.trim();
    const q = query.q.trim();
    const limit = query.limit ?? 8;

    await this.assertMember(workspaceId, userId);

    const cacheKey = cacheKeys.search(workspaceId, q, limit);
    const cached = await this.cache.get<Awaited<ReturnType<SearchService['searchUncached']>>>(
      cacheKey,
    );
    if (cached) {
      return cached;
    }

    const result = await this.searchUncached(workspaceId, q, limit);
    await this.cache.set(cacheKey, result, SEARCH_CACHE_TTL);
    return result;
  }

  private async searchUncached(workspaceId: string, q: string, limit: number) {

    const textFilter: Prisma.StringFilter = { contains: q, mode: 'insensitive' };

    const [notes, tasks] = await Promise.all([
      this.prisma.note.findMany({
        where: {
          workspaceId,
          OR: [{ title: textFilter }, { content: textFilter }],
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        select: {
          id: true,
          title: true,
          content: true,
          tags: true,
          updatedAt: true,
        },
      }),
      this.prisma.task.findMany({
        where: {
          workspaceId,
          OR: [{ title: textFilter }, { description: textFilter }],
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      query: q,
      notes: notes.map((note) => ({
        type: 'note' as const,
        id: note.id,
        title: note.title,
        snippet: this.buildSnippet(this.stripHtml(note.content), q),
        tags: note.tags,
        updatedAt: note.updatedAt,
      })),
      tasks: tasks.map((task) => ({
        type: 'task' as const,
        id: task.id,
        title: task.title,
        snippet: this.buildSnippet(task.description ?? '', q),
        status: task.status,
        updatedAt: task.updatedAt,
      })),
    };
  }

  private buildSnippet(text: string, query: string): string {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (!normalized) return '';
    const lower = normalized.toLowerCase();
    const qLower = query.toLowerCase();
    const idx = lower.indexOf(qLower);
    const radius = 60;
    if (idx >= 0) {
      const start = Math.max(0, idx - radius);
      const end = Math.min(normalized.length, idx + query.length + radius);
      const slice = normalized.slice(start, end);
      const prefix = start > 0 ? '…' : '';
      const suffix = end < normalized.length ? '…' : '';
      return `${prefix}${slice}${suffix}`;
    }
    return normalized.length > 140 ? `${normalized.slice(0, 139)}…` : normalized;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private async assertMember(workspaceId: string, userId: string) {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
    });
    if (!member) {
      throw new ForbiddenException('Not a member of this workspace');
    }
  }
}
