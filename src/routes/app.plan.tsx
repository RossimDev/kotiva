import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, CreditCard, Crown, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePlan, PLAN_LABEL, type PlanId } from "@/hooks/use-plan";
import { createCheckout } from "@/lib/payments.functions";
import { money } from "@/lib/kotiva";

export const Route = createFileRoute("/app/plan")({
  head: () => ({ meta: [{ title: "Meu plano — Kotiva" }, { name: "robots", content: "noindex" }] }),
  component: PlanPage,
});

const PLANS = [
  {
    id: "pro" as const,
    name: "Pro",
    price: 17,
    desc: "Todas as abas e recursos do Kotiva.",
    features: ["Todas as abas liberadas", "Cozinheiro IA e cardápio de 7 dias", "Casa, Fogão, Botijão e Financeiro", "Limpeza IA e Pet IA", "Scanner de código de barras"],
  },
  {
    id: "family" as const,
    name: "Família",
    price: 20,
    desc: "Tudo do Pro, pensado para a casa toda.",
    features: ["Tudo do plano Pro", "Ideal para a família", "Geladeira compartilhada", "Planejamento semanal", "Suporte prioritário"],
  },
];

const STATUS_LABEL: Record<string, string> = {
  active: "Pagamento confirmado",
  pending: "Pagamento pendente",
  inactive: "Sem pagamento ativo",
  cancelled: "Cancelado",
};

function PlanPage() {
  const { plan, subscription, isPremium, loading } = usePlan();
  const checkout = useServerFn(createCheckout);
  const [busy, setBusy] = useState<PlanId | null>(null);
  const [confirm, setConfirm] = useState<(typeof PLANS)[number] | null>(null);

  const go = async (target: (typeof PLANS)[number]) => {
    setBusy(target.id);
    try {
      const res = await checkout({ data: { plan: target.id, origin: window.location.origin } });
      window.location.href = res.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível iniciar o pagamento");
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  };

  const renewal = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Meu plano</h1>
        <p className="text-muted-foreground">Veja seu plano atual, assine ou troque quando quiser.</p>
      </div>

      <Card className="animate-fade-in p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Crown className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Plano atual</div>
              <div className="font-display text-2xl font-bold">{loading ? "..." : PLAN_LABEL[plan]}</div>
            </div>
          </div>
          <div className="text-right text-sm">
            <Badge variant={isPremium ? "default" : "secondary"}>
              {STATUS_LABEL[subscription?.status ?? "inactive"] ?? subscription?.status}
            </Badge>
            <div className="mt-1 text-xs text-muted-foreground">
              {renewal ? `Renova em ${renewal}` : "Sem data de renovação registrada"}
            </div>
            {subscription?.provider && (
              <div className="text-xs text-muted-foreground">Pagamento via {subscription.provider === "mercadopago" ? "Mercado Pago" : subscription.provider}</div>
            )}
          </div>
        </div>
        {!isPremium && (
          <p className="mt-4 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            No plano Grátis você acessa <strong>Minha Geladeira</strong>, <strong>Vendendo em Breve</strong> e{" "}
            <strong>Listas de Compras</strong>. Assine para liberar todas as abas.
          </p>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {PLANS.map((p) => {
          const current = plan === p.id;
          return (
            <Card key={p.id} className={`p-6 ${current ? "ring-2 ring-primary shadow-glow" : ""}`}>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold">{p.name}</h2>
                {current && <Badge>Seu plano</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{p.desc}</p>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-3xl font-extrabold">{money(p.price)}</span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>
              <ul className="mt-4 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-6 w-full"
                variant={current ? "outline" : "default"}
                disabled={busy === p.id || current}
                onClick={() => setConfirm(p)}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {current ? "Plano ativo" : isPremium ? `Trocar para ${p.name}` : `Assinar ${p.name}`}
              </Button>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Pagamentos processados pelo Mercado Pago (Pix, cartão e boleto). Cancele quando quiser.{" "}
        <Link to="/pricing" className="underline">
          Comparar planos
        </Link>
      </p>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isPremium ? `Trocar para o plano ${confirm?.name}?` : `Assinar o plano ${confirm?.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isPremium
                ? `Você será levado ao Mercado Pago para confirmar a mudança de ${PLAN_LABEL[plan]} para ${confirm?.name} por ${money(confirm?.price ?? 0)}/mês. A troca passa a valer assim que o pagamento for aprovado.`
                : `Você será levado ao Mercado Pago para concluir a assinatura de ${money(confirm?.price ?? 0)}/mês.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirm && go(confirm)} disabled={!!busy}>
              <Sparkles className="mr-2 h-4 w-4" /> {busy ? "Abrindo checkout..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
