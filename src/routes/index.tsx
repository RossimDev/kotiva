import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ChefHat, Bell, ScanLine, ShoppingCart, Leaf, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kotiva — Sua geladeira inteligente com IA" },
      { name: "description", content: "Cadastre alimentos, acompanhe validades e receba receitas personalizadas por IA. Reduza o desperdício com o Kotiva." },
      { property: "og:title", content: "Kotiva — Sua geladeira inteligente" },
      { property: "og:description", content: "Menos desperdício, mais receitas. Gerencie tudo em um app." },
    ],
  }),
  component: Home,
});

const features = [
  { icon: ScanLine, title: "Código de barras / QR", desc: "Cadastre em segundos escaneando produtos direto da embalagem." },
  { icon: Bell, title: "Alertas de validade", desc: "Notificações inteligentes antes que algo estrague na sua geladeira." },
  { icon: ChefHat, title: "Receitas com IA", desc: "Sugestões personalizadas com base no que você já tem em casa." },
  { icon: ShoppingCart, title: "Listas automáticas", desc: "Gere listas de compras a partir do que está acabando." },
  { icon: Leaf, title: "Menos desperdício", desc: "Contribua com o planeta usando o que já comprou." },
  { icon: Sparkles, title: "Experiência premium", desc: "Design moderno, rápido e responsivo em qualquer dispositivo." },
];

function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-warm">
        <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 md:grid-cols-2 md:py-28">
          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit animate-fade-in items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Powered by IA
            </div>
            <h1 className="mt-4 animate-fade-in stagger-1 font-display text-5xl font-extrabold leading-tight md:text-6xl">
              Organize. Planeje. <span className="text-gradient">Viva melhor.</span>
            </h1>
            <p className="mt-5 max-w-lg animate-fade-in stagger-2 text-lg text-muted-foreground">
              A plataforma inteligente que cuida da casa inteira: geladeira, compras, contas, cozinha, limpeza e pets — tudo com IA.
            </p>
            <div className="mt-8 flex animate-fade-in stagger-3 flex-wrap gap-3">
              <Button asChild size="lg" className="shadow-glow hover-scale">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Começar grátis <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="hover-scale">
                <Link to="/pricing">Ver planos</Link>
              </Button>
            </div>
            <div className="mt-8 flex animate-fade-in stagger-4 items-center gap-6 text-sm text-muted-foreground">
              <div><span className="font-bold text-foreground">10k+</span> usuários</div>
              <div><span className="font-bold text-foreground">50k+</span> receitas geradas</div>
              <div><span className="font-bold text-foreground">30%</span> menos desperdício</div>
            </div>
          </div>
          <div className="relative flex animate-scale-in stagger-2 items-center justify-center">

            <div className="animate-float rounded-3xl bg-card p-6 shadow-soft ring-1 ring-border/60">
              <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-hero text-primary-foreground"><ChefHat className="h-5 w-5" /></div>
                <div>
                  <div className="text-sm font-semibold">Sugestão do dia</div>
                  <div className="text-xs text-muted-foreground">Baseado no que você tem</div>
                </div>
              </div>
              <div className="space-y-3">
                {["🍅 Tomate — vence em 2 dias", "🥑 Abacate — vence hoje", "🥬 Alface — nova"].map((t) => (
                  <div key={t} className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-sm">
                    <span>{t}</span>
                  </div>
                ))}
                <div className="mt-3 rounded-xl bg-hero p-4 text-primary-foreground">
                  <div className="text-xs opacity-80">Receita sugerida</div>
                  <div className="font-display text-lg font-bold">Guacamole + salada fresca</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">Tudo o que sua cozinha precisa</h2>
          <p className="mt-3 text-muted-foreground">Recursos poderosos, experiência simples.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="p-6 transition-all hover:-translate-y-1 hover:shadow-soft">
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-hero p-10 text-primary-foreground shadow-glow md:p-16">
          <div className="relative z-10 max-w-2xl">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Comece a economizar hoje</h2>
            <p className="mt-3 text-primary-foreground/90">Crie sua conta grátis e transforme como você cuida da sua alimentação.</p>
            <Button asChild size="lg" variant="secondary" className="mt-6">
              <Link to="/auth" search={{ mode: "signup" }}>Criar conta grátis</Link>
            </Button>
          </div>
          <div className="pointer-events-none absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        </div>
      </section>
    </>
  );
}
