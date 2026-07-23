import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Configurações — SmartFridge AI" }, { name: "robots", content: "noindex" }] }),
  component: Settings,
});

function Settings() {
  const { theme, toggle } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();

  const deleteAccount = async () => {
    if (!confirm("Tem certeza? Esta ação é irreversível.")) return;
    if (!user) return;
    // Delete user data; the auth user row is kept — user can request removal via support.
    await supabase.from("fridge_items").delete().eq("user_id", user.id);
    await supabase.from("shopping_items").delete().eq("user_id", user.id);
    await supabase.from("saved_recipes").delete().eq("user_id", user.id);
    await supabase.auth.signOut();
    toast.success("Seus dados foram removidos");
    navigate({ to: "/" });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Configurações</h1>
        <p className="text-muted-foreground">Personalize sua experiência.</p>
      </div>

      <Card className="p-6">
        <h2 className="font-display text-lg font-bold">Aparência</h2>
        <div className="mt-4 flex items-center justify-between">
          <Label htmlFor="dark">Modo escuro</Label>
          <Switch id="dark" checked={theme === "dark"} onCheckedChange={toggle} />
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-display text-lg font-bold">Notificações</h2>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between"><Label>Alertas de validade</Label><Switch defaultChecked /></div>
          <div className="flex items-center justify-between"><Label>Sugestões semanais</Label><Switch defaultChecked /></div>
          <div className="flex items-center justify-between"><Label>E-mails promocionais</Label><Switch /></div>
        </div>
      </Card>

      <Card className="border-destructive/40 p-6">
        <h2 className="font-display text-lg font-bold text-destructive">Zona de perigo</h2>
        <p className="mt-1 text-sm text-muted-foreground">Excluir permanentemente todos os seus dados desta conta.</p>
        <Button variant="destructive" className="mt-4" onClick={deleteAccount}>Excluir meus dados</Button>
      </Card>
    </div>
  );
}
