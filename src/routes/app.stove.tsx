import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Timer, Play, Pause, RotateCcw, Plus, Trash2, Flame, Pencil, ArrowUp, ArrowDown, Volume2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatSeconds, pushLocalNotification } from "@/lib/kotiva";
import {
  SOUND_LIBRARY, playAlarm, getDefaultSound, setDefaultSound, getCustomSound, saveCustomSound, clearCustomSound, type SoundId,
} from "@/lib/sounds";

export const Route = createFileRoute("/app/stove")({
  head: () => ({ meta: [{ title: "Fogão Inteligente — Kotiva" }, { name: "robots", content: "noindex" }] }),
  component: Stove,
});

type Preset = { id: string; name: string; seconds: number; sound?: string | null; sort_order?: number };

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
  const [editing, setEditing] = useState<Preset | null>(null);
  const [editForm, setEditForm] = useState({ name: "", minutes: "10", sound: "" });
  const [active, setActive] = useState<{ name: string; remaining: number; running: boolean; sound: SoundId } | null>(null);
  const [defaultSound, setDefault] = useState<SoundId>("classico");
  const [customSound, setCustomSoundState] = useState<{ name: string; data: string } | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopAlarm = useRef<(() => void) | null>(null);

  const load = () =>
    supabase
      .from("kitchen_timers")
      .select("id,name,seconds,sound,sort_order")
      .order("sort_order")
      .order("created_at")
      .then(({ data }) => setCustom((data ?? []) as Preset[]));

  useEffect(() => { if (user) load(); }, [user]);
  useEffect(() => { setDefault(getDefaultSound()); setCustomSoundState(getCustomSound()); }, []);

  useEffect(() => {
    if (tick.current) clearInterval(tick.current);
    if (active?.running) {
      tick.current = setInterval(() => {
        setActive((a) => {
          if (!a) return a;
          if (a.remaining <= 1) {
            stopAlarm.current = playAlarm(a.sound);
            pushLocalNotification("⏰ Tempo esgotado!", `${a.name} está pronto.`);
            toast.success(`⏰ ${a.name} está pronto!`);
            return { ...a, remaining: 0, running: false };
          }
          return { ...a, remaining: a.remaining - 1 };
        });
      }, 1000);
    }
    return () => { if (tick.current) clearInterval(tick.current); };
  }, [active?.running, active?.name]);

  const start = (p: Preset) => {
    stopAlarm.current?.();
    setActive({ name: p.name, remaining: p.seconds, running: true, sound: (p.sound as SoundId) || defaultSound });
  };

  const clearActive = () => { stopAlarm.current?.(); stopAlarm.current = null; setActive(null); };

  const addPreset = async () => {
    if (!user || !form.name.trim()) return toast.error("Informe o nome do atalho.");
    const seconds = Math.max(5, Math.round((Number(form.minutes) || 1) * 60));
    const { error } = await supabase.from("kitchen_timers").insert({
      user_id: user.id,
      name: form.name.trim().slice(0, 80),
      seconds,
      sound: defaultSound,
      sort_order: custom.length,
    });
    if (error) return toast.error(error.message);
    setForm({ name: "", minutes: "10" });
    toast.success("Atalho rápido criado!");
    load();
  };

  const openEdit = (p: Preset) => {
    setEditing(p);
    setEditForm({ name: p.name, minutes: String(p.seconds / 60), sound: (p.sound as string) || defaultSound });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const seconds = Math.max(5, Math.round((Number(editForm.minutes) || 1) * 60));
    const { error } = await supabase.from("kitchen_timers")
      .update({ name: editForm.name.trim().slice(0, 80) || editing.name, seconds, sound: editForm.sound })
      .eq("id", editing.id);
    if (error) return toast.error(error.message);
    setEditing(null);
    load();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...custom];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setCustom(next);
    await Promise.all(next.map((p, i) => supabase.from("kitchen_timers").update({ sort_order: i }).eq("id", p.id)));
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("kitchen_timers").delete().eq("id", id);
    load();
  };

  const onUpload = async (file: File) => {
    if (!file.type.startsWith("audio/")) return toast.error("Envie um arquivo de áudio.");
    if (file.size > 1.5 * 1024 * 1024) return toast.error("O áudio deve ter no máximo 1,5 MB.");
    const reader = new FileReader();
    reader.onload = () => {
      saveCustomSound(file.name, String(reader.result));
      setCustomSoundState(getCustomSound());
      setDefaultSound("custom");
      setDefault("custom");
      toast.success("Som personalizado salvo como alerta padrão!");
    };
    reader.readAsDataURL(file);
  };

  const shortcuts = [...custom, ...DEFAULTS];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Fogão Inteligente</h1>
        <p className="text-muted-foreground">Cronômetros de cozinha com som de alerta, notificação e atalhos personalizados.</p>
      </div>

      <Card className="flex flex-col items-center gap-4 bg-hero p-8 text-primary-foreground shadow-glow">
        <Flame className="h-7 w-7" />
        <div className="font-display text-6xl font-extrabold tabular-nums">{formatSeconds(active?.remaining ?? 0)}</div>
        <div className="text-sm opacity-90">{active?.name ?? "Nenhum cronômetro ativo"}</div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="secondary" disabled={!active || active.remaining === 0} onClick={() => setActive((a) => (a ? { ...a, running: !a.running } : a))}>
            {active?.running ? <><Pause className="mr-2 h-4 w-4" /> Pausar</> : <><Play className="mr-2 h-4 w-4" /> Retomar</>}
          </Button>
          <Button variant="secondary" disabled={!active} onClick={clearActive}><RotateCcw className="mr-2 h-4 w-4" /> Limpar</Button>
          {active?.remaining === 0 && (
            <Button variant="secondary" onClick={() => { stopAlarm.current?.(); stopAlarm.current = null; }}><X className="mr-2 h-4 w-4" /> Parar som</Button>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Volume2 className="h-4 w-4" /> Som do alerta</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Label className="text-xs">Som padrão</Label>
            <Select value={defaultSound} onValueChange={(v) => { setDefault(v as SoundId); setDefaultSound(v as SoundId); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOUND_LIBRARY.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                {customSound && <SelectItem value="custom">Meu áudio — {customSound.name}</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button variant="outline" className="flex-1" onClick={() => playAlarm(defaultSound)}><Play className="mr-2 h-4 w-4" /> Testar</Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">
            <Upload className="h-4 w-4" /> Enviar áudio do dispositivo
            <input type="file" accept="audio/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
          </label>
          {customSound && (
            <Button size="sm" variant="ghost" onClick={() => { clearCustomSound(); setCustomSoundState(null); if (defaultSound === "custom") { setDefault("classico"); setDefaultSound("classico"); } }}>
              <Trash2 className="mr-2 h-4 w-4" /> Remover áudio
            </Button>
          )}
        </div>
      </Card>

      <div>
        <h2 className="mb-3 font-display text-lg font-bold">Atalhos rápidos</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shortcuts.map((p) => (
            <Card key={p.id} className="flex items-center justify-between gap-2 p-4">
              <div className="min-w-0">
                <div className="truncate font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{formatSeconds(p.seconds)}</div>
              </div>
              <Button size="sm" onClick={() => start(p)}><Timer className="mr-2 h-4 w-4" /> Iniciar</Button>
            </Card>
          ))}
        </div>
      </div>

      <Card className="p-5">
        <h2 className="font-display text-lg font-bold">Adicionar atalho rápido</h2>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-40 flex-1">
            <Label className="text-xs">Nome</Label>
            <Input value={form.name} maxLength={80} placeholder="Ex: Pão de queijo" onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="w-28">
            <Label className="text-xs">Minutos</Label>
            <Input type="number" min="1" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} />
          </div>
          <Button onClick={addPreset}><Plus className="mr-2 h-4 w-4" /> Adicionar</Button>
        </div>

        {custom.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Você ainda não criou atalhos personalizados.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {custom.map((p, i) => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatSeconds(p.seconds)} • {SOUND_LIBRARY.find((s) => s.value === p.sound)?.label ?? (p.sound === "custom" ? "meu áudio" : "som padrão")}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" disabled={i === custom.length - 1} onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar atalho</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={editForm.name} maxLength={80} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Minutos</Label>
              <Input type="number" min="1" value={editForm.minutes} onChange={(e) => setEditForm({ ...editForm, minutes: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Som</Label>
              <Select value={editForm.sound} onValueChange={(v) => setEditForm({ ...editForm, sound: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOUND_LIBRARY.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  {customSound && <SelectItem value="custom">Meu áudio — {customSound.name}</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
