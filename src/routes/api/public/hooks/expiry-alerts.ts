import { createFileRoute } from "@tanstack/react-router";

// Cron endpoint: scans items expiring within 3 days and creates in-app notifications.
// Called by pg_cron with the anon key in the apikey header (see cron setup).
export const Route = createFileRoute("/api/public/hooks/expiry-alerts")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const today = new Date();
          const in3 = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
          const iso = (d: Date) => d.toISOString().slice(0, 10);

          const { data: items, error } = await supabaseAdmin
            .from("fridge_items")
            .select("id, user_id, name, expires_at")
            .not("expires_at", "is", null)
            .lte("expires_at", iso(in3));

          if (error) throw error;

          let created = 0;
          for (const it of items ?? []) {
            const daysLeft = Math.ceil((new Date(it.expires_at!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const status = daysLeft < 0 ? "vencido" : daysLeft === 0 ? "vence hoje" : `vence em ${daysLeft}d`;
            const dedup = `expiry:${it.id}:${iso(today)}`;
            const { error: insErr } = await supabaseAdmin.from("notifications").insert({
              user_id: it.user_id,
              title: `${it.name} — ${status}`,
              body: `Confira sua geladeira e evite o desperdício.`,
              type: "expiry",
              item_id: it.id,
              dedup_key: dedup,
            });
            if (!insErr) created++;
          }

          return new Response(JSON.stringify({ ok: true, scanned: items?.length ?? 0, created }), {
            headers: { "content-type": "application/json" },
          });
        } catch (e) {
          console.error("[expiry-alerts]", e);
          return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { "content-type": "application/json" } });
        }
      },
    },
  },
});
