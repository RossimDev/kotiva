import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { createCheckout } from "@/lib/payments.functions";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Planos — Kotiva" },
      { name: "description", content: "Escolha o plano do Kotiva que se encaixa em você. Grátis para começar, premium para quem quer mais." },
      { property: "og:title", content: "Planos Kotiva" },
      { property: "og:description", content: "Grátis, Pro e Família — pagamento via Mercado Pago, cancele quando quiser." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pricing,
});

const plans = [
  { id: null, name: "Grátis", price: "R$ 0", period: "/mês", desc: "Perfeito para começar", features: ["Até 20 itens", "Alertas de validade", "1 lista de compras", "Receitas básicas"], cta: "Começar", highlight: false },
  { id: "pro" as const, name: "Pro", price: "R$ 17", period: "/mês", desc: "Para quem cuida da casa todo dia", features: ["Itens ilimitados", "Cozinheiro IA ilimitado", "Cardápio de 7 dias", "Scanner de código de barras", "Casa, Fogão e Botijão inteligentes"], cta: "Assinar Pro", highlight: true },
  { id: "family" as const, name: "Família", price: "R$ 35", period: "/mês", desc: "Até 5 usuários", features: ["Tudo do Pro", "Até 5 membros", "Geladeira compartilhada", "Planejamento semanal", "Suporte 24/7"], cta: "Assinar Família", highlight: false },
];

function Pricing() {
  const { user } = useAuth();
  const router = useRouter();
  const checkout = useServerFn(createCheckout);
  const [loading, setLoading] = useState<string | null>(null);

  const subscribe = async (planId: "pro" | "family") => {
    if (!user) {
      router.navigate({ to: "/auth", search: { mode: "signup" } });
      return;
    }
    setLoading(planId);
    try {
      const res = await checkout({ data: { plan: planId, origin: window.location.origin } });
      window.location.href = res.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível iniciar o pagamento");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <h1 className="font-display text-4xl font-extrabold md:text-5xl">Escolha seu plano</h1>
        <p className="mt-3 text-muted-foreground">Comece grátis. Faça upgrade quando quiser.</p>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.name} className={`relative p-8 ${p.highlight ? "ring-2 ring-primary shadow-glow" : ""}`}>
            {p.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-hero px-3 py-1 text-xs font-semibold text-primary-foreground">Mais popular</div>}
            <h3 className="font-display text-xl font-bold">{p.name}</h3>
            <p className="text-sm text-muted-foreground">{p.desc}</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-display text-4xl font-extrabold">{p.price}</span>
              <span className="text-muted-foreground">{p.period}</span>
            </div>
            <ul className="mt-6 space-y-3">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {f}
                </li>
              ))}
            </ul>
            {p.id ? (
              <Button className={`mt-8 w-full ${p.highlight ? "shadow-glow" : ""}`} variant={p.highlight ? "default" : "outline"} disabled={loading === p.id} onClick={() => subscribe(p.id!)}>
                {loading === p.id ? "Abrindo checkout..." : p.cta}
              </Button>
            ) : (
              <Button asChild className="mt-8 w-full" variant="outline">
                <Link to="/auth" search={{ mode: "signup" }}>{p.cta}</Link>
              </Button>
            )}
          </Card>
        ))}
      </div>
      <p className="mt-8 text-center text-xs text-muted-foreground">Pagamentos processados pelo Mercado Pago (Pix, cartão e boleto). Cancele quando quiser.</p>
    </div>
  );
}
