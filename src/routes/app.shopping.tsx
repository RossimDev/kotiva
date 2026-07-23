import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type Item = { id: string; name: string; quantity: number | null; unit: string | null; checked: boolean };

export const Route = createFileRoute("/app/shopping")({
  head: () => ({ meta: [{ title: "Lista de compras — SmartFridge AI" }, { name: "robots", content: "noindex" }] }),
  component: Shopping,
});

function Shopping() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");

  const load = () => supabase.from("shopping_items").select("*").order("checked").order("created_at").then(({ data }) => setItems((data as Item[]) ?? []));

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("shop")
      .on("postgres_changes", { event: "*", schema: "public", table: "shopping_items", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const add = async () => {
    if (!name.trim() || !user) return;
    const { error } = await supabase.from("shopping_items").insert({ user_id: user.id, name: name.trim() });
    if (error) return toast.error(error.message);
    setName("");
  };
  const toggle = async (i: Item) => { await supabase.from("shopping_items").update({ checked: !i.checked }).eq("id", i.id); };
  const remove = async (id: string) => { await supabase.from("shopping_items").delete().eq("id", id); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Lista de compras</h1>
        <p className="text-muted-foreground">{items.filter((i) => !i.checked).length} pendentes</p>
      </div>

      <Card className="p-4">
        <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex gap-2">
          <Input placeholder="Ex: leite, ovos, pão..." value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" className="shadow-glow"><Plus className="h-4 w-4" /></Button>
        </form>
      </Card>

      {items.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-16 text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">Sua lista está vazia.</p>
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {items.map((i) => (
            <div key={i.id} className={`flex items-center gap-3 p-4 ${i.checked ? "opacity-60" : ""}`}>
              <Checkbox checked={i.checked} onCheckedChange={() => toggle(i)} />
              <span className={`flex-1 ${i.checked ? "line-through" : ""}`}>{i.name}</span>
              <Button variant="ghost" size="icon" onClick={() => remove(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
