import { createHash } from 'node:crypto';

function hashPart(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

export const cacheKeys = {
  search: (workspaceId: string, q: string, limit: number) =>
    `search:${workspaceId}:${limit}:${hashPart(q.toLowerCase())}`,
  notesList: (workspaceId: string, q: string, tag: string) =>
    `notes:list:${workspaceId}:${hashPart(`${q}|${tag}`)}`,
  aiUsage: (userId: string) => `ai:usage:${userId}`,
  workspacePrefix: (workspaceId: string) => `*:${workspaceId}:*`,
};

export const cachePrefixes = {
  workspace: (workspaceId: string) => [
    `search:${workspaceId}:`,
    `notes:list:${workspaceId}:`,
  ],
};
