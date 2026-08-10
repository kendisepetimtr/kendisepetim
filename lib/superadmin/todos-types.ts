export type TodoStatus = "open" | "in_progress" | "done" | "cancelled";

export type PlatformVersionRow = {
  id: string;
  created_at: string;
  updated_at: string;
  major: number;
  minor: number;
  is_current: boolean;
  is_target: boolean;
  released_at: string | null;
  label: string;
};

export type PlatformTodoRow = {
  id: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  title: string;
  description: string;
  version_id: string;
  status: TodoStatus;
};

export const TODO_STATUS_LABELS: Record<TodoStatus, string> = {
  open: "Açık",
  in_progress: "Yapılıyor",
  done: "Tamamlandı",
  cancelled: "İptal",
};

export const TODO_STATUSES: TodoStatus[] = ["open", "in_progress", "done", "cancelled"];

export function formatVersionLabel(major: number, minor: number): string {
  return `${major}.${minor}`;
}

export function isActiveTodoStatus(status: TodoStatus): boolean {
  return status === "open" || status === "in_progress";
}
