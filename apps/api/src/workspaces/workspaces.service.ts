import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async listMembers(workspaceId: string, userId: string) {
    await this.assertMember(workspaceId, userId);
    const rows = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { user: { email: 'asc' } },
    });
    return rows.map((r) => ({
      userId: r.user.id,
      name: r.user.name,
      email: r.user.email,
      role: r.role,
    }));
  }

  async getInsights(workspaceId: string, userId: string) {
    await this.assertMember(workspaceId, userId);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      notesTotal,
      notesShared,
      notesUpdatedRecently,
      tasksTotal,
      tasksByStatus,
      tasksOverdue,
      tasksDueSoon,
      membersTotal,
      tasksForWorkload,
    ] = await Promise.all([
      this.prisma.note.count({ where: { workspaceId } }),
      this.prisma.note.count({ where: { workspaceId, shareToken: { not: null } } }),
      this.prisma.note.count({
        where: { workspaceId, updatedAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.task.count({ where: { workspaceId } }),
      this.prisma.task.groupBy({
        by: ['status'],
        where: { workspaceId },
        _count: { _all: true },
      }),
      this.prisma.task.count({
        where: {
          workspaceId,
          dueAt: { lt: now },
          status: { notIn: ['DONE'] },
        },
      }),
      this.prisma.task.count({
        where: {
          workspaceId,
          dueAt: { gte: now, lte: sevenDaysAhead },
          status: { notIn: ['DONE'] },
        },
      }),
      this.prisma.workspaceMember.count({ where: { workspaceId } }),
      this.prisma.task.findMany({
        where: { workspaceId },
        select: {
          status: true,
          assigneeId: true,
          assignee: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    const byStatus = { TODO: 0, IN_PROGRESS: 0, DONE: 0, BLOCKED: 0 };
    for (const row of tasksByStatus) {
      byStatus[row.status] = row._count._all;
    }
    const open = byStatus.TODO + byStatus.IN_PROGRESS + byStatus.BLOCKED;

    const workloadMap = new Map<
      string,
      {
        userId: string | null;
        name: string;
        email: string | null;
        open: number;
        done: number;
        blocked: number;
        total: number;
      }
    >();

    const upsertWorkload = (
      key: string,
      meta: { userId: string | null; name: string; email: string | null },
    ) => {
      if (!workloadMap.has(key)) {
        workloadMap.set(key, { ...meta, open: 0, done: 0, blocked: 0, total: 0 });
      }
      return workloadMap.get(key)!;
    };

    for (const t of tasksForWorkload) {
      const key = t.assigneeId ?? '__unassigned__';
      const meta = t.assignee
        ? {
            userId: t.assignee.id,
            name: t.assignee.name?.trim() || t.assignee.email,
            email: t.assignee.email,
          }
        : { userId: null, name: 'Unassigned', email: null };
      const row = upsertWorkload(key, meta);
      row.total += 1;
      if (t.status === 'DONE') row.done += 1;
      else if (t.status === 'BLOCKED') row.blocked += 1;
      else row.open += 1;
    }

    const workload = [...workloadMap.values()].sort((a, b) => b.open - a.open || b.total - a.total);

    return {
      workspaceId,
      generatedAt: now.toISOString(),
      notes: {
        total: notesTotal,
        shared: notesShared,
        updatedLast7Days: notesUpdatedRecently,
      },
      tasks: {
        total: tasksTotal,
        open,
        done: byStatus.DONE,
        blocked: byStatus.BLOCKED,
        overdue: tasksOverdue,
        dueNext7Days: tasksDueSoon,
        byStatus,
      },
      members: { total: membersTotal },
      workload,
    };
  }

  async listMine(userId: string) {
    const rows = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true, type: true, updatedAt: true },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.workspace.id,
      name: r.workspace.name,
      slug: r.workspace.slug,
      type: r.workspace.type,
      role: r.role,
      updatedAt: r.workspace.updatedAt,
    }));
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
