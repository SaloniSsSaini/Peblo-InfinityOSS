import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async list(workspaceId: string, userId: string) {
    await this.assertMember(workspaceId, userId);
    return this.prisma.task.findMany({
      where: { workspaceId },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
      include: {
        assignee: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async getOne(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    await this.assertMember(task.workspaceId, userId);
    return task;
  }

  async create(workspaceId: string, userId: string, dto: CreateTaskDto) {
    await this.assertMember(workspaceId, userId);
    if (dto.assigneeId) {
      await this.assertAssignee(workspaceId, dto.assigneeId);
    }
    const max = await this.prisma.task.aggregate({
      where: { workspaceId },
      _max: { position: true },
    });
    const position = (max._max.position ?? -1) + 1;
    const created = await this.prisma.task.create({
      data: {
        workspaceId,
        title: dto.title,
        description: dto.description ?? null,
        status: dto.status ?? 'TODO',
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        assigneeId: dto.assigneeId ?? null,
        position,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
      },
    });
    void this.bumpWorkspaceCache(workspaceId);
    return created;
  }

  async update(taskId: string, userId: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    await this.assertMember(task.workspaceId, userId);
    if (dto.assigneeId !== undefined && dto.assigneeId !== null) {
      await this.assertAssignee(task.workspaceId, dto.assigneeId);
    }
    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.position !== undefined ? { position: dto.position } : {}),
        ...(dto.assigneeId !== undefined ? { assigneeId: dto.assigneeId } : {}),
        ...(dto.dueAt !== undefined
          ? { dueAt: dto.dueAt === null ? null : new Date(dto.dueAt) }
          : {}),
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
      },
    });
    void this.bumpWorkspaceCache(task.workspaceId);
    return updated;
  }

  async remove(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    await this.assertMember(task.workspaceId, userId);
    await this.prisma.task.delete({ where: { id: taskId } });
    void this.bumpWorkspaceCache(task.workspaceId);
    return { deleted: true };
  }

  private bumpWorkspaceCache(workspaceId: string) {
    void this.cache.invalidateWorkspace(workspaceId);
  }

  private async assertAssignee(workspaceId: string, assigneeId: string) {
    const m = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: assigneeId },
    });
    if (!m) {
      throw new BadRequestException('Assignee must be a member of this workspace');
    }
  }

  private async assertMember(workspaceId: string, userId: string) {
    const m = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
    });
    if (!m) throw new ForbiddenException('Not a member of this workspace');
  }
}
