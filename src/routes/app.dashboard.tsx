import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Package, AlertTriangle, ChefHat, ShoppingCart, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "Painel — SmartFridge AI" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ items: 0, expiring: 0, shopping: 0, recipes: 0 });
  const [expiring, setExpiring] = useState<Array<{ id: string; name: string; expires_at: string | null }>>([]);

  useEffect(() => {
    if (!user) return;
    const soon = new Date(); soon.setDate(soon.getDate() + 3);
    Promise.all([
      supabase.from("fridge_items").select("id", { count: "exact", head: true }),
      supabase.from("fridge_items").select("id", { count: "exact", head: true }).lte("expires_at", soon.toISOString().slice(0, 10)),
      supabase.from("shopping_items").select("id", { count: "exact", head: true }).eq("checked", false),
      supabase.from("saved_recipes").select("id", { count: "exact", head: true }),
      supabase.from("fridge_items").select("id,name,expires_at").not("expires_at", "is", null).order("expires_at").limit(5),
    ]).then(([a, b, c, d, e]) => {
      setStats({ items: a.count ?? 0, expiring: b.count ?? 0, shopping: c.count ?? 0, recipes: d.count ?? 0 });
      setExpiring(e.data ?? []);
    });

    const channel = supabase.channel("dash")
      .on("postgres_changes", { event: "*", schema: "public", table: "fridge_items", filter: `user_id=eq.${user.id}` }, () => {
        supabase.from("fridge_items").select("id", { count: "exact", head: true }).then(({ count }) => setStats((s) => ({ ...s, items: count ?? 0 })));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const cards = [
    { label: "Itens na geladeira", value: stats.items, icon: Package, color: "text-primary bg-primary/10" },
    { label: "Vencendo em 3 dias", value: stats.expiring, icon: AlertTriangle, color: "text-warning bg-warning/10" },
    { label: "Lista de compras", value: stats.shopping, icon: ShoppingCart, color: "text-accent bg-accent/10" },
    { label: "Receitas salvas", value: stats.recipes, icon: ChefHat, color: "text-primary bg-primary/10" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Olá 👋</h1>
          <p className="text-muted-foreground">Aqui está o resumo da sua cozinha hoje.</p>
        </div>
        <Button asChild className="shadow-glow"><Link to="/app/items">Gerenciar geladeira</Link></Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl ${c.color}`}><c.icon className="h-5 w-5" /></div>
            <div className="font-display text-3xl font-bold">{c.value}</div>
            <div className="text-xs text-muted-foreground">{c.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display text-lg font-bold">Vencendo em breve</h2>
          {expiring.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Nada vencendo por aqui 🎉</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {expiring.map((i) => (
                <li key={i.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <span className="font-medium">{i.name}</span>
                  <span className="text-xs text-muted-foreground">{i.expires_at}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6 bg-hero text-primary-foreground shadow-glow">
          <TrendingUp className="h-6 w-6" />
          <h2 className="mt-3 font-display text-xl font-bold">Peça uma receita com IA</h2>
          <p className="mt-1 text-sm opacity-90">Com base no que você tem, criamos ideias deliciosas.</p>
          <Button asChild variant="secondary" className="mt-4"><Link to="/app/recipes">Gerar agora</Link></Button>
        </Card>
      </div>
    </div>
  );
}
