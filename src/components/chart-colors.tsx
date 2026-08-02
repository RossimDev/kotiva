import { useCallback, useEffect, useMemo, useState } from "react";
import { Settings2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/** Paleta padrão (roxo/violeta Kotiva + apoios). */
export const DEFAULT_CHART_COLORS = [
  "#8b5cf6",
  "#22d3ee",
  "#f59e0b",
  "#f43f5e",
  "#34d399",
  "#d946ef",
  "#60a5fa",
  "#fb923c",
];

const HEX = /^#[0-9a-fA-F]{6}$/;

export type ChartColors = {
  colorFor: (key: string, index?: number) => string;
  setColor: (key: string, hex: string) => void;
  reset: () => void;
  colors: Record<string, string>;
  ready: boolean;
};

/**
 * Cores de gráficos persistidas por usuário (tabela user_chart_colors, protegida por RLS).
 * O mesmo `scope` compartilha as cores entre gráficos de pizza e de barras.
 */
export function useChartColors(scope: string): ChartColors {
  const { user } = useAuth();
  const [colors, setColors] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    supabase
      .from("user_chart_colors")
      .select("colors")
      .eq("scope", scope)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        const raw = (data?.colors ?? {}) as Record<string, unknown>;
        const clean: Record<string, string> = {};
        for (const [k, v] of Object.entries(raw)) if (typeof v === "string" && HEX.test(v)) clean[k] = v;
        setColors(clean);
        setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [user, scope]);

  const persist = useCallback(
    async (next: Record<string, string>) => {
      if (!user) return;
      await supabase
        .from("user_chart_colors")
        .upsert({ user_id: user.id, scope, colors: next }, { onConflict: "user_id,scope" });
    },
    [user, scope],
  );

  const setColor = useCallback(
    (key: string, hex: string) => {
      if (!HEX.test(hex)) return;
      setColors((prev) => {
        const next = { ...prev, [key]: hex };
        void persist(next);
        return next;
      });
    },
    [persist],
  );

  const reset = useCallback(() => {
    setColors({});
    void persist({});
  }, [persist]);

  const colorFor = useCallback(
    (key: string, index = 0) => colors[key] ?? DEFAULT_CHART_COLORS[index % DEFAULT_CHART_COLORS.length],
    [colors],
  );

  return useMemo(() => ({ colorFor, setColor, reset, colors, ready }), [colorFor, setColor, reset, colors, ready]);
}

/** Botão de engrenagem com seletores de cor para cada série/categoria do gráfico. */
export function ChartColorSettings({
  keys,
  controller,
  label = "Cores do gráfico",
}: {
  keys: string[];
  controller: ChartColors;
  label?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} title={label}>
          <Settings2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="text-sm font-semibold">{label}</div>
        <p className="mt-1 text-xs text-muted-foreground">As cores valem para pizza e barras da mesma categoria.</p>
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
          {keys.length === 0 && <p className="text-xs text-muted-foreground">Sem categorias para personalizar ainda.</p>}
          {keys.map((k, i) => (
            <label key={k} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate">{k}</span>
              <input
                type="color"
                aria-label={`Cor de ${k}`}
                value={controller.colorFor(k, i)}
                onChange={(e) => controller.setColor(k, e.target.value)}
                className="h-7 w-10 cursor-pointer rounded border border-border bg-transparent"
              />
            </label>
          ))}
        </div>
        <Button variant="outline" size="sm" className="mt-3 w-full" onClick={controller.reset}>
          <RotateCcw className="mr-2 h-3.5 w-3.5" /> Restaurar cores padrão
        </Button>
      </PopoverContent>
    </Popover>
  );
}
