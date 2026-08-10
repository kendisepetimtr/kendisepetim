import SuperadminTodosClient from "@/components/superadmin/superadmin-todos-client";
import { requireSuperadminOrRedirect } from "@/lib/superadmin/guard";
import { loadPlatformTodos, loadPlatformVersions } from "@/lib/superadmin/todos-service";

export default async function SuperadminTodosPage() {
  await requireSuperadminOrRedirect();

  const [versionsResult, todosResult] = await Promise.all([
    loadPlatformVersions(),
    loadPlatformTodos(),
  ]);

  const loadError = !versionsResult.ok
    ? versionsResult.error
    : !todosResult.ok
      ? todosResult.error
      : null;

  return (
    <SuperadminTodosClient
      initialVersions={versionsResult.ok ? versionsResult.versions : []}
      initialTodos={todosResult.ok ? todosResult.todos : []}
      loadError={loadError}
    />
  );
}
