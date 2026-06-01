import type { BlockKind } from "@/lib/engine";

export const BLOCK_META: Record<
  BlockKind,
  { label: string; color: string; ring: string; dot: string }
> = {
  deep: { label: "Deep Work", color: "bg-deep/15 border-deep/40", ring: "text-deep", dot: "bg-deep" },
  focus: { label: "Focus", color: "bg-focus/15 border-focus/40", ring: "text-focus", dot: "bg-focus" },
  admin: { label: "Admin", color: "bg-admin/15 border-admin/40", ring: "text-admin", dot: "bg-admin" },
  break: { label: "Break", color: "bg-rest/10 border-rest/30", ring: "text-rest", dot: "bg-rest" },
  buffer: { label: "Buffer", color: "bg-surface-2 border-border", ring: "text-muted", dot: "bg-muted" },
  habit: { label: "Habit", color: "bg-habit/15 border-habit/40", ring: "text-habit", dot: "bg-habit" },
  event: { label: "Event", color: "bg-surface-2 border-border", ring: "text-fg/70", dot: "bg-fg/60" },
  recovery: { label: "Recovery", color: "bg-rest/10 border-rest/30", ring: "text-rest", dot: "bg-rest" },
};
