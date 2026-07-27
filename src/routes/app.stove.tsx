import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Timer, Play, Pause, RotateCcw, Plus, Trash2, Flame } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatSeconds, pushLocalNotification } from "@/lib/kotiva";

export const Route = createFileRoute("/app/stove")({
  head: () => ({ meta: [{ title: "Fogão Inteligente — Kotiva" }, { name: "robots", content: "noindex" }] }),
  component: Stove,
});

type Preset = { id: string; name: string; seconds: number };

const DEFAULTS: Preset[] = [
  { id: "d1", name: "Ovo cozido", seconds: 480 },
  { id: "d2", name: "Arroz branco", seconds: 900 },
  { id: "d3", name: "Macarrão al dente", seconds: 600 },
  { id: "d4", name: "Feijão na pressão", seconds: 1800 },
  { id: "d5", name: "Bife na frigideira", seconds: 300 },
  { id: "d6", name: "Bolo no forno", seconds: 2400 },
];

function Stove() {
  const { user } = useAuth();
  const [custom, setCustom] = useState<Preset[]>([]);
  const [form, setForm] = useState({ name: "", minutes: "10" });
  const [active, setActive] = useState<{ name: string; remaining: number; running: boolean } | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = () =>
    supabase
      .from("kitchen_timers")
      .select("id,name,seconds")
      .order("created_at")
      .then(({ data }) => setCustom((data ?? []) as Preset[]));

  useEffect(() => {
    if (user) load();
  }, [user]);

  useEffect(() => {
    if (tick.current) clearInterval(tick.current);
    if (active?.running) {
      tick.current = setInterval(() => {
        setActive((a) => {
          if (!a) return a;
          if (a.remaining <= 1) {
            pushLocalNotification("⏰ Tempo esgotado!", `${a.name} está pronto.`);
            toast.success(`⏰ ${a.name} está pronto!`);
            return { ...a, remaining: 0, running: false };
          }
          return { ...a, remaining: a.remaining - 1 };
        });
      }, 1000);
    }
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, [active?.running, active?.name]);

  const start = (p: Preset) => setActive({ name: p.name, remaining: p.seconds, running: true });

  const addPreset = async () => {
    if (!user || !form.name.trim()) return;
    const seconds = Math.max(5, Math.round((Number(form.minutes) || 1) * 60));
    const { error } = await supabase.from("kitchen_timers").insert({ user_id: user.id, name: form.name.trim(), seconds });
    if (error) return toast.error(error.message);
    setForm({ name: "", minutes: "10" });
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("kitchen_timers").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Fogão Inteligente</h1>
        <p className="text-muted-foreground">Cronômetros de cozinha com alerta na tela e notificação.</p>
      </div>

      <Card className="flex flex-col items-center gap-4 bg-hero p-8 text-primary-foreground shadow-glow">
        <Flame className="h-7 w-7" />
        <div className="font-display text-6xl font-extrabold tabular-nums">{formatSeconds(active?.remaining ?? 0)}</div>
        <div className="text-sm opacity-90">{active?.name ?? "Nenhum cronômetro ativo"}</div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={!active || active.remaining === 0}
            onClick={() => setActive((a) => (a ? { ...a, running: !a.running } : a))}
          >
            {active?.running ? <><Pause className="mr-2 h-4 w-4" /> Pausar</> : <><Play className="mr-2 h-4 w-4" /> Retomar</>}
          </Button>
          <Button variant="secondary" disabled={!active} onClick={() => setActive(null)}>
            <RotateCcw className="mr-2 h-4 w-4" /> Limpar
          </Button>
        </div>
      </Card>

      <div>
        <h2 className="mb-3 font-display text-lg font-bold">Atalhos rápidos</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DEFAULTS.map((p) => (
            <Card key={p.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{formatSeconds(p.seconds)}</div>
              </div>
              <Button size="sm" onClick={() => start(p)}><Timer className="mr-2 h-4 w-4" /> Iniciar</Button>
            </Card>
          ))}
        </div>
      </div>

      <Card className="p-5">
        <h2 className="font-display text-lg font-bold">Meus cronômetros</h2>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-40 flex-1">
            <Label className="text-xs">Nome</Label>
            <Input value={form.name} placeholder="Ex: Pão de queijo" onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="w-28">
            <Label className="text-xs">Minutos</Label>
            <Input type="number" min="1" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} />
          </div>
          <Button onClick={addPreset}><Plus className="mr-2 h-4 w-4" /> Adicionar</Button>
        </div>

        {custom.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Você ainda não salvou cronômetros personalizados.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {custom.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <div>
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{formatSeconds(p.seconds)}</div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => start(p)}><Play className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
