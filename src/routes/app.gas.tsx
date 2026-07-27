import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Flame, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { money, daysBetween, addDays, isoDate } from "@/lib/kotiva";

export const Route = createFileRoute("/app/gas")({
  head: () => ({ meta: [{ title: "Botijão Inteligente — Kotiva" }, { name: "robots", content: "noindex" }] }),
  component: Gas,
});

type Tank = {
  id: string;
  name: string;
  capacity_kg: number;
  installed_at: string;
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
      .select("id,name,capacity_kg,installed_at,avg_days,price,active")
      .order("created_at", { ascending: false })
      .then(({ data }) => setTanks((data ?? []) as Tank[]));

  useEffect(() => {
    if (user) load();
  }, [user]);

  const current = useMemo(() => tanks.find((t) => t.active) ?? null, [tanks]);

  const status = useMemo(() => {
    if (!current) return null;
    const used = Math.max(0, daysBetween(current.installed_at));
    const pct = Math.max(0, Math.min(100, 100 - (used / current.avg_days) * 100));
    const left = Math.max(0, current.avg_days - used);
    const endDate = addDays(new Date(`${current.installed_at}T00:00:00`), current.avg_days);
    const costDay = current.price ? Number(current.price) / current.avg_days : 0;
    return { used, pct, left, endDate, costDay };
  }, [current]);

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
            <Badge variant={status.pct > 20 ? "secondary" : "destructive"}>
              {status.left > 0 ? `~${status.left} dias restantes` : "Provavelmente vazio"}
            </Badge>
          </div>

          <div className="mt-5">
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-muted-foreground">Nível estimado</span>
              <span className="font-display font-bold">{Math.round(status.pct)}%</span>
            </div>
            <div className="h-4 rounded-full bg-muted">
              <div className={`h-4 rounded-full transition-all ${barColor}`} style={{ width: `${status.pct}%` }} />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <div className="font-display text-xl font-bold">{status.used}</div>
              <div className="text-xs text-muted-foreground">dias de uso</div>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <div className="font-display text-xl font-bold">{status.endDate.toLocaleDateString("pt-BR")}</div>
              <div className="text-xs text-muted-foreground">troca prevista</div>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <div className="font-display text-xl font-bold">{money(status.costDay)}</div>
              <div className="text-xs text-muted-foreground">custo por dia</div>
            </div>
          </div>

          {status.pct <= 20 && (
            <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              Hora de encomendar um botijão reserva — o consumo estimado está no fim.
            </p>
          )}
        </Card>
      ) : (
        <Card className="p-10 text-center text-muted-foreground">Nenhum botijão ativo. Registre o primeiro abaixo.</Card>
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
                    {new Date(`${t.installed_at}T00:00:00`).toLocaleDateString("pt-BR")} • {t.capacity_kg} kg • {t.price ? money(t.price) : "sem preço"}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
