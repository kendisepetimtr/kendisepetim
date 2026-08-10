"use client";

import {
  superadminBumpMajorVersion,
  superadminBumpMinorVersion,
  superadminBumpPatchVersion,
  superadminDeleteTodo,
  superadminPublishTargetVersion,
  superadminUpsertTodo,
} from "@/app/superadmin/actions";
import {
  isActiveTodoStatus,
  TODO_STATUS_LABELS,
  TODO_STATUSES,
  type PlatformTodoRow,
  type PlatformVersionRow,
  type TodoStatus,
} from "@/lib/superadmin/todos-types";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState, useTransition } from "react";

type Props = {
  initialVersions: PlatformVersionRow[];
  initialTodos: PlatformTodoRow[];
  loadError: string | null;
};

type FormState = {
  id: string | null;
  title: string;
  description: string;
  versionId: string;
  status: TodoStatus;
};

function emptyForm(defaultVersionId: string): FormState {
  return {
    id: null,
    title: "",
    description: "",
    versionId: defaultVersionId,
    status: "open",
  };
}

export default function SuperadminTodosClient({
  initialVersions,
  initialTodos,
  loadError,
}: Props) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => {
    const target = initialVersions.find((v) => v.is_target);
    const current = initialVersions.find((v) => v.is_current);
    return emptyForm(target?.id ?? current?.id ?? "");
  });
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [showDone, setShowDone] = useState(false);

  const current = initialVersions.find((v) => v.is_current) ?? null;
  const target = initialVersions.find((v) => v.is_target) ?? null;

  const grouped = useMemo(() => {
    const order = [...initialVersions];
    return order
      .map((version) => {
        const items = initialTodos.filter((t) => t.version_id === version.id);
        const visible = showDone
          ? items
          : items.filter((t) => isActiveTodoStatus(t.status));
        return { version, items: visible };
      })
      .filter((g) => g.items.length > 0 || g.version.is_target || g.version.is_current);
  }, [initialTodos, initialVersions, showDone]);

  function defaultVersionId() {
    return target?.id ?? current?.id ?? initialVersions[0]?.id ?? "";
  }

  function openCreate() {
    setForm(emptyForm(defaultVersionId()));
    setFormOpen(true);
    setErr(null);
  }

  function openEdit(todo: PlatformTodoRow) {
    setForm({
      id: todo.id,
      title: todo.title,
      description: todo.description,
      versionId: todo.version_id,
      status: todo.status,
    });
    setFormOpen(true);
    setErr(null);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      setErr(null);
      const result = await superadminUpsertTodo({
        id: form.id ?? undefined,
        title: form.title,
        description: form.description,
        versionId: form.versionId,
        status: form.status,
      });
      if (result.error) {
        setErr(result.error);
        return;
      }
      setFormOpen(false);
      setForm(emptyForm(defaultVersionId()));
      router.refresh();
    });
  }

  function handleDelete(todoId: string) {
    if (!window.confirm("Bu yapılacağı silmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      setErr(null);
      const result = await superadminDeleteTodo(todoId);
      if (result.error) setErr(result.error);
      else router.refresh();
    });
  }

  function handleStatusQuick(todo: PlatformTodoRow, status: TodoStatus) {
    startTransition(async () => {
      setErr(null);
      const result = await superadminUpsertTodo({
        id: todo.id,
        title: todo.title,
        description: todo.description,
        versionId: todo.version_id,
        status,
      });
      if (result.error) setErr(result.error);
      else router.refresh();
    });
  }

  function runVersionAction(
    action: () => Promise<{ error?: string; label?: string }>,
    confirmMsg?: string,
  ) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    startTransition(async () => {
      setErr(null);
      const result = await action();
      if (result.error) setErr(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-headline text-2xl font-extrabold tracking-tight sm:text-3xl">
            Yapılacaklar
          </h1>
          <p className="mt-1 text-sm text-secondary">
            Sürüm notları ve unutulmaması gereken işler
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-xs font-semibold text-secondary">
            <input
              type="checkbox"
              checked={showDone}
              onChange={(e) => setShowDone(e.target.checked)}
            />
            Tamamlananları göster
          </label>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl bg-primary px-3 py-2 text-sm font-bold text-on-primary"
          >
            + Yapılacak
          </button>
        </div>
      </header>

      {loadError ? (
        <p className="mb-6 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {loadError}
        </p>
      ) : null}
      {err ? (
        <p className="mb-6 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {err}
        </p>
      ) : null}

      <section className="mb-8 rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-secondary">Mevcut</p>
              <p className="font-headline text-2xl font-extrabold text-on-background">
                {current?.label ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-secondary">Hedef</p>
              <p className="font-headline text-2xl font-extrabold text-primary">
                {target?.label ?? "—"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => runVersionAction(superadminBumpPatchVersion)}
              className="rounded-xl border border-surface-container-highest px-3 py-2 text-xs font-bold hover:bg-surface-container-low disabled:opacity-60"
            >
              Yama
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => runVersionAction(superadminBumpMinorVersion)}
              className="rounded-xl border border-surface-container-highest px-3 py-2 text-xs font-bold hover:bg-surface-container-low disabled:opacity-60"
            >
              Küçük güncelleme
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                runVersionAction(
                  superadminBumpMajorVersion,
                  "Büyük güncelleme oluşturulsun mu? (ör. 2.0.0)",
                )
              }
              className="rounded-xl border border-surface-container-highest px-3 py-2 text-xs font-bold hover:bg-surface-container-low disabled:opacity-60"
            >
              Büyük güncelleme
            </button>
            <button
              type="button"
              disabled={pending || !target || target.is_current}
              onClick={() =>
                runVersionAction(
                  superadminPublishTargetVersion,
                  target
                    ? `Hedef sürüm ${target.label} yayınlansın mı? Landing footer buna geçer.`
                    : undefined,
                )
              }
              className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              Hedefi yayınla
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-secondary">
          Yama: 1.0.1 · Küçük: 1.1.0 · Büyük: 2.0.0 · Yayınlanan sürüm landing footer’da görünür
        </p>
      </section>

      <div className="space-y-6">
        {grouped.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-surface-container-highest px-5 py-12 text-center text-sm text-secondary">
            Henüz yapılacak yok. Hedef sürüme ilk kaydı ekleyin.
          </p>
        ) : (
          grouped.map(({ version, items }) => (
            <section
              key={version.id}
              className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-container-highest px-5 py-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-headline text-base font-bold">Sürüm {version.label}</h2>
                  {version.is_target ? (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                      Hedef
                    </span>
                  ) : null}
                  {version.is_current ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      Mevcut
                    </span>
                  ) : null}
                  {!version.is_current && !version.is_target && version.released_at ? (
                    <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-bold text-secondary">
                      Yayınlandı
                    </span>
                  ) : null}
                </div>
                {version.is_target ? (
                  <button
                    type="button"
                    onClick={openCreate}
                    className="text-xs font-bold text-primary"
                  >
                    + Ekle
                  </button>
                ) : null}
              </div>
              {items.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-secondary">
                  Bu sürümde görüntülenecek madde yok.
                </p>
              ) : (
                <ul className="divide-y divide-surface-container-high">
                  {items.map((todo) => (
                    <li key={todo.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-on-background">{todo.title}</p>
                        {todo.description ? (
                          <p className="mt-1 whitespace-pre-wrap text-xs text-secondary">
                            {todo.description}
                          </p>
                        ) : null}
                        <p className="mt-2 text-[11px] font-semibold text-secondary">
                          {TODO_STATUS_LABELS[todo.status]}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <div className="flex flex-wrap justify-end gap-1">
                          {todo.status !== "done" ? (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => handleStatusQuick(todo, "done")}
                              className="rounded-lg bg-emerald-600/10 px-2 py-1 text-[11px] font-bold text-emerald-800"
                            >
                              Tamamla
                            </button>
                          ) : null}
                          {todo.status === "open" ? (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => handleStatusQuick(todo, "in_progress")}
                              className="rounded-lg bg-amber-500/10 px-2 py-1 text-[11px] font-bold text-amber-900"
                            >
                              Başlat
                            </button>
                          ) : null}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => openEdit(todo)}
                            className="text-xs font-bold text-primary"
                          >
                            Düzenle
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => handleDelete(todo.id)}
                            className="text-xs font-bold text-error"
                          >
                            Sil
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))
        )}
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-xl">
            <h2 className="font-headline text-lg font-bold">
              {form.id ? "Yapılacağı düzenle" : "Yapılacak ekle"}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <label className="block text-sm">
                <span className="font-semibold">Başlık</span>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-surface-container-highest px-3 py-2"
                  placeholder="Örn. QR menüde dil seçimi"
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Açıklama (opsiyonel)</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-surface-container-highest px-3 py-2"
                  placeholder="Detay, not…"
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Hedef sürüm</span>
                <select
                  required
                  value={form.versionId}
                  onChange={(e) => setForm((f) => ({ ...f, versionId: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-surface-container-highest px-3 py-2"
                >
                  {initialVersions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                      {v.is_target ? " (hedef)" : ""}
                      {v.is_current ? " (mevcut)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Durum</span>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value as TodoStatus }))
                  }
                  className="mt-1 w-full rounded-xl border border-surface-container-highest px-3 py-2"
                >
                  {TODO_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {TODO_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={pending || !form.versionId}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-on-primary disabled:opacity-60"
                >
                  {pending ? "Kaydediliyor…" : "Kaydet"}
                </button>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-xl border border-surface-container-highest px-4 py-2.5 text-sm font-semibold"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
