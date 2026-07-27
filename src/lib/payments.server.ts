const MP_API = "https://api.mercadopago.com";

export type MpPlan = {
  id: "pro" | "family";
  title: string;
  price: number;
};

export const MP_PLANS: Record<MpPlan["id"], MpPlan> = {
  pro: { id: "pro", title: "Kotiva Pro (mensal)", price: 17.0 },
  family: { id: "family", title: "Kotiva Família (mensal)", price: 35.0 },
};

/** Cria uma preferência de pagamento no Mercado Pago e devolve o link de checkout. */
export async function createMpPreference(plan: MpPlan, payer: { email?: string; userId: string }, origin: string) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("Pagamentos ainda não configurados. Adicione o token do Mercado Pago.");

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      items: [{ title: plan.title, quantity: 1, currency_id: "BRL", unit_price: plan.price }],
      payer: payer.email ? { email: payer.email } : undefined,
      external_reference: `${payer.userId}:${plan.id}`,
      back_urls: {
        success: `${origin}/app/dashboard?pagamento=sucesso`,
        pending: `${origin}/app/dashboard?pagamento=pendente`,
        failure: `${origin}/pricing?pagamento=falhou`,
      },
      auto_return: "approved",
      statement_descriptor: "KOTIVA",
      notification_url: `${origin}/api/public/hooks/mercadopago`,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro no Mercado Pago: ${text.slice(0, 300)}`);
  }

  const json = (await res.json()) as { init_point?: string; sandbox_init_point?: string; id?: string };
  const url = json.init_point ?? json.sandbox_init_point;
  if (!url) throw new Error("Mercado Pago não retornou o link de pagamento.");
  return { url, preferenceId: json.id ?? null };
}

export async function fetchMpPayment(paymentId: string) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("Missing MERCADOPAGO_ACCESS_TOKEN");
  const res = await fetch(`${MP_API}/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Mercado Pago payment lookup failed: ${res.status}`);
  return (await res.json()) as { status?: string; external_reference?: string };
}
