import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Planos — SmartFridge AI" },
      { name: "description", content: "Escolha o plano do SmartFridge AI que se encaixa em você. Grátis para começar, premium para quem quer mais." },
      { property: "og:title", content: "Planos SmartFridge AI" },
      { property: "og:description", content: "Grátis, Pro e Família — escolha o que melhor combina com sua rotina." },
    ],
  }),
  component: Pricing,
});

const plans = [
  { name: "Grátis", price: "R$ 0", period: "/mês", desc: "Perfeito para começar", features: ["Até 20 itens", "Alertas de validade", "1 lista de compras", "Receitas básicas"], cta: "Começar", highlight: false },
  { name: "Pro", price: "R$ 19", period: "/mês", desc: "Para quem cozinha sempre", features: ["Itens ilimitados", "Receitas IA ilimitadas", "Leitura de código de barras", "Múltiplas listas", "Suporte prioritário"], cta: "Assinar Pro", highlight: true },
  { name: "Família", price: "R$ 39", period: "/mês", desc: "Até 5 usuários", features: ["Tudo do Pro", "Até 5 membros", "Geladeira compartilhada", "Planejamento semanal", "Suporte 24/7"], cta: "Assinar Família", highlight: false },
];

function Pricing() {
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
            <Button asChild className={`mt-8 w-full ${p.highlight ? "shadow-glow" : ""}`} variant={p.highlight ? "default" : "outline"}>
              <Link to="/auth" search={{ mode: "signup" }}>{p.cta}</Link>
            </Button>
          </Card>
        ))}
      </div>
      <p className="mt-8 text-center text-xs text-muted-foreground">Pagamentos processados via Stripe. Cancele quando quiser.</p>
    </div>
  );
}
