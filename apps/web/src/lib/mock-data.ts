import {
  DEMO_PUBLIC_SHARE_TOKEN,
  DEMO_USER_ID,
  DEMO_WORKSPACE_ID,
} from "@/lib/demo-auth";

const now = Date.now();
const days = (n: number) => new Date(now - n * 86_400_000).toISOString();

export type MockNote = {
  id: string;
  workspaceId: string;
  authorId: string;
  parentId: string | null;
  title: string;
  content: string;
  format: "RICH" | "MARKDOWN";
  folderPath: string;
  tags: string[];
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MockTask = {
  id: string;
  workspaceId: string;
  assigneeId: string | null;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED";
  dueAt: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  assignee: { id: string; name: string | null; email: string } | null;
};

export type MockAiLog = {
  id: string;
  model: string;
  tokens: number | null;
  createdAt: string;
  noteId: string | null;
  noteTitle: string | null;
  prompt: string;
  response: string;
};

export type MockMember = {
  userId: string;
  name: string | null;
  email: string;
  role: string;
};

export type DemoStoreState = {
  notes: MockNote[];
  tasks: MockTask[];
  aiLogs: MockAiLog[];
  profile: { name: string | null; avatarUrl: string | null };
};

const demoUser = {
  id: DEMO_USER_ID,
  name: "Demo visitor",
  email: "demo@peblo.infinityos.app",
};

const teammate = {
  id: "user-demo-2",
  name: "Alex Chen",
  email: "alex@infinity.demo",
};

export function createInitialDemoState(): DemoStoreState {
  return {
    profile: { name: demoUser.name, avatarUrl: null },
    notes: [
      {
        id: "note-welcome",
        workspaceId: DEMO_WORKSPACE_ID,
        authorId: DEMO_USER_ID,
        parentId: null,
        title: "Welcome — Peblo InfinityOS",
        content:
          "<p><strong>Portfolio demo mode</strong> — everything runs in your browser. No Render API or PostgreSQL required.</p><p>Use <em>AI summarize</em>, drag tasks on the board, and try <strong>Ctrl+K</strong> search.</p>",
        format: "RICH",
        folderPath: "/",
        tags: ["welcome", "demo"],
        shareToken: DEMO_PUBLIC_SHARE_TOKEN,
        createdAt: days(14),
        updatedAt: days(0),
      },
      {
        id: "note-roadmap",
        workspaceId: DEMO_WORKSPACE_ID,
        authorId: DEMO_USER_ID,
        parentId: null,
        title: "Product roadmap Q2",
        content:
          "<h2>Focus</h2><ul><li>Real-time collaboration (Yjs)</li><li>Learning modules — flashcards & quizzes</li><li>RAG / semantic workspace search</li></ul><p>Shipped in this demo: notes, tasks, AI hub, global search.</p>",
        format: "RICH",
        folderPath: "/",
        tags: ["roadmap", "product"],
        shareToken: null,
        createdAt: days(10),
        updatedAt: days(2),
      },
      {
        id: "note-fundraising",
        workspaceId: DEMO_WORKSPACE_ID,
        authorId: DEMO_USER_ID,
        parentId: "note-roadmap",
        title: "Fundraising narrative",
        content:
          "<p>InfinityOS unifies knowledge, execution, and AI for founders and learning teams — a credible path from MVP to platform.</p>",
        format: "RICH",
        folderPath: "/",
        tags: ["startup"],
        shareToken: null,
        createdAt: days(8),
        updatedAt: days(3),
      },
      {
        id: "note-meeting",
        workspaceId: DEMO_WORKSPACE_ID,
        authorId: DEMO_USER_ID,
        parentId: null,
        title: "Investor meeting notes",
        content:
          "<p>Positive feedback on dashboard polish and workspace model. Follow-up: send deck + live demo link.</p>",
        format: "RICH",
        folderPath: "/",
        tags: ["meetings"],
        shareToken: null,
        createdAt: days(5),
        updatedAt: days(1),
      },
    ],
    tasks: [
      {
        id: "task-1",
        workspaceId: DEMO_WORKSPACE_ID,
        assigneeId: DEMO_USER_ID,
        title: "Polish landing page for recruiters",
        description: "Hero, product preview, honest shipped vs roadmap sections.",
        status: "IN_PROGRESS",
        dueAt: days(-2),
        position: 0,
        createdAt: days(7),
        updatedAt: days(0),
        assignee: demoUser,
      },
      {
        id: "task-2",
        workspaceId: DEMO_WORKSPACE_ID,
        assigneeId: teammate.id,
        title: "Record 2-min product walkthrough",
        description: null,
        status: "TODO",
        dueAt: days(3),
        position: 1,
        createdAt: days(6),
        updatedAt: days(1),
        assignee: teammate,
      },
      {
        id: "task-3",
        workspaceId: DEMO_WORKSPACE_ID,
        assigneeId: DEMO_USER_ID,
        title: "Ship frontend-only demo mode",
        description: "localStorage mock data, Vercel deploy, no backend dependency.",
        status: "DONE",
        dueAt: days(-5),
        position: 0,
        createdAt: days(10),
        updatedAt: days(0),
        assignee: demoUser,
      },
      {
        id: "task-4",
        workspaceId: DEMO_WORKSPACE_ID,
        assigneeId: null,
        title: "Waiting on design tokens for dark mode",
        description: "Blocked by brand review.",
        status: "BLOCKED",
        dueAt: days(7),
        position: 0,
        createdAt: days(4),
        updatedAt: days(2),
        assignee: null,
      },
    ],
    aiLogs: [
      {
        id: "ailog-1",
        model: "demo-offline",
        tokens: 128,
        createdAt: days(1),
        noteId: "note-welcome",
        noteTitle: "Welcome — Peblo InfinityOS",
        prompt: "Summarize note: Welcome — Peblo InfinityOS",
        response:
          "This note introduces the portfolio demo: browser-only auth and data, full dashboard UX without a live backend, and pointers to AI summarize, tasks, and search.",
      },
      {
        id: "ailog-2",
        model: "demo-offline",
        tokens: 96,
        createdAt: days(3),
        noteId: "note-roadmap",
        noteTitle: "Product roadmap Q2",
        prompt: "Summarize note: Product roadmap Q2",
        response:
          "Q2 priorities include Yjs collaboration, learning modules, and RAG search; the current demo already ships notes, tasks, AI hub, and workspace search.",
      },
    ],
  };
}

export const DEMO_MEMBERS: MockMember[] = [
  { userId: DEMO_USER_ID, name: demoUser.name, email: demoUser.email, role: "OWNER" },
  { userId: teammate.id, name: teammate.name, email: teammate.email, role: "MEMBER" },
];
