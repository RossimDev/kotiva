import { Link, useRouterState } from "@tanstack/react-router";
import { Refrigerator } from "lucide-react";

export function Footer() {
  const { location } = useRouterState();
  if (location.pathname.startsWith("/app") || location.pathname.startsWith("/auth")) return null;

  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-hero text-primary-foreground">
              <Refrigerator className="h-5 w-5" />
            </span>
            Koti<span className="text-primary">va</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Gerencie sua geladeira com inteligência artificial. Menos desperdício, mais receitas.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Produto</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground">Recursos</Link></li>
            <li><Link to="/pricing" className="hover:text-foreground">Planos</Link></li>
            <li><Link to="/auth" search={{ mode: "signup" }} className="hover:text-foreground">Criar conta</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Empresa</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-foreground">Sobre nós</Link></li>
            <li><Link to="/contact" className="hover:text-foreground">Contato</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Legal</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/privacy" className="hover:text-foreground">Privacidade</Link></li>
            <li><Link to="/terms" className="hover:text-foreground">Termos de uso</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Kotiva. Todos os direitos reservados.
      </div>
    </footer>
  );
}
