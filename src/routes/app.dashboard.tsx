import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Package, AlertTriangle, ChefHat, ShoppingCart, Wallet, Flame, Timer, Home, Bell, Sparkles, PawPrint } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import kotivaMark from "@/assets/kotiva-mark.png.asset.json";
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

const DONUT_COLORS = ["var(--primary)", "var(--warning)", "var(--accent)", "var(--destructive)"];

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

  const firstName = useMemo(() => {
    const meta = user?.user_metadata as { full_name?: string; name?: string } | undefined;
    const raw = meta?.full_name || meta?.name || user?.email?.split("@")[0] || "";
    const first = raw.split(/[\s.]+/)[0] ?? "";
    return first ? first.charAt(0).toUpperCase() + first.slice(1) : "por aqui";
  }, [user]);

  const cartTotal = useMemo(() => cart.reduce((s, i) => s + Number(i.quantity ?? 1) * Number(i.unit_price ?? 0), 0), [cart]);
  const billsOpen = useMemo(() => bills.filter((b) => !b.paid).reduce((s, b) => s + Number(b.amount || 0), 0), [bills]);
  const billsPaid = useMemo(() => bills.filter((b) => b.paid).reduce((s, b) => s + Number(b.amount || 0), 0), [bills]);
  const monthTotal = billsOpen + billsPaid + cartTotal;
  const donut = useMemo(
    () => [
      { name: "Contas pagas", value: billsPaid },
      { name: "Contas em aberto", value: billsOpen },
      { name: "Mercado", value: cartTotal },
    ].filter((d) => d.value > 0),
    [billsPaid, billsOpen, cartTotal],
  );

  const gasPct = useMemo(() => {
    if (!tank) return null;
    const used = Math.max(0, daysBetween(tank.installed_at));
    return Math.max(0, Math.min(100, Math.round(100 - (used / tank.avg_days) * 100)));
  }, [tank]);

  const quick = [
    { to: "/app/shopping", icon: ShoppingCart, label: "Compras", tone: "bg-primary/15 text-primary" },
    { to: "/app/items", icon: Package, label: "Geladeira", tone: "bg-warning/15 text-warning" },
    { to: "/app/finance", icon: Wallet, label: "Finanças", tone: "bg-accent/15 text-accent" },
    { to: "/app/recipes", icon: Sparkles, label: "IA Assistente", tone: "bg-primary/15 text-primary" },
  ] as const;

  const cards = [
    { label: "Itens na geladeira", value: String(stats.items), icon: Package, color: "text-primary bg-primary/10", to: "/app/items" },
    { label: "Vencendo em 3 dias", value: String(stats.expiring), icon: AlertTriangle, color: "text-warning bg-warning/10", to: "/app/items" },
    { label: "Compras estimadas", value: money(cartTotal), icon: ShoppingCart, color: "text-accent bg-accent/10", to: "/app/shopping" },
    { label: "Contas em aberto", value: money(billsOpen), icon: Wallet, color: "text-primary bg-primary/10", to: "/app/house" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Brand bar */}
      <div className="flex animate-fade-in items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={kotivaMark.url} alt="Kotiva" className="h-8 w-8" />
          <span className="font-display text-xl font-extrabold tracking-tight text-primary">KOTIVA</span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="relative">
            <Link to="/app/notifications" aria-label="Notificações">
              <Bell className="h-5 w-5" />
              {stats.unread > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-glow-pulse rounded-full bg-destructive" />
              )}
            </Link>
          </Button>
          <Link to="/app/profile" className="grid h-10 w-10 place-items-center rounded-full bg-hero font-display text-sm font-bold text-primary-foreground shadow-glow hover-scale">
            {firstName.charAt(0).toUpperCase()}
          </Link>
        </div>
      </div>

      {/* Greeting */}
      <div className="animate-fade-in stagger-1">
        <h1 className="font-display text-3xl font-extrabold">Olá, {firstName}! 👋</h1>
        <p className="text-muted-foreground">Tudo organizado na sua casa.</p>
      </div>

      {/* Balance hero card */}
      <Card className="relative animate-scale-in stagger-2 overflow-hidden border-primary/25 bg-hero p-6 text-primary-foreground shadow-glow">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 animate-glow-pulse rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="text-sm opacity-85">Gastos do mês</div>
            <div className="mt-1 font-display text-3xl font-extrabold sm:text-4xl">{money(monthTotal)}</div>
            <Link to="/app/finance" className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur transition-colors hover:bg-white/25">
              <Wallet className="h-3.5 w-3.5" /> Controle financeiro
            </Link>
          </div>
          <div className="h-24 w-24 shrink-0 sm:h-28 sm:w-28">
            {donut.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donut} dataKey="value" innerRadius="62%" outerRadius="100%" paddingAngle={3} stroke="none">
                    {donut.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full rounded-full border-8 border-white/25" />
            )}
          </div>
        </div>
      </Card>

      {/* Quick tiles */}
      <div className="grid grid-cols-4 gap-3">
        {quick.map((q, i) => (
          <Link key={q.to} to={q.to} className={`animate-fade-in stagger-${i + 1}`}>
            <Card className="flex h-full flex-col items-center gap-2 border-border/60 p-3 text-center hover-lift">
              <span className={`grid h-11 w-11 place-items-center rounded-2xl ${q.tone}`}>
                <q.icon className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-medium leading-tight text-muted-foreground sm:text-xs">{q.label}</span>
            </Card>
          </Link>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => (
          <Link key={c.label} to={c.to} className={`animate-fade-in stagger-${i + 1}`}>
            <Card className="p-5 hover-lift">
              <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl ${c.color}`}><c.icon className="h-5 w-5" /></div>
              <div className="font-display text-2xl font-bold">{c.value}</div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="animate-fade-in p-6 lg:col-span-2">
          <h2 className="font-display text-lg font-bold">Vencendo em breve</h2>
          {expiring.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Nada vencendo por aqui 🎉</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {expiring.map((i, idx) => {
                const d = i.expires_at ? -daysBetween(i.expires_at) : null;
                return (
                  <li key={i.id} className={`flex animate-slide-in items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm stagger-${Math.min(idx + 1, 6)}`}>
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

        <Card className="animate-fade-in stagger-2 p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Flame className="h-4 w-4 text-primary" /> Botijão</h2>
          {gasPct === null ? (
            <p className="mt-4 text-sm text-muted-foreground">Nenhum botijão registrado.</p>
          ) : (
            <>
              <div className="mt-4 font-display text-3xl font-bold">{gasPct}%</div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-3 rounded-full transition-all duration-700 ${gasPct > 50 ? "bg-accent" : gasPct > 20 ? "bg-warning" : "bg-destructive"}`}
                  style={{ width: `${gasPct}%` }}
                />
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
          { to: "/app/pets", icon: PawPrint, title: "Pet IA", desc: "Alimentação e lembretes" },
        ].map((q, i) => (
          <Link key={q.to} to={q.to} className={`animate-fade-in stagger-${i + 1}`}>
            <Card className="h-full p-5 hover-lift">
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
