import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Package, ScanLine, Pencil, Tags, AlertTriangle, ClipboardPaste } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { CategoryManager, useCategories } from "@/components/category-manager";
import { UNITS, daysUntil, expiryStatus } from "@/lib/units";
import { PasteItemsDialog } from "@/components/paste-items-dialog";
import { lookupProduct, saveProductToBase, sectionFor, SECTION_LABEL, type ProductSection } from "@/lib/barcode";
import { SHOPPING_CATEGORIES } from "@/lib/kotiva";

type Item = {
  id: string;
  name: string;
  category: string | null;
  category_id: string | null;
  quantity: number | null;
  unit: string | null;
  barcode: string | null;
  expires_at: string | null;
  manufactured_at: string | null;
  notes: string | null;
};

const NO_CATEGORY = "__none__";

const emptyForm = {
  name: "",
  category_id: NO_CATEGORY,
  quantity: "1",
  unit: "un",
  barcode: "",
  manufactured_at: "",
  expires_at: "",
  notes: "",
};

export const Route = createFileRoute("/app/items")({
  head: () => ({ meta: [{ title: "Geladeira — Kotiva" }, { name: "robots", content: "noindex" }] }),
  component: Items,
});

function Items() {
  const { user } = useAuth();
  const { categories } = useCategories();
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [q, setQ] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteSaving, setPasteSaving] = useState(false);
  const [scanSection, setScanSection] = useState<ProductSection | null>(null);
  const [filterCat, setFilterCat] = useState<string>("all");

  const load = () =>
    supabase
      .from("fridge_items")
      .select("*")
      .order("expires_at", { ascending: true, nullsFirst: false })
      .then(({ data }) => setItems((data as Item[]) ?? []));

  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("items")
      .on("postgres_changes", { event: "*", schema: "public", table: "fridge_items", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setOpen(true);
  };

  const openEdit = (i: Item) => {
    setEditingId(i.id);
    setForm({
      name: i.name,
      category_id: i.category_id ?? NO_CATEGORY,
      quantity: String(i.quantity ?? 1),
      unit: i.unit ?? "un",
      barcode: i.barcode ?? "",
      manufactured_at: i.manufactured_at ?? "",
      expires_at: i.expires_at ?? "",
      notes: i.notes ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !user) return toast.error("Nome é obrigatório");
    if (form.manufactured_at && form.expires_at && form.manufactured_at > form.expires_at)
      return toast.error("A fabricação não pode ser depois da validade");

    const categoryId = form.category_id === NO_CATEGORY ? null : form.category_id;
    const payload = {
      name: form.name.trim().slice(0, 120),
      category_id: categoryId,
      category: categories.find((c) => c.id === categoryId)?.name ?? null,
      quantity: Number(form.quantity) || 1,
      unit: form.unit || "un",
      barcode: form.barcode.trim() || null,
      manufactured_at: form.manufactured_at || null,
      expires_at: form.expires_at || null,
      notes: form.notes.trim().slice(0, 500) || null,
    };

    setSaving(true);
    const { error } = editingId
      ? await supabase.from("fridge_items").update(payload).eq("id", editingId)
      : await supabase.from("fridge_items").insert({ ...payload, user_id: user.id });
    setSaving(false);

    if (error) return toast.error(error.message);

    // Alimenta a base compartilhada de códigos de barras
    if (payload.barcode) {
      const categoryName = payload.category ?? "Outros";
      const known = (SHOPPING_CATEGORIES as readonly string[]).includes(categoryName) ? categoryName : "Outros";
      await saveProductToBase({
        code: payload.barcode,
        name: payload.name,
        category: known,
        section: scanSection ?? sectionFor(known),
        unit: payload.unit,
        userId: user.id,
      });
    }

    setScanSection(null);
    toast.success(editingId ? "Item atualizado" : "Item adicionado");
    setOpen(false);
    setEditingId(null);
    setForm({ ...emptyForm });
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("fridge_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removido");
    load();
  };

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          i.name.toLowerCase().includes(q.toLowerCase()) &&
          (filterCat === "all" || (filterCat === NO_CATEGORY ? !i.category_id : i.category_id === filterCat)),
      ),
    [items, q, filterCat],
  );

  const expiredCount = items.filter((i) => expiryStatus(i.expires_at) === "expired").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Minha geladeira</h1>
          <p className="text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "itens"} cadastrados
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPasteOpen(true)}>
            <ClipboardPaste className="mr-2 h-4 w-4" /> Colar lista
          </Button>
          <Button variant="outline" onClick={() => setCatsOpen(true)}>
            <Tags className="mr-2 h-4 w-4" /> Categorias
          </Button>
          <Button className="shadow-glow" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Novo item
          </Button>
        </div>
      </div>

      {expiredCount > 0 && (
        <Card className="flex items-center gap-3 border-destructive/40 bg-destructive/10 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
          <p className="text-sm">
            <strong>{expiredCount}</strong> produto(s) vencido(s). Atualize a validade ou remova da geladeira.
          </p>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        <Input placeholder="Buscar item..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Todas as categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            <SelectItem value={NO_CATEGORY}>Sem categoria</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-16 text-center">
          <Package className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            {items.length === 0 ? "Sua geladeira está vazia. Adicione o primeiro item!" : "Nenhum item encontrado."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((i) => {
            const days = daysUntil(i.expires_at);
            const status = expiryStatus(i.expires_at);
            return (
              <Card
                key={i.id}
                className={`p-5 transition-shadow hover:shadow-soft ${status === "expired" ? "border-destructive/50 bg-destructive/5" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-bold">{i.name}</h3>
                    {i.category && <p className="text-xs text-muted-foreground">{i.category}</p>}
                  </div>
                  <div className="flex shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(i)} aria-label={`Editar ${i.name}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(i.id)} aria-label={`Remover ${i.name}`}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {i.quantity} {i.unit}
                  </Badge>
                  {status === "expired" && <Badge variant="destructive">Vencido há {Math.abs(days ?? 0)}d</Badge>}
                  {status === "critical" && <Badge variant="destructive">Vence em {days}d</Badge>}
                  {status === "soon" && <Badge className="bg-warning text-warning-foreground">Vence em {days}d</Badge>}
                  {status === "ok" && <Badge variant="secondary">Vence em {days}d</Badge>}
                </div>
                {i.notes && <p className="mt-2 text-xs text-muted-foreground">{i.notes}</p>}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditingId(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar item" : "Adicionar item"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Categoria</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sem categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY}>Sem categoria</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Código de barras</Label>
                <div className="flex gap-2">
                  <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
                  <Button type="button" size="icon" variant="outline" onClick={() => setScanOpen(true)} aria-label="Escanear">
                    <ScanLine className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </div>
              <div>
                <Label>Unidade</Label>
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
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fabricação</Label>
                <Input type="date" value={form.manufactured_at} onChange={(e) => setForm({ ...form, manufactured_at: e.target.value })} />
              </div>
              <div>
                <Label>Validade</Label>
                <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={500} />
            </div>
            <Button onClick={save} className="w-full" disabled={saving}>
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Adicionar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PasteItemsDialog
        open={pasteOpen}
        onOpenChange={setPasteOpen}
        saving={pasteSaving}
        title="Colar e separar produtos"
        onConfirm={async (parsed) => {
          if (!user) return;
          setPasteSaving(true);
          const { error } = await supabase.from("fridge_items").insert(
            parsed.map((p) => ({ user_id: user.id, name: p.name, quantity: p.quantity, unit: p.unit })),
          );
          setPasteSaving(false);
          if (error) return toast.error(error.message);
          toast.success(`${parsed.length} produto(s) adicionados`);
          setPasteOpen(false);
          load();
        }}
      />

      <CategoryManager open={catsOpen} onOpenChange={setCatsOpen} categories={categories} />
      <BarcodeScanner
        open={scanOpen}
        onOpenChange={setScanOpen}
        onDetected={async (code) => {
          setForm((f) => ({ ...f, barcode: code }));
          const product = await lookupProduct(code);
          if (product.name) {
            const cat = categories.find((c) => c.name.toLowerCase() === product.category.toLowerCase());
            setScanSection(product.section);
            setForm((f) => ({
              ...f,
              barcode: code,
              name: product.name,
              unit: product.unit || f.unit,
              category_id: cat?.id ?? f.category_id,
            }));
            toast.success(`${product.name} · ${SECTION_LABEL[product.section]}`);
          } else {
            setScanSection(null);
            toast.warning("Produto não encontrado na base — cadastre e ele ficará salvo para todos");
          }
        }}
      />
    </div>
  );
}
