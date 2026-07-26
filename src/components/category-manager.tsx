import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Check, X, ArrowUp, ArrowDown, Tags } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type Category = { id: string; name: string; color: string | null; sort_order: number };

export function useCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);

  const load = async () => {
    const { data } = await supabase.from("categories").select("id,name,color,sort_order").order("sort_order");
    setCategories((data as Category[]) ?? []);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase
      .channel("categories-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "categories", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  return { categories, reloadCategories: load };
}

export function CategoryManager({
  open,
  onOpenChange,
  categories,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: Category[];
}) {
  const { user } = useAuth();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const create = async () => {
    const name = newName.trim();
    if (!name || !user) return;
    if (name.length > 40) return toast.error("Nome muito longo (máx. 40)");
    const nextOrder = (categories.at(-1)?.sort_order ?? 0) + 1;
    const { error } = await supabase.from("categories").insert({ user_id: user.id, name, sort_order: nextOrder });
    if (error) return toast.error(error.message.includes("duplicate") ? "Categoria já existe" : error.message);
    setNewName("");
    toast.success("Categoria criada");
  };

  const rename = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    const { error } = await supabase.from("categories").update({ name }).eq("id", id);
    if (error) return toast.error(error.message.includes("duplicate") ? "Já existe uma categoria com esse nome" : error.message);
    setEditingId(null);
    toast.success("Categoria renomeada");
  };

  const remove = async (cat: Category) => {
    const { count } = await supabase
      .from("fridge_items")
      .select("id", { count: "exact", head: true })
      .eq("category_id", cat.id);
    if ((count ?? 0) > 0) return toast.error(`"${cat.name}" tem ${count} produto(s). Mova-os antes de excluir.`);
    const { error } = await supabase.from("categories").delete().eq("id", cat.id);
    if (error) return toast.error(error.message);
    toast.success("Categoria excluída");
  };

  const move = async (index: number, dir: -1 | 1) => {
    const a = categories[index];
    const b = categories[index + dir];
    if (!a || !b) return;
    await Promise.all([
      supabase.from("categories").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("categories").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5" /> Gerenciar categorias
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
          className="flex gap-2"
        >
          <Input placeholder="Nova categoria..." value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={40} />
          <Button type="submit" size="icon" aria-label="Criar categoria">
            <Plus className="h-4 w-4" />
          </Button>
        </form>

        <div className="divide-y divide-border rounded-lg border">
          {categories.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhuma categoria ainda.</p>}
          {categories.map((c, i) => (
            <div key={c.id} className="flex items-center gap-2 p-2">
              {editingId === c.id ? (
                <>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={40} className="h-8" autoFocus />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => rename(c.id)} aria-label="Salvar">
                    <Check className="h-4 w-4 text-accent" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)} aria-label="Cancelar">
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 truncate text-sm">{c.name}</span>
                  <Button size="icon" variant="ghost" className="h-8 w-8" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Subir">
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={i === categories.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label="Descer"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => {
                      setEditingId(c.id);
                      setEditName(c.name);
                    }}
                    aria-label="Renomear"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => remove(c)} aria-label="Excluir">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Categorias com produtos não podem ser excluídas — mova os itens antes.</p>
      </DialogContent>
    </Dialog>
  );
}
