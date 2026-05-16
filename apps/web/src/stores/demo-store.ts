import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  createInitialDemoState,
  type DemoStoreState,
  type MockAiLog,
  type MockNote,
  type MockTask,
} from "@/lib/mock-data";

type DemoStore = DemoStoreState & {
  resetDemoData: () => void;
  upsertNote: (note: MockNote) => void;
  removeNote: (id: string) => void;
  upsertTask: (task: MockTask) => void;
  removeTask: (id: string) => void;
  addAiLog: (log: MockAiLog) => void;
  setProfile: (profile: DemoStoreState["profile"]) => void;
};

export const useDemoStore = create<DemoStore>()(
  persist(
    (set, get) => ({
      ...createInitialDemoState(),
      resetDemoData: () => set(createInitialDemoState()),
      upsertNote: (note) =>
        set((s) => {
          const i = s.notes.findIndex((n) => n.id === note.id);
          const notes =
            i === -1 ? [note, ...s.notes] : s.notes.map((n, idx) => (idx === i ? note : n));
          return { notes };
        }),
      removeNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
      upsertTask: (task) =>
        set((s) => {
          const i = s.tasks.findIndex((t) => t.id === task.id);
          const tasks =
            i === -1 ? [...s.tasks, task] : s.tasks.map((t, idx) => (idx === i ? task : t));
          return { tasks };
        }),
      removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
      addAiLog: (log) => set((s) => ({ aiLogs: [log, ...s.aiLogs] })),
      setProfile: (profile) => set({ profile }),
    }),
    {
      name: "peblo-infinityos-demo-data",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** Ensure persisted store is hydrated before mock API reads. */
export function getDemoState(): DemoStoreState {
  return useDemoStore.getState();
}
