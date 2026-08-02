import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Package } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/soon")({
  head: () => ({ meta: [{ title: "Vencendo em Breve — Kotiva" }, { name: "robots", content: "noindex" }] }),
  component: Soon,
});

type Item = { id: string; name: string; category: string | null; quantity: number | null; unit: string | null; expires_at: string | null };

function daysLeft(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return Math.ceil((d.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
}

function Soon() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("fridge_items")
      .select("id,name,category,quantity,unit,expires_at")
      .not("expires_at", "is", null)
      .order("expires_at")
      .then(({ data }) => setItems((data ?? []) as Item[]));
  }, [user]);

  const groups = useMemo(() => {
    const rows = items.filter((i) => i.expires_at).map((i) => ({ ...i, d: daysLeft(i.expires_at!) }));
    return {
      vencidos: rows.filter((r) => r.d < 0),
      hoje: rows.filter((r) => r.d === 0),
      semana: rows.filter((r) => r.d > 0 && r.d <= 7),
      mes: rows.filter((r) => r.d > 7 && r.d <= 30),
    };
  }, [items]);

  const blocks = [
    { key: "vencidos", label: "Vencidos", rows: groups.vencidos, variant: "destructive" as const },
    { key: "hoje", label: "Vencem hoje", rows: groups.hoje, variant: "destructive" as const },
    { key: "semana", label: "Próximos 7 dias", rows: groups.semana, variant: "default" as const },
    { key: "mes", label: "Próximos 30 dias", rows: groups.mes, variant: "secondary" as const },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Vencendo em Breve</h1>
          <p className="text-muted-foreground">Tudo que está perto da validade, organizado por urgência.</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/app/items"><Package className="mr-2 h-4 w-4" /> Ir para a Geladeira</Link>
        </Button>
      </div>

      {blocks.map((b) => (
        <Card key={b.key} className="animate-fade-in p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <CalendarClock className="h-4 w-4" /> {b.label}
            <Badge variant="secondary">{b.rows.length}</Badge>
          </h2>
          {b.rows.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Nada por aqui.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border/60">
              {b.rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="truncate">
                    {r.name}
                    {r.category ? <span className="text-muted-foreground"> · {r.category}</span> : null}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {r.quantity ?? 1} {r.unit ?? "un"}
                    </span>
                    <Badge variant={b.variant}>
                      {r.d < 0 ? `${Math.abs(r.d)}d atrás` : r.d === 0 ? "hoje" : `em ${r.d}d`}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}
