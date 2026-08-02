import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/layout/app-shell";
import { PlanProvider } from "@/hooks/use-plan";
import { PlanGate } from "@/components/plan-gate";

export const Route = createFileRoute("/app")({
  ssr: false,
  component: AppLayout,
});

/** Abas premium: bloqueadas no plano gratuito (o banco também bloqueia via RLS). */
const PREMIUM: Record<string, string> = {
  "/app/recipes": "O Cozinheiro IA",
  "/app/stove": "O Fogão Inteligente",
  "/app/house": "A Casa Inteligente",
  "/app/gas": "O Botijão Inteligente",
  "/app/finance": "O Financeiro",
  "/app/cleaning": "A Limpeza IA",
  "/app/pets": "O Pet IA",
};

function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { location } = useRouterState();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  }
  if (!user) return null;

  const premium = Object.entries(PREMIUM).find(([path]) => location.pathname.startsWith(path))?.[1];

  return (
    <PlanProvider>
      <AppShell>{premium ? <PlanGate feature={premium}><Outlet /></PlanGate> : <Outlet />}</AppShell>
    </PlanProvider>
  );
}
