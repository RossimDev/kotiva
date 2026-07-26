import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

type Notif = { id: string; title: string; body: string | null; type: string; read: boolean; created_at: string };

export const Route = createFileRoute("/app/notifications")({
  head: () => ({ meta: [{ title: "Notificações — Kotiva" }, { name: "robots", content: "noindex" }] }),
  component: Notifs,
});

function Notifs() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);

  const load = () =>
    supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50).then(({ data }) => setItems((data as Notif[]) ?? []));

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("notifs").on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  };
  const markAll = async () => {
    await supabase.from("notifications").update({ read: true }).eq("read", false);
    toast.success("Tudo marcado como lido");
  };
  const remove = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Notificações</h1>
          <p className="text-muted-foreground">Alertas de validade e novidades</p>
        </div>
        {items.some((i) => !i.read) && <Button variant="outline" onClick={markAll}><Check className="mr-2 h-4 w-4" /> Marcar tudo como lido</Button>}
      </div>
      {items.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-16 text-center">
          <Bell className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">Nenhuma notificação por enquanto.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card key={n.id} className={`flex items-start justify-between gap-4 p-4 ${n.read ? "" : "border-primary/40 bg-primary/5"}`}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                  <h3 className="font-medium">{n.title}</h3>
                </div>
                {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("pt-BR")}</p>
              </div>
              <div className="flex gap-1">
                {!n.read && <Button size="icon" variant="ghost" onClick={() => markRead(n.id)}><Check className="h-4 w-4" /></Button>}
                <Button size="icon" variant="ghost" onClick={() => remove(n.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
