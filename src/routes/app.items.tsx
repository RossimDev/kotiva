import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Package, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BarcodeScanner } from "@/components/barcode-scanner";

type Item = { id: string; name: string; category: string | null; quantity: number | null; unit: string | null; barcode: string | null; expires_at: string | null; notes: string | null };

export const Route = createFileRoute("/app/items")({
  head: () => ({ meta: [{ title: "Geladeira — SmartFridge AI" }, { name: "robots", content: "noindex" }] }),
  component: Items,
});

function daysUntil(d: string | null) {
  if (!d) return null;
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

function Items() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", quantity: "1", unit: "un", barcode: "", expires_at: "", notes: "" });
  const [q, setQ] = useState("");

  const load = () => supabase.from("fridge_items").select("*").order("expires_at", { ascending: true, nullsFirst: false }).then(({ data }) => setItems((data as Item[]) ?? []));

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("items")
      .on("postgres_changes", { event: "*", schema: "public", table: "fridge_items", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const add = async () => {
    if (!form.name.trim() || !user) return toast.error("Nome é obrigatório");
    const { error } = await supabase.from("fridge_items").insert({
      user_id: user.id,
      name: form.name.trim(),
      category: form.category || null,
      quantity: Number(form.quantity) || 1,
      unit: form.unit || "un",
      barcode: form.barcode || null,
      expires_at: form.expires_at || null,
      notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Item adicionado");
    setOpen(false);
    setForm({ name: "", category: "", quantity: "1", unit: "un", barcode: "", expires_at: "", notes: "" });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("fridge_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removido");
  };

  const filtered = items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Minha geladeira</h1>
          <p className="text-muted-foreground">{items.length} {items.length === 1 ? "item" : "itens"} cadastrados</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="shadow-glow"><Plus className="mr-2 h-4 w-4" /> Novo item</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Adicionar item</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Categoria</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Laticínios..." /></div>
                <div>
                  <Label>Código de barras</Label>
                  <div className="flex gap-2">
                    <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
                    <Button type="button" size="icon" variant="outline" onClick={() => setScanOpen(true)} aria-label="Escanear"><ScanLine className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Quantidade</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
                <div><Label>Unidade</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
                <div><Label>Validade</Label><Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></div>
              </div>
              <div><Label>Notas</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={add} className="w-full">Adicionar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Input placeholder="Buscar item..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-16 text-center">
          <Package className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">{items.length === 0 ? "Sua geladeira está vazia. Adicione o primeiro item!" : "Nenhum item encontrado."}</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((i) => {
            const days = daysUntil(i.expires_at);
            const status = days === null ? null : days < 0 ? "expired" : days <= 3 ? "soon" : "ok";
            return (
              <Card key={i.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-lg font-bold">{i.name}</h3>
                    {i.category && <p className="text-xs text-muted-foreground">{i.category}</p>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">{i.quantity} {i.unit}</Badge>
                  {i.expires_at && status === "expired" && <Badge variant="destructive">Vencido</Badge>}
                  {i.expires_at && status === "soon" && <Badge className="bg-warning text-warning-foreground">Vence em {days}d</Badge>}
                  {i.expires_at && status === "ok" && <Badge variant="secondary">Vence em {days}d</Badge>}
                </div>
                {i.notes && <p className="mt-2 text-xs text-muted-foreground">{i.notes}</p>}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
