import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/profile")({
  head: () => ({ meta: [{ title: "Perfil — Kotiva" }, { name: "robots", content: "noindex" }] }),
  component: Profile,
});

function Profile() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle().then(({ data }) => setDisplayName(data?.display_name ?? ""));
  }, [user]);

  const save = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").upsert({ id: user.id, display_name: displayName.trim() });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado");
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informações pessoais.</p>
      </div>
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-hero text-primary-foreground font-bold">{(displayName || user?.email || "U")[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-display text-lg font-bold">{displayName || "Sem nome"}</div>
            <div className="text-sm text-muted-foreground">{user?.email}</div>
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <div><Label>Nome de exibição</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} /></div>
          <div><Label>E-mail</Label><Input value={user?.email ?? ""} disabled /></div>
          <Button onClick={save} disabled={loading} className="shadow-glow">{loading ? "Salvando..." : "Salvar alterações"}</Button>
        </div>
      </Card>
    </div>
  );
}
