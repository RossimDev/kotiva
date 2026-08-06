import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  ShoppingCart,
  ScanLine,
  ListPlus,
  Refrigerator,
  Calculator,
  Pencil,
  Layers,
  Lightbulb,
  ClipboardPaste,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { ProductInfoCard } from "@/components/product-info-card";
import { UNITS } from "@/lib/units";
import { SHOPPING_CATEGORIES, money } from "@/lib/kotiva";
import type { BarcodeProduct } from "@/lib/barcode";
import { lookupProduct, saveProductToBase, sectionFor } from "@/lib/barcode";
import { ShoppingPresets, usePresets } from "@/components/shopping-presets";
import {
  buildSuggestions,
  type HistoryRow,
  type PresetItem,
  type Suggestion,
} from "@/lib/shopping-presets";
import { normalizeName, type ParsedItem } from "@/lib/parse-items";
import { PasteItemsDialog } from "@/components/paste-items-dialog";

type List = { id: string; name: string; color: string | null; budget: number | null };
type Item = {
  id: string;
  list_id: string | null;
  name: string;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  category: string | null;
  barcode: string | null;
  checked: boolean;
};

export const Route = createFileRoute("/app/shopping")({
  head: () => ({
    meta: [{ title: "Lista de compras — Kotiva" }, { name: "robots", content: "noindex" }],
  }),
  component: Shopping,
});

const emptyForm = {
  name: "",
  quantity: "1",
  unit: "un",
  unit_price: "0",
  category: "Outros",
  barcode: "",
};

function Shopping() {
  const { user } = useAuth();
  const [lists, setLists] = useState<List[]>([]);
  const [activeList, setActiveList] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editing, setEditing] = useState<Item | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState<BarcodeProduct | null>(null);
  const [newListOpen, setNewListOpen] = useState(false);
  const [newList, setNewList] = useState({ name: "", budget: "" });
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [sugOpen, setSugOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteSaving, setPasteSaving] = useState(false);
  const { presets, reload: reloadPresets } = usePresets();

  const loadLists = useCallback(async () => {
    const { data } = await supabase
      .from("shopping_lists")
      .select("id,name,color,budget")
      .order("created_at");
    const rows = (data as List[]) ?? [];
    setLists(rows);
    setActiveList((cur) => cur ?? rows[0]?.id ?? null);
    return rows;
  }, []);

  const loadItems = useCallback(async () => {
    const { data } = await supabase
      .from("shopping_items")
      .select("id,list_id,name,quantity,unit,unit_price,category,barcode,checked")
      .order("checked")
      .order("created_at");
    setItems((data as Item[]) ?? []);
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const rows = await loadLists();
      if (rows.length === 0) {
        const { data } = await supabase
          .from("shopping_lists")
          .insert({ user_id: user.id, name: "Compras do mês" })
          .select("id,name,color,budget")
          .single();
        if (data) {
          setLists([data as List]);
          setActiveList((data as List).id);
        }
      }
      await loadItems();
    })();
  }, [user, loadLists, loadItems]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("shop-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shopping_items", filter: `user_id=eq.${user.id}` },
        () => loadItems(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shopping_lists", filter: `user_id=eq.${user.id}` },
        () => loadLists(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadItems, loadLists]);

  const listItems = useMemo(
    () => items.filter((i) => (activeList ? i.list_id === activeList : !i.list_id)),
    [items, activeList],
  );

  const totals = useMemo(() => {
    const line = (i: Item) => Number(i.quantity ?? 1) * Number(i.unit_price ?? 0);
    const total = listItems.reduce((s, i) => s + line(i), 0);
    const bought = listItems.filter((i) => i.checked).reduce((s, i) => s + line(i), 0);
    return { total, bought, pending: total - bought };
  }, [listItems]);

  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const i of listItems) {
      const key = i.category || "Outros";
      map.set(key, [...(map.get(key) ?? []), i]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [listItems]);

  const budget = lists.find((l) => l.id === activeList)?.budget ?? null;

  const add = async () => {
    if (!form.name.trim() || !user) return;
    const { error } = await supabase.from("shopping_items").insert({
      user_id: user.id,
      list_id: activeList,
      name: form.name.trim(),
      quantity: Number(form.quantity) || 1,
      unit: form.unit,
      unit_price: Number(form.unit_price.replace(",", ".")) || 0,
      category: form.category,
      barcode: form.barcode || null,
    });
    if (error) return toast.error(error.message);
    if (form.barcode.trim()) {
      await saveProductToBase({
        code: form.barcode.trim(),
        name: form.name.trim(),
        category: form.category,
        section: sectionFor(form.category),
        unit: form.unit,
        userId: user.id,
      });
    }
    setForm({ ...emptyForm });
    loadItems();
  };

  const saveEdit = async () => {
    if (!editing) return;
    const { error } = await supabase
      .from("shopping_items")
      .update({
        name: editing.name,
        quantity: Number(editing.quantity ?? 1),
        unit: editing.unit,
        unit_price: Number(editing.unit_price ?? 0),
        category: editing.category,
      })
      .eq("id", editing.id);
    if (error) return toast.error(error.message);
    setEditing(null);
    loadItems();
    toast.success("Item atualizado");
  };

  const toggle = async (i: Item) => {
    const nowChecked = !i.checked;
    await supabase.from("shopping_items").update({ checked: nowChecked }).eq("id", i.id);
    if (nowChecked && user) {
      await supabase.from("purchase_history").insert({
        user_id: user.id,
        name: i.name,
        normalized_name: normalizeName(i.name),
        category: i.category,
        quantity: Number(i.quantity ?? 1),
        unit: i.unit ?? "un",
        unit_price: Number(i.unit_price ?? 0),
      });
    }
    loadItems();
  };
  const remove = async (id: string) => {
    await supabase.from("shopping_items").delete().eq("id", id);
    loadItems();
  };

  const onDetected = async (code: string) => {
    setScanning(false);
    toast.info("Código lido, buscando produto...");
    const product = await lookupProduct(code, undefined, user?.id);
    setScanned(product);
    if (product.name) {
      setForm((f) => ({
        ...f,
        barcode: code,
        name: product.name,
        unit_price: product.lastPrice != null ? String(product.lastPrice) : f.unit_price,
        unit: product.unit || f.unit,
        category: (SHOPPING_CATEGORIES as readonly string[]).includes(product.category)
          ? product.category
          : f.category,
      }));
      toast.success(`Produto: ${product.name}`);
    } else {
      setForm((f) => ({ ...f, barcode: code }));
      toast.warning(
        "Produto não encontrado. Cadastre o nome — ele será salvo na base para as próximas leituras.",
      );
    }
  };

  const applyPreset = async (presetItems: PresetItem[], presetName: string) => {
    if (!user || presetItems.length === 0) return;
    const { error } = await supabase.from("shopping_items").insert(
      presetItems.map((i) => ({
        user_id: user.id,
        list_id: activeList,
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        category: i.category,
        unit_price: 0,
      })),
    );
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Preset "${presetName}" aplicado`);
    loadItems();
  };

  const openSuggestions = async () => {
    setSugOpen(true);
    setSuggestions(null);
    const since = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
    const { data } = await supabase
      .from("purchase_history")
      .select("normalized_name,name,category,quantity,unit,purchased_at")
      .gte("purchased_at", since)
      .order("purchased_at");
    const rows = (data as HistoryRow[]) ?? [];
    const list = buildSuggestions(
      rows,
      listItems.map((i) => i.name),
    );
    setSuggestions(list);
    setPicked(Object.fromEntries(list.slice(0, 8).map((s2) => [s2.name, true])));
  };

  const addSuggestions = async () => {
    if (!user || !suggestions) return;
    const chosen = suggestions.filter((s2) => picked[s2.name]);
    if (chosen.length === 0) return toast.error("Selecione ao menos um item");
    const { error } = await supabase.from("shopping_items").insert(
      chosen.map((c) => ({
        user_id: user.id,
        list_id: activeList,
        name: c.name,
        quantity: c.quantity,
        unit: c.unit,
        category: c.category,
        unit_price: 0,
      })),
    );
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${chosen.length} sugestão(ões) adicionadas`);
    setSugOpen(false);
    loadItems();
  };

  const sendCheckedToFridge = async () => {
    if (!user) return;
    const checked = listItems.filter((i) => i.checked);
    if (checked.length === 0) return toast.error("Marque itens comprados primeiro");
    const { error } = await supabase.from("fridge_items").insert(
      checked.map((i) => ({
        user_id: user.id,
        name: i.name,
        quantity: i.quantity ?? 1,
        unit: i.unit ?? "un",
        category: i.category,
        barcode: i.barcode,
      })),
    );
    if (error) return toast.error(error.message);
    await supabase
      .from("shopping_items")
      .delete()
      .in(
        "id",
        checked.map((i) => i.id),
      );
    loadItems();
    toast.success(`${checked.length} item(ns) enviados para a geladeira`);
  };

  const createList = async () => {
    if (!user || !newList.name.trim()) return;
    const { data, error } = await supabase
      .from("shopping_lists")
      .insert({
        user_id: user.id,
        name: newList.name.trim(),
        budget: newList.budget ? Number(newList.budget.replace(",", ".")) : null,
      })
      .select("id,name,color,budget")
      .single();
    if (error) return toast.error(error.message);
    setNewList({ name: "", budget: "" });
    setNewListOpen(false);
    setActiveList((data as List).id);
    loadLists();
  };

  const deleteList = async () => {
    if (!activeList) return;
    await supabase.from("shopping_lists").delete().eq("id", activeList);
    setActiveList(null);
    const rows = await loadLists();
    setActiveList(rows[0]?.id ?? null);
    loadItems();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Lista de compras</h1>
          <p className="text-muted-foreground">
            {listItems.filter((i) => !i.checked).length} pendentes nesta lista
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPresetsOpen(true)}>
            <Layers className="mr-2 h-4 w-4" /> Presets
          </Button>
          <Button variant="outline" onClick={openSuggestions}>
            <Lightbulb className="mr-2 h-4 w-4" /> Sugestão de compra
          </Button>
          <Button variant="outline" onClick={() => setNewListOpen(true)}>
            <ListPlus className="mr-2 h-4 w-4" /> Nova lista
          </Button>
          <Button variant="outline" onClick={sendCheckedToFridge}>
            <Refrigerator className="mr-2 h-4 w-4" /> Enviar à geladeira
          </Button>
        </div>
      </div>

      {lists.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {lists.map((l) => (
            <button
              key={l.id}
              onClick={() => setActiveList(l.id)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                activeList === l.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {l.name}
            </button>
          ))}
          {lists.length > 1 && (
            <Button variant="ghost" size="sm" onClick={deleteList} className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Total estimado</div>
          <div className="font-display text-2xl font-extrabold">{money(totals.total)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Já no carrinho</div>
          <div className="font-display text-2xl font-extrabold text-accent">
            {money(totals.bought)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">
            {budget ? "Orçamento restante" : "Falta comprar"}
          </div>
          <div
            className={`font-display text-2xl font-extrabold ${budget && totals.total > budget ? "text-destructive" : ""}`}
          >
            {money(budget ? budget - totals.bought : totals.pending)}
          </div>
        </Card>
      </div>

      {scanned && (
        <ProductInfoCard product={scanned} onDismiss={() => setScanned(null)} />
      )}

      <Card className="p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
          className="grid gap-3 sm:grid-cols-12"
        >
          <div className="sm:col-span-4">
            <Label className="text-xs">Produto</Label>
            <Input
              placeholder="Ex: leite integral"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Qtd.</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Unidade</Label>
            <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Preço un.</Label>
            <Input
              inputMode="decimal"
              value={form.unit_price}
              onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Categoria</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHOPPING_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 sm:col-span-12">
            <Button type="submit" className="shadow-glow">
              <Plus className="mr-2 h-4 w-4" /> Adicionar
            </Button>
            <Button type="button" variant="outline" onClick={() => setScanning(true)}>
              <ScanLine className="mr-2 h-4 w-4" /> Escanear código / QR
            </Button>
          </div>
        </form>
      </Card>

      {listItems.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-16 text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">Sua lista está vazia.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(([cat, rows]) => (
            <Card key={cat} className="overflow-hidden">
              <div className="flex items-center justify-between bg-muted/40 px-4 py-2">
                <span className="text-sm font-semibold">{cat}</span>
                <Badge variant="secondary">
                  {money(
                    rows.reduce(
                      (s, i) => s + Number(i.quantity ?? 1) * Number(i.unit_price ?? 0),
                      0,
                    ),
                  )}
                </Badge>
              </div>
              <div className="divide-y divide-border">
                {rows.map((i) => (
                  <div
                    key={i.id}
                    className={`flex items-center gap-3 p-4 ${i.checked ? "opacity-60" : ""}`}
                  >
                    <Checkbox checked={i.checked} onCheckedChange={() => toggle(i)} />
                    <div className="flex-1">
                      <div className={`font-medium ${i.checked ? "line-through" : ""}`}>
                        {i.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {Number(i.quantity ?? 1)} {i.unit ?? "un"} × {money(i.unit_price)}
                      </div>
                    </div>
                    <div className="font-display font-bold">
                      {money(Number(i.quantity ?? 1) * Number(i.unit_price ?? 0))}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setEditing(i)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(i.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          ))}
          <Card className="flex items-center justify-between p-4">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Calculator className="h-4 w-4" /> Total da lista
            </span>
            <span className="font-display text-2xl font-extrabold text-primary">
              {money(totals.total)}
            </span>
          </Card>
        </div>
      )}

      <ShoppingPresets
        open={presetsOpen}
        onOpenChange={setPresetsOpen}
        presets={presets}
        reload={reloadPresets}
        onApply={applyPreset}
        currentListItems={listItems.map((i) => ({
          name: i.name,
          quantity: Number(i.quantity ?? 1),
          unit: i.unit ?? "un",
          category: i.category ?? "Outros",
        }))}
      />

      <Dialog open={sugOpen} onOpenChange={setSugOpen}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" /> Sugestão de compra
            </DialogTitle>
          </DialogHeader>
          {suggestions === null ? (
            <p className="text-sm text-muted-foreground">Analisando seu histórico de compras...</p>
          ) : suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ainda não temos histórico suficiente. Marque os itens como comprados nas suas listas e
              em algumas semanas as sugestões aparecem aqui.
            </p>
          ) : (
            <div className="space-y-2">
              {suggestions.map((s2) => (
                <label
                  key={s2.name}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3"
                >
                  <Checkbox
                    checked={!!picked[s2.name]}
                    onCheckedChange={(v) => setPicked((cur) => ({ ...cur, [s2.name]: !!v }))}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{s2.name}</div>
                    <div className="text-xs text-muted-foreground">{s2.reason}</div>
                  </div>
                  <Badge variant="secondary">
                    {s2.quantity} {s2.unit}
                  </Badge>
                </label>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSugOpen(false)}>
              Fechar
            </Button>
            <Button onClick={addSuggestions} disabled={!suggestions || suggestions.length === 0}>
              Adicionar à lista
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BarcodeScanner open={scanning} onOpenChange={setScanning} onDetected={onDetected} />

      <Dialog open={newListOpen} onOpenChange={setNewListOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova lista</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input
                value={newList.name}
                onChange={(e) => setNewList({ ...newList, name: e.target.value })}
                placeholder="Ex: Churrasco de sábado"
              />
            </div>
            <div>
              <Label>Orçamento (opcional)</Label>
              <Input
                inputMode="decimal"
                value={newList.budget}
                onChange={(e) => setNewList({ ...newList, budget: e.target.value })}
                placeholder="Ex: 350"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createList}>Criar lista</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar item</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Nome</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editing.quantity ?? 1}
                  onChange={(e) => setEditing({ ...editing, quantity: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Unidade</Label>
                <Select
                  value={editing.unit ?? "un"}
                  onValueChange={(v) => setEditing({ ...editing, unit: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Preço unitário</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editing.unit_price ?? 0}
                  onChange={(e) => setEditing({ ...editing, unit_price: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select
                  value={editing.category ?? "Outros"}
                  onValueChange={(v) => setEditing({ ...editing, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHOPPING_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={saveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
