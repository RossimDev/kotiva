import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Wallet, TrendingDown, ShoppingCart, Flame, Receipt, PieChart as PieIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { money } from "@/lib/kotiva";

export const Route = createFileRoute("/app/finance")({
  head: () => ({
    meta: [
      { title: "Financeiro — Kotiva" },
      { name: "description", content: "Dashboard financeiro da casa: contas, mercado e gás com filtros por período e relatórios." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Finance,
});

const PERIODS = [
  { value: "30", label: "30 dias" },
  { value: "90", label: "3 meses" },
  { value: "180", label: "6 meses" },
  { value: "365", label: "12 meses" },
] as const;

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--warning))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))"];

type Bill = { name: string; category: string; amount: number; paid: boolean; paid_at: string | null; due_date: string | null; due_day: number; created_at: string };
type Item = { name: string; category: string | null; quantity: number | null; unit_price: number | null; checked: boolean; created_at: string };
type Tank = { price: number | null; installed_at: string };

function monthKey(d: Date) {
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

function Finance() {
  const { user } = useAuth();
  const [days, setDays] = useState<string>("90");
  const [bills, setBills] = useState<Bill[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);

  const load = () => {
    Promise.all([
      supabase.from("household_bills").select("name,category,amount,paid,paid_at,due_date,due_day,created_at"),
      supabase.from("shopping_items").select("name,category,quantity,unit_price,checked,created_at"),
      supabase.from("gas_tanks").select("price,installed_at"),
    ]).then(([b, i, t]) => {
      setBills((b.data ?? []) as Bill[]);
      setItems((i.data ?? []) as Item[]);
      setTanks((t.data ?? []) as Tank[]);
    });
  };

  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase
      .channel("finance")
      .on("postgres_changes", { event: "*", schema: "public", table: "household_bills", filter: `user_id=eq.${user.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "shopping_items", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const from = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - Number(days));
    d.setHours(0, 0, 0, 0);
    return d;
  }, [days]);

  const data = useMemo(() => {
    const inRange = (iso: string | null) => !!iso && new Date(iso) >= from;

    const billsIn = bills.filter((b) => inRange(b.paid_at) || inRange(b.created_at));
    const itemsIn = items.filter((i) => inRange(i.created_at));
    const tanksIn = tanks.filter((t) => new Date(`${t.installed_at}T00:00:00`) >= from);

    const billsTotal = billsIn.reduce((s, b) => s + Number(b.amount || 0), 0);
    const billsPaid = billsIn.filter((b) => b.paid).reduce((s, b) => s + Number(b.amount || 0), 0);
    const marketTotal = itemsIn.reduce((s, i) => s + Number(i.quantity ?? 1) * Number(i.unit_price ?? 0), 0);
    const marketBought = itemsIn.filter((i) => i.checked).reduce((s, i) => s + Number(i.quantity ?? 1) * Number(i.unit_price ?? 0), 0);
    const gasTotal = tanksIn.reduce((s, t) => s + Number(t.price ?? 0), 0);

    // Série mensal
    const buckets = new Map<string, { label: string; contas: number; mercado: number; gas: number }>();
    const touch = (d: Date) => {
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      if (!buckets.has(k)) buckets.set(k, { label: monthKey(d), contas: 0, mercado: 0, gas: 0 });
      return buckets.get(k)!;
    };
    const months = Math.max(1, Math.round(Number(days) / 30));
    for (let m = months - 1; m >= 0; m--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - m);
      touch(d);
    }
    billsIn.forEach((b) => { touch(new Date(b.paid_at ?? b.created_at)).contas += Number(b.amount || 0); });
    itemsIn.forEach((i) => { touch(new Date(i.created_at)).mercado += Number(i.quantity ?? 1) * Number(i.unit_price ?? 0); });
    tanksIn.forEach((t) => { touch(new Date(`${t.installed_at}T00:00:00`)).gas += Number(t.price ?? 0); });
    const series = [...buckets.values()];

    // Por categoria (contas + mercado)
    const cats = new Map<string, number>();
    billsIn.forEach((b) => cats.set(b.category, (cats.get(b.category) ?? 0) + Number(b.amount || 0)));
    itemsIn.forEach((i) => {
      const k = i.category || "Mercado";
      cats.set(k, (cats.get(k) ?? 0) + Number(i.quantity ?? 1) * Number(i.unit_price ?? 0));
    });
    if (gasTotal > 0) cats.set("Gás", (cats.get("Gás") ?? 0) + gasTotal);
    const byCategory = [...cats.entries()].map(([name, value]) => ({ name, value })).filter((c) => c.value > 0).sort((a, b) => b.value - a.value);

    const total = billsTotal + marketTotal + gasTotal;
    return { billsTotal, billsPaid, billsOpen: billsTotal - billsPaid, marketTotal, marketBought, gasTotal, total, series, byCategory, monthlyAvg: total / Math.max(1, series.length) };
  }, [bills, items, tanks, from, days]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Financeiro</h1>
          <p className="text-muted-foreground">Visão geral dos gastos da casa por período, categoria e módulo.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PERIODS.map((p) => (
            <Button key={p.value} size="sm" variant={days === p.value ? "default" : "outline"} className="rounded-full" onClick={() => setDays(p.value)}>
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={TrendingDown} label="Gasto total no período" value={money(data.total)} hint={`média ${money(data.monthlyAvg)}/mês`} />
        <Kpi icon={Receipt} label="Contas da casa" value={money(data.billsTotal)} hint={`${money(data.billsOpen)} em aberto`} />
        <Kpi icon={ShoppingCart} label="Mercado" value={money(data.marketTotal)} hint={`${money(data.marketBought)} já comprado`} />
        <Kpi icon={Flame} label="Gás" value={money(data.gasTotal)} hint={`${tanks.length} botijões registrados`} />
      </div>

      <Card className="p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Wallet className="h-4 w-4" /> Evolução mensal</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.series}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} width={54} tickFormatter={(v: number) => money(v).replace("R$", "").trim()} />
              <Tooltip formatter={(v: number, n: string) => [money(v), n]} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
              <Legend />
              <Bar dataKey="contas" name="Contas" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
              <Bar dataKey="mercado" name="Mercado" stackId="a" fill="hsl(var(--accent))" />
              <Bar dataKey="gas" name="Gás" stackId="a" fill="hsl(var(--warning))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><PieIcon className="h-4 w-4" /> Gastos por categoria</h2>
          {data.byCategory.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Nenhum gasto registrado neste período.</p>
          ) : (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.byCategory.slice(0, 6)} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3}>
                    {data.byCategory.slice(0, 6).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => money(v)} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">Tendência do gasto total</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.series.map((s) => ({ label: s.label, total: s.contas + s.mercado + s.gas }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={54} tickFormatter={(v: number) => money(v).replace("R$", "").trim()} />
                <Tooltip formatter={(v: number) => [money(v), "Total"]} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-display text-lg font-bold">Relatório do período</h2>
        <ul className="mt-3 divide-y divide-border/60 text-sm">
          {data.byCategory.map((c) => (
            <li key={c.name} className="flex items-center justify-between py-2">
              <span className="flex items-center gap-2">
                <Badge variant="secondary">{c.name}</Badge>
                <span className="text-xs text-muted-foreground">{data.total > 0 ? Math.round((c.value / data.total) * 100) : 0}% do total</span>
              </span>
              <span className="font-display font-bold">{money(c.value)}</span>
            </li>
          ))}
          {data.byCategory.length === 0 && <li className="py-2 text-muted-foreground">Sem dados para exibir.</li>}
        </ul>
      </Card>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, hint }: { icon: typeof Wallet; label: string; value: string; hint: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4" /> {label}</div>
      <div className="mt-2 font-display text-2xl font-extrabold">{value}</div>
      <div className="text-xs text-muted-foreground">{hint}</div>
    </Card>
  );
}
