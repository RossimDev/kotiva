import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Flame, Plus, RefreshCw, Trash2, CircleOff, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { money, daysBetween, addDays, isoDate } from "@/lib/kotiva";

export const Route = createFileRoute("/app/gas")({
  head: () => ({
    meta: [
      { title: "Botijão Inteligente — Kotiva" },
      { name: "description", content: "Controle o consumo de gás, veja o nível estimado, histórico de trocas e custo por dia." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Gas,
});

type Tank = {
  id: string;
  name: string;
  capacity_kg: number;
  installed_at: string;
  emptied_at: string | null;
  avg_days: number;
  price: number | null;
  active: boolean;
};

function Gas() {
  const { user } = useAuth();
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [form, setForm] = useState({ name: "Botijão principal", capacity_kg: "13", avg_days: "45", price: "", installed_at: isoDate(new Date()) });

  const load = () =>
    supabase
      .from("gas_tanks")
      .select("id,name,capacity_kg,installed_at,emptied_at,avg_days,price,active")
      .order("installed_at", { ascending: false })
      .then(({ data }) => setTanks((data ?? []) as Tank[]));

  useEffect(() => {
    if (user) load();
  }, [user]);

  const current = useMemo(() => tanks.find((t) => t.active) ?? null, [tanks]);

  /** Histórico com duração real (dias entre instalação e fim do gás). */
  const history = useMemo(
    () =>
      tanks
        .filter((t) => t.emptied_at)
        .map((t) => ({
          id: t.id,
          label: new Date(`${t.installed_at}T00:00:00`).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
          dias: Math.max(1, daysBetween(t.installed_at, new Date(`${t.emptied_at}T00:00:00`))),
          preco: Number(t.price ?? 0),
        }))
        .reverse(),
    [tanks],
  );

  const realAvg = useMemo(
    () => (history.length ? Math.round(history.reduce((s, h) => s + h.dias, 0) / history.length) : null),
    [history],
  );

  const status = useMemo(() => {
    if (!current) return null;
    const base = realAvg ?? current.avg_days;
    const used = Math.max(0, daysBetween(current.installed_at));
    const pct = Math.max(0, Math.min(100, 100 - (used / base) * 100));
    const left = Math.max(0, base - used);
    const endDate = addDays(new Date(`${current.installed_at}T00:00:00`), base);
    const costDay = current.price ? Number(current.price) / base : 0;
    const kgDay = current.capacity_kg / base;
    return { used, pct, left, endDate, costDay, base, kgDay };
  }, [current, realAvg]);

  const add = async () => {
    if (!user) return;
    await supabase.from("gas_tanks").update({ active: false }).eq("user_id", user.id).eq("active", true);
    const { error } = await supabase.from("gas_tanks").insert({
      user_id: user.id,
      name: form.name.trim() || "Botijão",
      capacity_kg: Number(form.capacity_kg) || 13,
      avg_days: Math.max(5, Number(form.avg_days) || 45),
      price: form.price ? Number(form.price.replace(",", ".")) : null,
      installed_at: form.installed_at,
      active: true,
    });
    if (error) return toast.error(error.message);
    toast.success("Botijão registrado!");
    load();
  };

  /** Marca o botijão atual como vazio e calcula a duração exata. */
  const markEmpty = async () => {
    if (!current) return;
    const today = isoDate(new Date());
    const realDays = Math.max(1, daysBetween(current.installed_at, new Date()));
    const { error } = await supabase
      .from("gas_tanks")
      .update({ emptied_at: today, avg_days: realDays, active: false })
      .eq("id", current.id);
    if (error) return toast.error(error.message);
    toast.success(`Botijão durou exatamente ${realDays} dias. Registre o novo abaixo.`);
    setForm((f) => ({ ...f, installed_at: today, avg_days: String(realDays) }));
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("gas_tanks").delete().eq("id", id);
    load();
  };

  const barColor = !status ? "bg-muted" : status.pct > 50 ? "bg-accent" : status.pct > 20 ? "bg-warning" : "bg-destructive";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Botijão Inteligente</h1>
        <p className="text-muted-foreground">Acompanhe o consumo de gás e saiba quando comprar antes de acabar.</p>
      </div>

      {current && status ? (
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Flame className="h-5 w-5" /></span>
              <div>
                <div className="font-display text-lg font-bold">{current.name}</div>
                <div className="text-xs text-muted-foreground">{current.capacity_kg} kg • instalado em {new Date(`${current.installed_at}T00:00:00`).toLocaleDateString("pt-BR")}</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={status.pct > 20 ? "secondary" : "destructive"}>
                {status.left > 0 ? `~${status.left} dias restantes` : "Provavelmente vazio"}
              </Badge>
              <Button size="sm" variant="destructive" onClick={markEmpty}>
                <CircleOff className="mr-2 h-4 w-4" /> O gás acabou
              </Button>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-muted-foreground">Nível estimado</span>
              <span className="font-display font-bold">{Math.round(status.pct)}%</span>
            </div>
            <div className="h-4 rounded-full bg-muted">
              <div className={`h-4 rounded-full transition-all ${barColor}`} style={{ width: `${status.pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Base de cálculo: {status.base} dias {realAvg ? "(média real das suas trocas)" : "(estimativa informada)"} • consumo ~{status.kgDay.toFixed(2)} kg/dia
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <Stat value={String(status.used)} label="dias de uso" />
            <Stat value={String(status.left)} label="dias restantes" />
            <Stat value={status.endDate.toLocaleDateString("pt-BR")} label="troca prevista" />
            <Stat value={money(status.costDay)} label="custo por dia" />
          </div>

          {status.pct <= 20 && (
            <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              Hora de encomendar um botijão reserva — o consumo estimado está no fim.
            </p>
          )}
        </Card>
      ) : (
        <Card className="p-10 text-center text-muted-foreground">Nenhum botijão ativo. Registre o novo botijão abaixo.</Card>
      )}

      <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <Label className="text-xs">Nome</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Capacidade (kg)</Label>
          <Input type="number" min="1" value={form.capacity_kg} onChange={(e) => setForm({ ...form, capacity_kg: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Duração média (dias)</Label>
          <Input type="number" min="5" value={form.avg_days} onChange={(e) => setForm({ ...form, avg_days: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Preço pago (R$)</Label>
          <Input inputMode="decimal" placeholder="120,00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label className="text-xs">Instalado em</Label>
            <Input type="date" value={form.installed_at} onChange={(e) => setForm({ ...form, installed_at: e.target.value })} />
          </div>
          <Button onClick={add} title="Registrar troca"><Plus className="h-4 w-4" /></Button>
        </div>
      </Card>

      {history.length > 0 && (
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><TrendingUp className="h-4 w-4" /> Duração real por botijão</h2>
          <p className="text-xs text-muted-foreground">Média real de {realAvg} dias • custo médio {money(history.reduce((s, h) => s + h.preco, 0) / history.length)}</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={30} />
                <Tooltip formatter={(v: number) => [`${v} dias`, "Duração"]} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="dias" radius={[8, 8, 0, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold"><RefreshCw className="h-4 w-4" /> Histórico de trocas</h2>
        {tanks.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Sem histórico ainda.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {tanks.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <div>
                  <div className="font-medium">{t.name} {t.active && <Badge className="ml-2" variant="secondary">Ativo</Badge>}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(`${t.installed_at}T00:00:00`).toLocaleDateString("pt-BR")}
                    {t.emptied_at && ` → ${new Date(`${t.emptied_at}T00:00:00`).toLocaleDateString("pt-BR")} (${Math.max(1, daysBetween(t.installed_at, new Date(`${t.emptied_at}T00:00:00`)))} dias)`}
                    {" • "}{t.capacity_kg} kg • {t.price ? money(t.price) : "sem preço"}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => remove(t.id)} aria-label="Excluir registro"><Trash2 className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3 text-center">
      <div className="font-display text-xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
