import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { Refrigerator, LayoutDashboard, Package, ChefHat, ShoppingCart, User, Settings, Shield, LogOut, Menu, X, Bell, Timer, Home, Flame, Sparkles, PawPrint } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/app/dashboard", icon: LayoutDashboard, label: "Painel" },
  { to: "/app/items", icon: Package, label: "Geladeira" },
  { to: "/app/recipes", icon: ChefHat, label: "Cozinheiro IA" },
  { to: "/app/shopping", icon: ShoppingCart, label: "Compras" },
  { to: "/app/stove", icon: Timer, label: "Fogão" },
  { to: "/app/house", icon: Home, label: "Casa" },
  { to: "/app/gas", icon: Flame, label: "Botijão" },
  { to: "/app/cleaning", icon: Sparkles, label: "Limpeza IA" },
  { to: "/app/pets", icon: PawPrint, label: "Pet IA" },
  { to: "/app/notifications", icon: Bell, label: "Notificações" },
  { to: "/app/profile", icon: User, label: "Perfil" },
  { to: "/app/settings", icon: Settings, label: "Configurações" },
] as const;


export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { location } = useRouterState();
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    router.navigate({ to: "/auth" });
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 border-r border-border/60 bg-card p-4 transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <Link to="/app/dashboard" className="mb-8 flex items-center gap-2 font-display text-lg font-bold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-hero text-primary-foreground shadow-glow">
            <Refrigerator className="h-5 w-5" />
          </span>
          Koti<span className="text-primary">va</span>
        </Link>
        <nav className="space-y-1">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              activeProps={{ className: "bg-primary/10 text-primary" }}>
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/app/admin" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              activeProps={{ className: "bg-primary/10 text-primary" }}>
              <Shield className="h-4 w-4" /> Admin
            </Link>
          )}
        </nav>
        <div className="mt-6 space-y-2 border-t border-border/60 pt-4">
          <div className="px-3 text-xs text-muted-foreground truncate">{user?.email}</div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>

      {/* Mobile top */}
      <div className="flex flex-1 flex-col">
        <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur md:hidden">
          <Link to="/app/dashboard" className="font-display font-bold">Koti<span className="text-primary">va</span></Link>
          <Button variant="ghost" size="icon" onClick={() => setOpen((o) => !o)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      {open && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setOpen(false)} />}
    </div>
  );
}
