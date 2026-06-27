import { writeActivityLog } from "@/lib/activity-log";

import { createServiceSupabaseClient } from "@/lib/supabase/admin";

import type { TableSessionRow, TableSessionStatus } from "@/lib/supabase/table-session-types";



export type GarsonTableStatus = "empty" | TableSessionStatus;



export type GarsonTableCell = {

  tableNumber: number;

  status: GarsonTableStatus;

  sessionId: string | null;

  orderCount: number;

  sessionTotal: number;

  openedAt: string | null;

};



export async function loadGarsonTableGrid(

  tenantId: string,

  tableCount: number,

): Promise<{ ok: true; tables: GarsonTableCell[] } | { ok: false; error: string }> {

  if (tableCount < 1) {

    return { ok: false, error: "Masa sayısı tanımlı değil." };

  }



  try {

    const svc = createServiceSupabaseClient();

    const { data: sessions, error: sessionErr } = await svc

      .from("table_sessions")

      .select("id, table_number, status, opened_at")

      .eq("tenant_id", tenantId)

      .in("status", ["active", "bill_requested"]);



    if (sessionErr) {

      return { ok: false, error: sessionErr.message };

    }



    const openSessions = (sessions ?? []) as Pick<TableSessionRow, "id" | "table_number" | "status" | "opened_at">[];

    const sessionByTable = new Map(openSessions.map((s) => [s.table_number, s]));

    const sessionIds = openSessions.map((s) => s.id);



    const totalsBySession = new Map<string, { count: number; total: number }>();

    if (sessionIds.length > 0) {

      const { data: orders, error: orderErr } = await svc

        .from("orders")

        .select("table_session_id, total, status")

        .eq("tenant_id", tenantId)

        .in("table_session_id", sessionIds)

        .neq("status", "cancelled");



      if (orderErr) {

        return { ok: false, error: orderErr.message };

      }



      for (const row of orders ?? []) {

        const sessionId = row.table_session_id as string | null;

        if (!sessionId) continue;

        const current = totalsBySession.get(sessionId) ?? { count: 0, total: 0 };

        current.count += 1;

        current.total += Number(row.total ?? 0);

        totalsBySession.set(sessionId, current);

      }

    }



    const tables: GarsonTableCell[] = [];

    for (let n = 1; n <= tableCount; n++) {

      const session = sessionByTable.get(n);

      if (!session) {

        tables.push({

          tableNumber: n,

          status: "empty",

          sessionId: null,

          orderCount: 0,

          sessionTotal: 0,

          openedAt: null,

        });

        continue;

      }



      const agg = totalsBySession.get(session.id) ?? { count: 0, total: 0 };

      tables.push({

        tableNumber: n,

        status: session.status,

        sessionId: session.id,

        orderCount: agg.count,

        sessionTotal: Math.round(agg.total * 100) / 100,

        openedAt: session.opened_at,

      });

    }



    return { ok: true, tables };

  } catch (err) {

    return { ok: false, error: err instanceof Error ? err.message : "Masa listesi yüklenemedi." };

  }

}



export async function requestTableBill(

  tenantId: string,

  tableNumber: number,

): Promise<{ ok: true; sessionId: string } | { ok: false; error: string }> {

  if (tableNumber < 1) {

    return { ok: false, error: "Geçersiz masa numarası." };

  }



  try {

    const svc = createServiceSupabaseClient();

    const { data: session, error: findErr } = await svc

      .from("table_sessions")

      .select("id, status, table_number")

      .eq("tenant_id", tenantId)

      .eq("table_number", tableNumber)

      .in("status", ["active", "bill_requested"])

      .maybeSingle();



    if (findErr) {

      return { ok: false, error: findErr.message };

    }

    if (!session?.id) {

      return { ok: false, error: "Bu masada açık oturum yok." };

    }

    if (session.status === "bill_requested") {

      return { ok: true, sessionId: session.id as string };

    }



    const { error: updateErr } = await svc

      .from("table_sessions")

      .update({ status: "bill_requested" })

      .eq("id", session.id)

      .eq("tenant_id", tenantId);



    if (updateErr) {

      return { ok: false, error: updateErr.message };

    }



    await writeActivityLog({

      tenant_id: tenantId,

      actor_type: "waiter",

      actor_label: "Garson",

      action: "bill_requested",

      entity_type: "table_session",

      entity_id: session.id as string,

      order_code: null,

      metadata: { table: tableNumber },

    });



    return { ok: true, sessionId: session.id as string };

  } catch (err) {

    return { ok: false, error: err instanceof Error ? err.message : "Hesap isteği gönderilemedi." };

  }

}


