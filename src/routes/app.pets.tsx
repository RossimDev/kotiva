import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { PawPrint, Plus, Trash2, Loader2, Sparkles, Bell, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { petFeedingPlan, type PetPlan } from "@/lib/pets.functions";

export const Route = createFileRoute("/app/pets")({
  head: () => ({ meta: [{ title: "Pet IA — Kotiva" }, { name: "robots", content: "noindex" }] }),
  component: Pets,
});

type Pet = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  weight_kg: number | null;
  size: string | null;
  age_months: number | null;
  sex: string | null;
  notes: string | null;
};

type Reminder = {
  id: string;
  pet_id: string;
  type: string;
  title: string;
  time_of_day: string | null;
  due_date: string | null;
  repeat_rule: string;
  active: boolean;
  last_done_at: string | null;
};

const SPECIES = ["cachorro", "gato", "pássaro", "papagaio", "periquito", "coelho", "hamster", "peixe", "tartaruga", "outro"];
const SIZES = ["mini", "pequeno", "médio", "grande", "gigante"];
const SEXES = ["macho", "fêmea"];
const TYPES = [
  { value: "alimentacao", label: "Alimentação" },
  { value: "agua", label: "Água" },
  { value: "vacina", label: "Vacinação" },
  { value: "vermifugo", label: "Vermífugo" },
  { value: "consulta", label: "Consulta" },
  { value: "banho", label: "Banho" },
  { value: "personalizado", label: "Personalizado" },
];
const REPEATS = [
  { value: "diario", label: "Diário" },
  { value: "semanal", label: "Semanal" },
  { value: "mensal", label: "Mensal" },
  { value: "anual", label: "Anual" },
  { value: "unico", label: "Uma vez" },
];

const emptyPet = { name: "", species: "cachorro", breed: "", weight_kg: "", size: "médio", age_months: "", sex: "macho", notes: "" };

function Pets() {
  const { user } = useAuth();
  const plan = useServerFn(petFeedingPlan);
  const [pets, setPets] = useState<Pet[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [form, setForm] = useState({ ...emptyPet });
  const [selected, setSelected] = useState<string | null>(null);
  const [plans, setPlans] = useState<Record<string, PetPlan>>({});
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [rForm, setRForm] = useState({ type: "alimentacao", title: "", time_of_day: "08:00", due_date: "", repeat_rule: "diario" });

  const load = async () => {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("pets").select("id,name,species,breed,weight_kg,size,age_months,sex,notes").order("created_at"),
      supabase.from("pet_reminders").select("id,pet_id,type,title,time_of_day,due_date,repeat_rule,active,last_done_at").order("created_at"),
    ]);
    setPets((p ?? []) as Pet[]);
    setReminders((r ?? []) as Reminder[]);
    setSelected((s) => s ?? (p?.[0]?.id ?? null));
  };

  useEffect(() => { if (user) load(); }, [user]);

  const current = useMemo(() => pets.find((p) => p.id === selected) ?? null, [pets, selected]);
  const petReminders = reminders.filter((r) => r.pet_id === selected);

  const addPet = async () => {
    if (!user) return;
    const name = form.name.trim();
    if (!name) return toast.error("Informe o nome do pet.");
    const weight = Number(String(form.weight_kg).replace(",", "."));
    if (!weight || weight <= 0 || weight > 120) return toast.error("Informe um peso válido em kg.");
    const { data, error } = await supabase.from("pets").insert({
      user_id: user.id,
      name: name.slice(0, 60),
      species: form.species,
      breed: form.breed.trim().slice(0, 60) || null,
      weight_kg: weight,
      size: form.size,
      age_months: form.age_months ? Math.max(0, Math.min(360, Number(form.age_months))) : null,
      sex: form.sex,
      notes: form.notes.trim().slice(0, 300) || null,
    }).select("id").maybeSingle();
    if (error) return toast.error(error.message);
    toast.success("Pet cadastrado!");
    setForm({ ...emptyPet });
    setSelected(data?.id ?? null);
    load();
  };

  const removePet = async (id: string) => {
    await supabase.from("pets").delete().eq("id", id);
    if (selected === id) setSelected(null);
    load();
  };

  const generatePlan = async (pet: Pet) => {
    setLoadingPlan(pet.id);
    try {
      const res = await plan({
        data: {
          name: pet.name,
          species: pet.species,
          breed: pet.breed ?? undefined,
          weightKg: Number(pet.weight_kg ?? 1),
          size: pet.size ?? undefined,
          ageMonths: pet.age_months ?? undefined,
          sex: pet.sex ?? undefined,
          notes: pet.notes ?? undefined,
        },
      });
      setPlans((p) => ({ ...p, [pet.id]: res }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao calcular");
    } finally {
      setLoadingPlan(null);
    }
  };

  const addReminder = async () => {
    if (!user || !current) return toast.error("Cadastre e selecione um pet primeiro.");
    const title = rForm.title.trim() || TYPES.find((t) => t.value === rForm.type)?.label || "Lembrete";
    const { error } = await supabase.from("pet_reminders").insert({
      user_id: user.id,
      pet_id: current.id,
      type: rForm.type,
      title: title.slice(0, 120),
      time_of_day: rForm.time_of_day || null,
      due_date: rForm.due_date || null,
      repeat_rule: rForm.repeat_rule,
    });
    if (error) return toast.error(error.message);
    setRForm({ ...rForm, title: "" });
    load();
  };

  const toggleReminder = async (r: Reminder) => {
    await supabase.from("pet_reminders").update({ active: !r.active }).eq("id", r.id);
    load();
  };

  const doneReminder = async (r: Reminder) => {
    await supabase.from("pet_reminders").update({ last_done_at: new Date().toISOString() }).eq("id", r.id);
    toast.success("Registrado!");
    load();
  };

  const removeReminder = async (id: string) => {
    await supabase.from("pet_reminders").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Pet IA</h1>
        <p className="text-muted-foreground">Cadastro dos seus animais, estimativa de alimentação e lembretes de cuidados.</p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <p>
          <strong>Aviso permanente:</strong> todas as quantidades e orientações são apenas estimativas geradas por IA.
          Elas nunca substituem o acompanhamento de um médico-veterinário — a orientação profissional sempre prevalece.
        </p>
      </div>

      <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label className="text-xs">Nome</Label>
          <Input value={form.name} maxLength={60} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Categoria</Label>
          <Select value={form.species} onValueChange={(v) => setForm({ ...form, species: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{SPECIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Raça</Label>
          <Input value={form.breed} maxLength={60} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Peso (kg)</Label>
          <Input inputMode="decimal" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Porte</Label>
          <Select value={form.size} onValueChange={(v) => setForm({ ...form, size: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Idade (meses)</Label>
          <Input type="number" min="0" max="360" value={form.age_months} onChange={(e) => setForm({ ...form, age_months: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Sexo</Label>
          <Select value={form.sex} onValueChange={(v) => setForm({ ...form, sex: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{SEXES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button className="w-full" onClick={addPet}><Plus className="mr-2 h-4 w-4" /> Cadastrar pet</Button>
        </div>
      </Card>

      {pets.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">Nenhum pet cadastrado ainda.</Card>
      ) : (
        <div className="flex flex-wrap gap-2">
          {pets.map((p) => (
            <Button key={p.id} variant={p.id === selected ? "default" : "outline"} size="sm" onClick={() => setSelected(p.id)}>
              <PawPrint className="mr-2 h-4 w-4" /> {p.name}
            </Button>
          ))}
        </div>
      )}

      {current && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold">{current.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {current.species}{current.breed ? ` • ${current.breed}` : ""} • {current.weight_kg} kg • porte {current.size}
                  {current.age_months != null ? ` • ${current.age_months} meses` : ""} • {current.sex}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => removePet(current.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>

            <Button className="mt-4" onClick={() => generatePlan(current)} disabled={loadingPlan === current.id}>
              {loadingPlan === current.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Calcular alimentação sugerida
            </Button>

            {plans[current.id] && (
              <div className="mt-5 space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat label="por dia" value={`${Math.round(plans[current.id].dailyGrams)} g`} />
                  <Stat label="refeições/dia" value={String(plans[current.id].mealsPerDay)} />
                  <Stat label="por refeição" value={`${Math.round(plans[current.id].gramsPerMeal)} g`} />
                  <Stat label="água/dia" value={`${Math.round(plans[current.id].waterMl)} ml`} />
                  <Stat label="energia" value={`${Math.round(plans[current.id].calories)} kcal`} />
                  <Stat label="tipo" value={plans[current.id].foodType || "ração seca"} />
                </div>
                <List title="Horários sugeridos" items={plans[current.id].schedule} />
                <List title="Cuidados" items={plans[current.id].care} />
                <List title="Avisos" items={plans[current.id].warnings} />
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Bell className="h-4 w-4" /> Lembretes</h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={rForm.type} onValueChange={(v) => setRForm({ ...rForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Repetição</Label>
                <Select value={rForm.repeat_rule} onValueChange={(v) => setRForm({ ...rForm, repeat_rule: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{REPEATS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Título (opcional)</Label>
                <Input value={rForm.title} maxLength={120} placeholder="Ex: Vacina V10 - reforço" onChange={(e) => setRForm({ ...rForm, title: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Horário</Label>
                <Input type="time" value={rForm.time_of_day} onChange={(e) => setRForm({ ...rForm, time_of_day: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Data (opcional)</Label>
                <Input type="date" value={rForm.due_date} onChange={(e) => setRForm({ ...rForm, due_date: e.target.value })} />
              </div>
            </div>
            <Button className="mt-3" onClick={addReminder}><Plus className="mr-2 h-4 w-4" /> Adicionar lembrete</Button>

            {petReminders.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Nenhum lembrete para {current.name}.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {petReminders.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {r.title} {!r.active && <Badge variant="outline" className="ml-1">pausado</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {TYPES.find((t) => t.value === r.type)?.label} • {REPEATS.find((x) => x.value === r.repeat_rule)?.label}
                        {r.time_of_day ? ` • ${r.time_of_day.slice(0, 5)}` : ""}{r.due_date ? ` • ${new Date(`${r.due_date}T00:00:00`).toLocaleDateString("pt-BR")}` : ""}
                        {r.last_done_at ? ` • último: ${new Date(r.last_done_at).toLocaleDateString("pt-BR")}` : ""}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button size="sm" variant="outline" onClick={() => doneReminder(r)} title="Marcar como feito"><Check className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleReminder(r)} title="Ativar/pausar"><Bell className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => removeReminder(r.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3 text-center">
      <div className="font-display text-lg font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="mb-1 font-display text-sm font-bold">{title}</div>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </div>
  );
}
