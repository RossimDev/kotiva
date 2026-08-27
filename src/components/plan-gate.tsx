import { Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePlan } from "@/hooks/use-plan";

/** Bloqueia módulos premium no plano gratuito (o banco também bloqueia via RLS). */
export function PlanGate({ feature, children }: { feature: string; children: ReactNode }) {
  const { isPremium, loading } = usePlan();

  if (loading) return <div className="py-16 text-center text-sm text-muted-foreground">Carregando...</div>;
  if (isPremium) return <>{children}</>;

  return (
    <div className="mx-auto max-w-xl py-10">
      <Card className="animate-scale-in p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold">{feature} é um recurso premium</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          No plano Grátis você tem acesso à Minha Geladeira, Vendendo em Breve e Listas de Compras. Assine o Pro ou o
          Família para liberar {feature} e todas as demais abas do Kotiva.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild className="shadow-glow">
            <Link to="/app/plan">
              <Sparkles className="mr-2 h-4 w-4" /> Ver planos e assinar
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/pricing">Comparar planos</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
