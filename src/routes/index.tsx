import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ChefHat, Bell, ScanLine, ShoppingCart, Leaf, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kotiva — A inteligência completa da sua casa" },
      { name: "description", content: "Finanças, refeições, tarefas e organização da casa em um só app inteligente, elegante e feito para você. Menos desperdício, mais praticidade, mais vida." },
      { property: "og:title", content: "Kotiva — A inteligência completa da sua casa" },
      { property: "og:description", content: "Organize finanças, planeje refeições, controle tarefas e gerencie sua casa com um único app inteligente, elegante e feito para você." },
    ],
  }),
  component: Home,
});

const features = [
  { icon: ScanLine, title: "Geladeira Inteligente", desc: "Cadastre alimentos, escaneie códigos de barras e acompanhe validades com alertas automáticos." },
  { icon: Bell, title: "Receitas com IA", desc: "Sugestões personalizadas baseadas no que você já tem em casa, reduzindo desperdício." },
  { icon: ChefHat, title: "Planejamento de Refeições", desc: "Organize cardápios semanais e listas de compras automáticas a partir do estoque." },
  { icon: ShoppingCart, title: "Finanças Domésticas", desc: "Controle gastos de mercado, conta de luz, gás e orçamento mensal em um só lugar." },
  { icon: Leaf, title: "Tarefas da Casa", desc: "Crie lembretes de limpeza, manutenção e organização para que nada fique para depois." },
  { icon: Sparkles, title: "Experiência Premium", desc: "Design moderno, rápido e responsivo — uma marca que transmite confiança e sofisticação." },
];

function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-warm">
        <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 md:grid-cols-2 md:py-28">
          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Powered by IA
            </div>
            <h1 className="mt-4 font-display text-5xl font-extrabold leading-tight md:text-7xl">
              Sua casa, <span className="text-gradient">mais inteligente</span> que nunca
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Finanças organizadas, refeições planejadas, tarefas no controle e uma casa que funciona para você — tudo em um app elegante e feito sob medida.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="shadow-glow">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Começar grátis <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/pricing">Ver planos</Link>
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <div><span className="font-bold text-foreground">10k+</span> usuários</div>
              <div><span className="font-bold text-foreground">50k+</span> receitas geradas</div>
              <div><span className="font-bold text-foreground">30%</span> menos desperdício</div>
            </div>
          </div>
          <div className="relative flex items-center justify-center">
            <div className="animate-float rounded-3xl bg-card p-6 shadow-soft ring-1 ring-border/60">
              <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-hero text-primary-foreground"><ChefHat className="h-5 w-5" /></div>
                <div>
                  <div className="text-sm font-semibold">Sugestão do dia</div>
                  <div className="text-xs text-muted-foreground">Baseado no que você tem</div>
                </div>
              </div>
              <div className="space-y-3">
                {["🍅 Tomate — vence em 2 dias", "💰 Conta de luz — vencimento 05/08", "🧹 Tarefa: limpar geladeira", "🥑 Abacate — vence hoje"].map((t) => (
                  <div key={t} className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-sm">
                    <span>{t}</span>
                  </div>
                ))}
                <div className="mt-3 rounded-xl bg-hero p-4 text-primary-foreground">
                  <div className="text-xs opacity-80">Sugestão inteligente do Kotiva</div>
                  <div className="font-display text-lg font-bold">Guacamole + salada fresca + controle de gastos</div>
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
