import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Package, AlertTriangle, ChefHat, ShoppingCart, Wallet, Flame, Timer, Home, Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { money, daysBetween } from "@/lib/kotiva";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "Painel — Kotiva" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});

type Expiring = { id: string; name: string; expires_at: string | null };

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ items: 0, expiring: 0, shopping: 0, recipes: 0, unread: 0 });
  const [expiring, setExpiring] = useState<Expiring[]>([]);
  const [bills, setBills] = useState<Array<{ name: string; amount: number; due_day: number; paid: boolean }>>([]);
  const [tank, setTank] = useState<{ installed_at: string; avg_days: number } | null>(null);
  const [cart, setCart] = useState<Array<{ quantity: number | null; unit_price: number | null }>>([]);

  const load = () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 3);
    Promise.all([
      supabase.from("fridge_items").select("id", { count: "exact", head: true }),
      supabase.from("fridge_items").select("id", { count: "exact", head: true }).lte("expires_at", soon.toISOString().slice(0, 10)),
      supabase.from("shopping_items").select("id", { count: "exact", head: true }).eq("checked", false),
      supabase.from("saved_recipes").select("id", { count: "exact", head: true }),
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false),
      supabase.from("fridge_items").select("id,name,expires_at").not("expires_at", "is", null).order("expires_at").limit(6),
      supabase.from("household_bills").select("name,amount,due_day,paid").order("due_day"),
      supabase.from("gas_tanks").select("installed_at,avg_days").eq("active", true).maybeSingle(),
      supabase.from("shopping_items").select("quantity,unit_price").eq("checked", false),
    ]).then(([a, b, c, d, n, e, f, g, h]) => {
      setStats({ items: a.count ?? 0, expiring: b.count ?? 0, shopping: c.count ?? 0, recipes: d.count ?? 0, unread: n.count ?? 0 });
      setExpiring(e.data ?? []);
      setBills(f.data ?? []);
      setTank((g.data as { installed_at: string; avg_days: number } | null) ?? null);
      setCart(h.data ?? []);
    });
  };

  useEffect(() => {
    if (!user) return;
    load();
    const channel = supabase
      .channel("dash")
      .on("postgres_changes", { event: "*", schema: "public", table: "fridge_items", filter: `user_id=eq.${user.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "shopping_items", filter: `user_id=eq.${user.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "household_bills", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const cartTotal = useMemo(() => cart.reduce((s, i) => s + Number(i.quantity ?? 1) * Number(i.unit_price ?? 0), 0), [cart]);
  const billsOpen = useMemo(() => bills.filter((b) => !b.paid).reduce((s, b) => s + Number(b.amount || 0), 0), [bills]);
  const gasPct = useMemo(() => {
    if (!tank) return null;
    const used = Math.max(0, daysBetween(tank.installed_at));
    return Math.max(0, Math.min(100, Math.round(100 - (used / tank.avg_days) * 100)));
  }, [tank]);

  const cards = [
    { label: "Itens na geladeira", value: String(stats.items), icon: Package, color: "text-primary bg-primary/10", to: "/app/items" },
    { label: "Vencendo em 3 dias", value: String(stats.expiring), icon: AlertTriangle, color: "text-warning bg-warning/10", to: "/app/items" },
    { label: "Compras estimadas", value: money(cartTotal), icon: ShoppingCart, color: "text-accent bg-accent/10", to: "/app/shopping" },
    { label: "Contas em aberto", value: money(billsOpen), icon: Wallet, color: "text-primary bg-primary/10", to: "/app/house" },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Olá 👋</h1>
          <p className="text-muted-foreground">Sua casa em tempo real: geladeira, compras, contas e gás.</p>
        </div>
        <div className="flex gap-2">
          {stats.unread > 0 && (
            <Button asChild variant="outline">
              <Link to="/app/notifications"><Bell className="mr-2 h-4 w-4" /> {stats.unread} alertas</Link>
            </Button>
          )}
          <Button asChild className="shadow-glow"><Link to="/app/items">Gerenciar geladeira</Link></Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to}>
            <Card className="p-5 transition-transform hover:-translate-y-0.5">
              <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl ${c.color}`}><c.icon className="h-5 w-5" /></div>
              <div className="font-display text-2xl font-bold">{c.value}</div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h2 className="font-display text-lg font-bold">Vencendo em breve</h2>
          {expiring.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Nada vencendo por aqui 🎉</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {expiring.map((i) => {
                const d = i.expires_at ? -daysBetween(i.expires_at) : null;
                return (
                  <li key={i.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                    <span className="font-medium">{i.name}</span>
                    <Badge variant={d !== null && d < 0 ? "destructive" : d !== null && d <= 3 ? "secondary" : "outline"}>
                      {d === null ? "—" : d < 0 ? "vencido" : d === 0 ? "vence hoje" : `${d} dias`}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Flame className="h-4 w-4" /> Botijão</h2>
          {gasPct === null ? (
            <p className="mt-4 text-sm text-muted-foreground">Nenhum botijão registrado.</p>
          ) : (
            <>
              <div className="mt-4 font-display text-3xl font-bold">{gasPct}%</div>
              <div className="mt-2 h-3 rounded-full bg-muted">
                <div className={`h-3 rounded-full ${gasPct > 50 ? "bg-accent" : gasPct > 20 ? "bg-warning" : "bg-destructive"}`} style={{ width: `${gasPct}%` }} />
              </div>
            </>
          )}
          <Button asChild variant="outline" size="sm" className="mt-4 w-full"><Link to="/app/gas">Abrir botijão</Link></Button>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { to: "/app/recipes", icon: ChefHat, title: "Cozinheiro IA", desc: "Receitas e cardápio de 7 dias" },
          { to: "/app/stove", icon: Timer, title: "Fogão Inteligente", desc: "Cronômetros de cozinha" },
          { to: "/app/house", icon: Home, title: "Casa Inteligente", desc: "Contas e finanças" },
          { to: "/app/shopping", icon: ShoppingCart, title: "Compras", desc: "Listas com preço em tempo real" },
        ].map((q) => (
          <Link key={q.to} to={q.to}>
            <Card className="h-full p-5 transition-colors hover:bg-muted/40">
              <q.icon className="h-5 w-5 text-primary" />
              <div className="mt-3 font-display font-bold">{q.title}</div>
              <div className="text-xs text-muted-foreground">{q.desc}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
