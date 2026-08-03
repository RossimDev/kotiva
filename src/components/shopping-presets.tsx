import { useCallback, useEffect, useState } from "react";
import { BookmarkPlus, Layers, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { UNITS } from "@/lib/units";
import { SHOPPING_CATEGORIES } from "@/lib/kotiva";
import { DEFAULT_PRESETS, type PresetItem } from "@/lib/shopping-presets";

export type Preset = { id: string; name: string; icon: string | null; items: PresetItem[] };

export function usePresets() {
  const { user } = useAuth();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("shopping_presets").select("id,name,icon,items").order("created_at");
    setPresets(((data ?? []) as Array<{ id: string; name: string; icon: string | null; items: unknown }>).map((p) => ({
      id: p.id,
      name: p.name,
      icon: p.icon,
      items: (Array.isArray(p.items) ? p.items : []) as PresetItem[],
    })));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { count } = await supabase.from("shopping_presets").select("id", { count: "exact", head: true });
      if ((count ?? 0) === 0) {
        await supabase.from("shopping_presets").insert(
          DEFAULT_PRESETS.map((p) => ({ user_id: user.id, name: p.name, icon: p.icon, items: p.items })),
        );
      }
      await load();
    })();
  }, [user, load]);

  return { presets, loading, reload: load };
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  presets: Preset[];
  reload: () => void;
  onApply: (items: PresetItem[], presetName: string) => void;
  currentListItems?: PresetItem[];
};

const emptyItem: PresetItem = { name: "", quantity: 1, unit: "un", category: "Outros" };

export function ShoppingPresets({ open, onOpenChange, presets, reload, onApply, currentListItems = [] }: Props) {
  const { user } = useAuth();
  const [editing, setEditing] = useState<Preset | null>(null);
  const [saving, setSaving] = useState(false);

  const createEmpty = () => setEditing({ id: "", name: "", icon: "⭐", items: [{ ...emptyItem }] });

  const createFromList = async () => {
    if (!user || currentListItems.length === 0) return toast.error("A lista atual está vazia");
    setEditing({ id: "", name: "Minha compra mensal", icon: "📅", items: currentListItems });
  };

  const savePreset = async () => {
    if (!user || !editing) return;
    if (!editing.name.trim()) return toast.error("Dê um nome ao preset");
    const items = editing.items.filter((i) => i.name.trim());
    setSaving(true);
    const payload = { name: editing.name.trim().slice(0, 80), icon: editing.icon, items };
    const { error } = editing.id
      ? await supabase.from("shopping_presets").update(payload).eq("id", editing.id)
      : await supabase.from("shopping_presets").insert({ ...payload, user_id: user.id });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Preset salvo");
    setEditing(null);
    reload();
  };

  const removePreset = async (id: string) => {
    await supabase.from("shopping_presets").delete().eq("id", id);
    toast.success("Preset removido");
    reload();
  };

  const restoreDefaults = async () => {
    if (!user) return;
    const existing = new Set(presets.map((p) => p.name));
    const missing = DEFAULT_PRESETS.filter((p) => !existing.has(p.name));
    if (missing.length === 0) return toast.info("Os presets padrão já estão na sua lista");
    await supabase.from("shopping_presets").insert(missing.map((p) => ({ user_id: user.id, name: p.name, icon: p.icon, items: p.items })));
    toast.success("Presets padrão restaurados");
    reload();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Layers className="h-5 w-5" /> Presets de compras</DialogTitle>
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={createEmpty}><Plus className="mr-2 h-4 w-4" /> Novo preset</Button>
            <Button size="sm" variant="outline" onClick={createFromList}>
              <BookmarkPlus className="mr-2 h-4 w-4" /> Salvar lista atual
            </Button>
            <Button size="sm" variant="ghost" onClick={restoreDefaults}>
              <Sparkles className="mr-2 h-4 w-4" /> Restaurar padrões
            </Button>
          </div>

          <div className="mt-2 grid gap-3">
            {presets.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-display font-bold">{p.icon} {p.name}</div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {p.items.map((i) => i.name).join(", ") || "Sem itens"}
                    </p>
                  </div>
                  <Badge variant="secondary">{p.items.length} itens</Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => { onApply(p.items, p.name); onOpenChange(false); }}>
                    Usar preset
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => removePreset(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </Card>
            ))}
            {presets.length === 0 && <p className="text-sm text-muted-foreground">Nenhum preset ainda.</p>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar preset" : "Novo preset"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-6 gap-2">
                <div className="col-span-1">
                  <Label className="text-xs">Ícone</Label>
                  <Input value={editing.icon ?? ""} maxLength={2} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} />
                </div>
                <div className="col-span-5">
                  <Label className="text-xs">Nome</Label>
                  <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Ex: Minha compra mensal" />
                </div>
              </div>

              <div className="space-y-2">
                {editing.items.map((i, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2">
                    <Input
                      className="col-span-4"
                      placeholder="Produto"
                      value={i.name}
                      onChange={(e) => setEditing({ ...editing, items: editing.items.map((x, n) => (n === idx ? { ...x, name: e.target.value } : x)) })}
                    />
                    <Input
                      className="col-span-2"
                      type="number"
                      min="0"
                      step="0.01"
                      value={i.quantity}
                      onChange={(e) => setEditing({ ...editing, items: editing.items.map((x, n) => (n === idx ? { ...x, quantity: Number(e.target.value) || 1 } : x)) })}
                    />
                    <Select value={i.unit} onValueChange={(v) => setEditing({ ...editing, items: editing.items.map((x, n) => (n === idx ? { ...x, unit: v } : x)) })}>
                      <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                      <SelectContent>{UNITS.map((u) => <SelectItem key={u.value} value={u.value}>{u.value}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={i.category} onValueChange={(v) => setEditing({ ...editing, items: editing.items.map((x, n) => (n === idx ? { ...x, category: v } : x)) })}>
                      <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                      <SelectContent>{SHOPPING_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="col-span-1"
                      aria-label="Remover item"
                      onClick={() => setEditing({ ...editing, items: editing.items.filter((_, n) => n !== idx) })}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setEditing({ ...editing, items: [...editing.items, { ...emptyItem }] })}>
                  <Plus className="mr-2 h-4 w-4" /> Adicionar item
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={savePreset} disabled={saving}>{saving ? "Salvando..." : "Salvar preset"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
