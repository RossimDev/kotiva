import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, Mail, Package, ChefHat } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/admin")({
  head: () => ({ meta: [{ title: "Admin — Kotiva" }, { name: "robots", content: "noindex" }] }),
  component: Admin,
});

type Msg = { id: string; name: string; email: string; message: string; created_at: string };

function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ok, setOk] = useState<boolean | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [stats, setStats] = useState({ items: 0, recipes: 0, msgs: 0 });

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle().then(({ data }) => {
      if (!data) { setOk(false); navigate({ to: "/app/dashboard" }); return; }
      setOk(true);
      Promise.all([
        supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("fridge_items").select("id", { count: "exact", head: true }),
        supabase.from("saved_recipes").select("id", { count: "exact", head: true }),
        supabase.from("contact_messages").select("id", { count: "exact", head: true }),
      ]).then(([m, a, b, c]) => {
        setMsgs((m.data as Msg[]) ?? []);
        setStats({ items: a.count ?? 0, recipes: b.count ?? 0, msgs: c.count ?? 0 });
      });
    });
  }, [user, navigate]);

  if (!ok) return <div className="text-muted-foreground">Verificando permissões...</div>;

  const cards = [
    { label: "Itens totais", value: stats.items, icon: Package },
    { label: "Receitas salvas", value: stats.recipes, icon: ChefHat },
    { label: "Mensagens", value: stats.msgs, icon: Mail },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold flex items-center gap-2"><Users className="h-7 w-7" /> Painel Admin</h1>
        <p className="text-muted-foreground">Visão geral da plataforma.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <c.icon className="h-5 w-5 text-primary" />
            <div className="mt-3 font-display text-3xl font-bold">{c.value}</div>
            <div className="text-xs text-muted-foreground">{c.label}</div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="font-display text-lg font-bold">Mensagens recentes</h2>
        {msgs.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Nenhuma mensagem.</p> : (
          <div className="mt-4 space-y-3">
            {msgs.map((m) => (
              <div key={m.id} className="rounded-lg border border-border p-4">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">{m.name}</span>
                  <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("pt-BR")}</span>
                </div>
                <div className="text-xs text-muted-foreground">{m.email}</div>
                <p className="mt-2 text-sm">{m.message}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
