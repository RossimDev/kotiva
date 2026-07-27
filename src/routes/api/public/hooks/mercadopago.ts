import { createFileRoute } from "@tanstack/react-router";

// Webhook do Mercado Pago: confirma pagamentos e ativa a assinatura do usuário.
export const Route = createFileRoute("/api/public/hooks/mercadopago")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as {
            type?: string;
            action?: string;
            data?: { id?: string };
          };
          const paymentId = body?.data?.id;
          if (!paymentId) return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: { "content-type": "application/json" } });

          const { fetchMpPayment } = await import("@/lib/payments.server");
          const payment = await fetchMpPayment(String(paymentId));
          const [userId, plan] = (payment.external_reference ?? "").split(":");
          if (!userId || !plan) return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: { "content-type": "application/json" } });

          const approved = payment.status === "approved";
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const periodEnd = new Date();
          periodEnd.setMonth(periodEnd.getMonth() + 1);

          const { data: existing } = await supabaseAdmin.from("subscriptions").select("id").eq("user_id", userId).maybeSingle();
          const payload = {
            user_id: userId,
            plan: approved ? plan : "free",
            status: approved ? "active" : "inactive",
            provider: "mercadopago",
            external_id: String(paymentId),
            current_period_end: approved ? periodEnd.toISOString() : null,
          };
          if (existing?.id) await supabaseAdmin.from("subscriptions").update(payload).eq("id", existing.id);
          else await supabaseAdmin.from("subscriptions").insert(payload);

          return new Response(JSON.stringify({ ok: true, approved }), { headers: { "content-type": "application/json" } });
        } catch (e) {
          console.error("[mercadopago]", e);
          return new Response(JSON.stringify({ ok: false }), { status: 500, headers: { "content-type": "application/json" } });
        }
      },
    },
  },
});
