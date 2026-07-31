import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

const publicLinks = [
  { to: "/", label: "Início" },
  { to: "/about", label: "Sobre" },
  { to: "/pricing", label: "Planos" },
  { to: "/contact", label: "Contato" },
] as const;

export function Navbar() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const { location } = useRouterState();
  const hideOnApp = location.pathname.startsWith("/app") || location.pathname.startsWith("/auth");
  if (hideOnApp) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight">
          <img src="/logo-kotiva.png" alt="Kotiva" className="h-10 w-auto drop-shadow-md" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {publicLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              activeProps={{ className: "text-foreground bg-muted" }}
              activeOptions={{ exact: true }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Alternar tema">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {user ? (
            <Button asChild size="sm" className="hidden md:inline-flex">
              <Link to="/app/dashboard">Meu painel</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
                <Link to="/auth">Entrar</Link>
              </Button>
              <Button asChild size="sm" className="hidden md:inline-flex shadow-glow">
                <Link to="/auth" search={{ mode: "signup" }}>Criar conta</Link>
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <div className={cn("md:hidden overflow-hidden border-t border-border/60 bg-background transition-all", open ? "max-h-96" : "max-h-0")}>
        <div className="flex flex-col gap-1 px-4 py-3">
          {publicLinks.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">
              {l.label}
            </Link>
          ))}
          <div className="mt-2 flex gap-2">
            {user ? (
              <Button asChild className="flex-1" onClick={() => setOpen(false)}>
                <Link to="/app/dashboard">Meu painel</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                  <Link to="/auth">Entrar</Link>
                </Button>
                <Button asChild className="flex-1" onClick={() => setOpen(false)}>
                  <Link to="/auth" search={{ mode: "signup" }}>Criar conta</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
