import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { cacheKeys } from '../cache/cache-keys';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

type NotePathRow = { id: string; parentId: string | null; title: string };

const NOTES_LIST_CACHE_TTL = 30;

@Injectable()
export class NotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async list(
    workspaceId: string,
    userId: string,
    filters?: { q?: string; tag?: string },
  ) {
    await this.assertMember(workspaceId, userId);
    const q = filters?.q?.trim() ?? '';
    const tag = filters?.tag?.trim() ?? '';

    const cacheKey = cacheKeys.notesList(workspaceId, q, tag);
    const cached = await this.cache.get<Awaited<ReturnType<NotesService['listUncached']>>>(
      cacheKey,
    );
    if (cached) {
      return cached;
    }

    const rows = await this.listUncached(workspaceId, q, tag);
    await this.cache.set(cacheKey, rows, NOTES_LIST_CACHE_TTL);
    return rows;
  }

  private async listUncached(workspaceId: string, q: string, tag: string) {

    const where: Prisma.NoteWhereInput = {
      workspaceId,
      ...(tag ? { tags: { has: tag } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { content: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return this.prisma.note.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        format: true,
        folderPath: true,
        parentId: true,
        tags: true,
        updatedAt: true,
      },
    });
  }

  async getOne(noteId: string, userId: string) {
    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
    });
    if (!note) {
      throw new NotFoundException('Note not found');
    }
    await this.assertMember(note.workspaceId, userId);
    return note;
  }

  async create(workspaceId: string, authorId: string, dto: CreateNoteDto) {
    await this.assertMember(workspaceId, authorId);
    if (dto.parentId) {
      const parent = await this.prisma.note.findFirst({
        where: { id: dto.parentId, workspaceId },
      });
      if (!parent) {
        throw new NotFoundException('Parent note not found');
      }
    }

    const note = await this.prisma.note.create({
      data: {
        workspaceId,
        authorId,
        title: dto.title,
        content: dto.content ?? '',
        format: dto.format ?? 'RICH',
        folderPath: dto.folderPath ?? '/',
        ...(dto.parentId ? { parentId: dto.parentId } : {}),
      },
    });
    await this.rebuildFolderPaths(workspaceId);
    void this.bumpWorkspaceCache(workspaceId);
    return this.prisma.note.findUniqueOrThrow({ where: { id: note.id } });
  }

  async update(noteId: string, userId: string, dto: UpdateNoteDto) {
    const note = await this.prisma.note.findUnique({ where: { id: noteId } });
    if (!note) {
      throw new NotFoundException('Note not found');
    }
    await this.assertMember(note.workspaceId, userId);
    if (note.authorId !== userId) {
      throw new ForbiddenException('Only the author can edit this note');
    }

    const parentIdRaw = dto.parentId;
    const parentIdNorm =
      parentIdRaw === undefined ? undefined : parentIdRaw === '' ? null : parentIdRaw;

    if (parentIdNorm !== undefined) {
      if (parentIdNorm === null) {
        // move to root
      } else {
        const parent = await this.prisma.note.findFirst({
          where: { id: parentIdNorm, workspaceId: note.workspaceId },
        });
        if (!parent) {
          throw new NotFoundException('Parent note not found');
        }
        if (await this.wouldCreateCycle(noteId, parentIdNorm)) {
          throw new BadRequestException('Cannot move note: would create a cycle');
        }
      }
    }

    const data: Prisma.NoteUpdateInput = {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.content !== undefined ? { content: dto.content } : {}),
      ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
      ...(dto.format !== undefined ? { format: dto.format } : {}),
      ...(parentIdNorm !== undefined ? { parentId: parentIdNorm } : {}),
    };

    const needsPathRebuild =
      dto.title !== undefined || parentIdNorm !== undefined;

    await this.prisma.note.update({
      where: { id: noteId },
      data,
    });

    if (needsPathRebuild) {
      await this.rebuildFolderPaths(note.workspaceId);
    }

    void this.bumpWorkspaceCache(note.workspaceId);
    return this.prisma.note.findUniqueOrThrow({ where: { id: noteId } });
  }

  async getPublicByToken(token: string) {
    const note = await this.prisma.note.findFirst({
      where: { shareToken: token },
      select: {
        title: true,
        content: true,
        format: true,
        updatedAt: true,
      },
    });
    if (!note) {
      throw new NotFoundException('Shared note not found');
    }
    return note;
  }

  async publishShare(noteId: string, userId: string, regenerate: boolean) {
    const note = await this.prisma.note.findUnique({ where: { id: noteId } });
    if (!note) {
      throw new NotFoundException('Note not found');
    }
    await this.assertMember(note.workspaceId, userId);
    if (note.authorId !== userId) {
      throw new ForbiddenException('Only the author can create a share link');
    }
    if (note.shareToken && !regenerate) {
      return { shareToken: note.shareToken };
    }
    for (let i = 0; i < 6; i += 1) {
      const shareToken = randomBytes(18).toString('base64url');
      try {
        await this.prisma.note.update({
          where: { id: noteId },
          data: { shareToken },
        });
        return { shareToken };
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          continue;
        }
        throw e;
      }
    }
    throw new ForbiddenException('Could not allocate a unique share token');
  }

  async revokeShare(noteId: string, userId: string) {
    const note = await this.prisma.note.findUnique({ where: { id: noteId } });
    if (!note) {
      throw new NotFoundException('Note not found');
    }
    await this.assertMember(note.workspaceId, userId);
    if (note.authorId !== userId) {
      throw new ForbiddenException('Only the author can revoke the share link');
    }
    await this.prisma.note.update({
      where: { id: noteId },
      data: { shareToken: null },
    });
    return { revoked: true };
  }

  private slugify(title: string): string {
    const s = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    return s || 'note';
  }

  private pathForNote(id: string, byId: Map<string, NotePathRow>): string {
    const segs: string[] = [];
    let cur: string | null = id;
    const visited = new Set<string>();
    while (cur && !visited.has(cur)) {
      visited.add(cur);
      const n = byId.get(cur);
      if (!n) break;
      segs.unshift(this.slugify(n.title));
      cur = n.parentId;
    }
    return segs.length ? `/${segs.join('/')}` : '/';
  }

  private async rebuildFolderPaths(workspaceId: string) {
    const notes = await this.prisma.note.findMany({
      where: { workspaceId },
      select: { id: true, parentId: true, title: true },
    });
    const byId = new Map(notes.map((n) => [n.id, n]));
    await this.prisma.$transaction(
      notes.map((n) =>
        this.prisma.note.update({
          where: { id: n.id },
          data: { folderPath: this.pathForNote(n.id, byId) },
        }),
      ),
    );
  }

  private async wouldCreateCycle(noteId: string, newParentId: string): Promise<boolean> {
    if (newParentId === noteId) return true;
    let cur: string | null = newParentId;
    const seen = new Set<string>();
    while (cur) {
      if (cur === noteId) return true;
      if (seen.has(cur)) return false;
      seen.add(cur);
      const fetchId: string = cur;
      const row: { parentId: string | null } | null = await this.prisma.note.findUnique({
        where: { id: fetchId },
        select: { parentId: true },
      });
      cur = row?.parentId ?? null;
    }
    return false;
  }

  private bumpWorkspaceCache(workspaceId: string) {
    void this.cache.invalidateWorkspace(workspaceId);
  }

  private async assertMember(workspaceId: string, userId: string) {
    const m = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
    });
    if (!m) {
      throw new ForbiddenException('Not a member of this workspace');
    }
  }
}
