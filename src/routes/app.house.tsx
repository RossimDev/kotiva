import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Home, Plus, Trash2, CheckCircle2, Circle, Wallet, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartColorSettings, useChartColors } from "@/components/chart-colors";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BILL_CATEGORIES, money, isoDate } from "@/lib/kotiva";

export const Route = createFileRoute("/app/house")({
  head: () => ({ meta: [{ title: "Casa Inteligente — Kotiva" }, { name: "robots", content: "noindex" }] }),
  component: House,
});

type Bill = {
  id: string;
  name: string;
  category: string;
  amount: number;
  due_day: number;
  paid: boolean;
  recurring: boolean;
  notes: string | null;
};

function House() {
  const { user } = useAuth();
  const houseColors = useChartColors("house");
  const [bills, setBills] = useState<Bill[]>([]);
  const [form, setForm] = useState({ name: "", category: "Moradia", amount: "", due_day: "5", recurring: true });

  const load = () =>
    supabase
      .from("household_bills")
      .select("id,name,category,amount,due_day,paid,recurring,notes")
      .order("due_day")
      .then(({ data }) => setBills((data ?? []) as Bill[]));

  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase
      .channel("bills")
      .on("postgres_changes", { event: "*", schema: "public", table: "household_bills", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const totals = useMemo(() => {
    const total = bills.reduce((s, b) => s + Number(b.amount || 0), 0);
    const paid = bills.filter((b) => b.paid).reduce((s, b) => s + Number(b.amount || 0), 0);
    const today = new Date().getDate();
    const upcoming = bills.filter((b) => !b.paid && b.due_day >= today).length;
    const late = bills.filter((b) => !b.paid && b.due_day < today).length;
    return { total, paid, open: total - paid, upcoming, late };
  }, [bills]);

  const add = async () => {
    if (!user || !form.name.trim()) return toast.error("Informe o nome da conta");
    const { error } = await supabase.from("household_bills").insert({
      user_id: user.id,
      name: form.name.trim().slice(0, 120),
      category: form.category,
      amount: Number(form.amount.replace(",", ".")) || 0,
      due_day: Math.min(31, Math.max(1, Number(form.due_day) || 1)),
      recurring: form.recurring,
    });
    if (error) return toast.error(error.message);
    setForm({ name: "", category: "Moradia", amount: "", due_day: "5", recurring: true });
    toast.success("Conta adicionada");
    load();
  };

  const togglePaid = async (b: Bill) => {
    await supabase.from("household_bills").update({ paid: !b.paid, paid_at: !b.paid ? isoDate(new Date()) : null }).eq("id", b.id);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("household_bills").delete().eq("id", id);
    load();
  };

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    bills.forEach((b) => map.set(b.category, (map.get(b.category) ?? 0) + Number(b.amount || 0)));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [bills]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Casa Inteligente</h1>
        <p className="text-muted-foreground">Contas, vencimentos e o custo real da sua casa todo mês.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total do mês", value: money(totals.total), icon: Wallet, color: "text-primary bg-primary/10" },
          { label: "Já pago", value: money(totals.paid), icon: CheckCircle2, color: "text-accent bg-accent/10" },
          { label: "Em aberto", value: money(totals.open), icon: Home, color: "text-warning bg-warning/10" },
          { label: "Contas atrasadas", value: String(totals.late), icon: CalendarClock, color: "text-destructive bg-destructive/10" },
        ].map((c) => (
          <Card key={c.label} className="p-5">
            <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl ${c.color}`}><c.icon className="h-5 w-5" /></div>
            <div className="font-display text-2xl font-bold">{c.value}</div>
            <div className="text-xs text-muted-foreground">{c.label}</div>
          </Card>
        ))}
      </div>

      <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Label className="text-xs">Conta</Label>
          <Input placeholder="Ex: Aluguel" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Categoria</Label>
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{BILL_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Valor (R$)</Label>
          <Input inputMode="decimal" placeholder="0,00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label className="text-xs">Dia venc.</Label>
            <Input type="number" min="1" max="31" value={form.due_day} onChange={(e) => setForm({ ...form, due_day: e.target.value })} />
          </div>
          <Button onClick={add}><Plus className="h-4 w-4" /></Button>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-display text-lg font-bold">Contas do mês</h2>
          {bills.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Nenhuma conta cadastrada ainda.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {bills.map((b) => {
                const late = !b.paid && b.due_day < new Date().getDate();
                return (
                  <li key={b.id} className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
                    <button onClick={() => togglePaid(b)} aria-label="Marcar como paga">
                      {b.paid ? <CheckCircle2 className="h-5 w-5 text-accent" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                    </button>
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${b.paid ? "line-through opacity-60" : ""}`}>{b.name}</div>
                      <div className="text-xs text-muted-foreground">{b.category} • vence dia {b.due_day}</div>
                    </div>
                    {late && <Badge variant="destructive">Atrasada</Badge>}
                    <div className="font-display font-bold">{money(b.amount)}</div>
                    <Button size="sm" variant="ghost" onClick={() => remove(b.id)}><Trash2 className="h-4 w-4" /></Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Por categoria</h2>
            <ChartColorSettings keys={byCategory.map(([c]) => c)} controller={houseColors} />
          </div>
          {byCategory.length > 0 && (
            <div className="mt-3 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCategory.map(([name, value]) => ({ name, value }))} dataKey="value" nameKey="name" innerRadius={42} outerRadius={72} paddingAngle={3}>
                    {byCategory.map(([name], i) => <Cell key={name} fill={houseColors.colorFor(name, i)} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => money(v)} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {byCategory.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Sem dados.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {byCategory.map(([cat, val], ci) => (
                <li key={cat}>
                  <div className="flex justify-between text-sm"><span>{cat}</span><span className="font-medium">{money(val)}</span></div>
                  <div className="mt-1 h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full" style={{ width: `${totals.total ? (val / totals.total) * 100 : 0}%`, background: houseColors.colorFor(cat, ci) }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
