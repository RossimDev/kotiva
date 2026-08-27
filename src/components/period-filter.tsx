import { useMemo, useState } from "react";
import { CalendarIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type Period =
  | { mode: "quick"; days: number }
  | { mode: "day"; day: string }
  | { mode: "month"; month: string }
  | { mode: "months"; months: string[] }
  | { mode: "range"; from: string; to: string };

export const DEFAULT_PERIOD: Period = { mode: "quick", days: 90 };

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
};

/** Datas cobertas pelo período (início inclusivo, fim exclusivo) — usado para filtrar registros. */
export function inPeriod(p: Period, date: Date | string | null): boolean {
  if (!date) return false;
  const d = typeof date === "string" ? new Date(date.length === 10 ? `${date}T00:00:00` : date) : date;
  if (Number.isNaN(d.getTime())) return false;
  switch (p.mode) {
    case "quick": {
      const from = new Date();
      from.setDate(from.getDate() - p.days);
      from.setHours(0, 0, 0, 0);
      return d >= from;
    }
    case "day":
      return iso(d) === p.day;
    case "month":
      return monthKey(d) === p.month;
    case "months":
      return p.months.includes(monthKey(d));
    case "range": {
      const from = new Date(`${p.from}T00:00:00`);
      const to = new Date(`${p.to}T23:59:59`);
      return d >= from && d <= to;
    }
  }
}

/** Meses (YYYY-MM) que o período cobre, em ordem crescente — base dos gráficos mensais. */
export function periodMonths(p: Period): string[] {
  const out: string[] = [];
  const push = (d: Date) => {
    const k = monthKey(d);
    if (!out.includes(k)) out.push(k);
  };
  if (p.mode === "months") return [...p.months].sort();
  if (p.mode === "month") return [p.month];
  if (p.mode === "day") return [p.day.slice(0, 7)];
  const from = p.mode === "range" ? new Date(`${p.from}T00:00:00`) : new Date(new Date().setDate(new Date().getDate() - p.days));
  const to = p.mode === "range" ? new Date(`${p.to}T00:00:00`) : new Date();
  const cur = new Date(from.getFullYear(), from.getMonth(), 1);
  while (cur <= to) {
    push(cur);
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

export function periodLabel(p: Period): string {
  switch (p.mode) {
    case "quick":
      return p.days === 30 ? "Últimos 30 dias" : p.days === 90 ? "3 meses" : p.days === 180 ? "6 meses" : `${p.days} dias`;
    case "day":
      return new Date(`${p.day}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    case "month":
      return monthLabel(p.month);
    case "months":
      return p.months.length === 1 ? monthLabel(p.months[0]) : `${p.months.length} meses selecionados`;
    case "range":
      return `${new Date(`${p.from}T00:00:00`).toLocaleDateString("pt-BR")} → ${new Date(`${p.to}T00:00:00`).toLocaleDateString("pt-BR")}`;
  }
}

function lastMonths(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < n; i++) {
    out.push(monthKey(d));
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

/** Filtro de período: atalhos, dia único, mês, múltiplos meses e intervalo livre (mínimo 1 mês). */
export function PeriodFilter({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<{ from?: Date; to?: Date }>({});
  const [rangeError, setRangeError] = useState<string | null>(null);
  const months = useMemo(() => lastMonths(24), []);

  const applyRange = () => {
    if (!range.from || !range.to) return setRangeError("Escolha a data inicial e a final.");
    const diff = (range.to.getTime() - range.from.getTime()) / 86400000;
    if (diff < 28) return setRangeError("O intervalo livre precisa ter no mínimo 1 mês.");
    setRangeError(null);
    onChange({ mode: "range", from: iso(range.from), to: iso(range.to) });
    setOpen(false);
  };

  const thisMonth = monthKey(new Date());
  const prev = new Date();
  prev.setDate(1);
  prev.setMonth(prev.getMonth() - 1);
  const lastMonth = monthKey(prev);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant={value.mode === "month" && value.month === thisMonth ? "default" : "outline"} className="rounded-full" onClick={() => onChange({ mode: "month", month: thisMonth })}>
        Este mês
      </Button>
      <Button size="sm" variant={value.mode === "month" && value.month === lastMonth ? "default" : "outline"} className="rounded-full" onClick={() => onChange({ mode: "month", month: lastMonth })}>
        Mês passado
      </Button>
      <Button size="sm" variant={value.mode === "quick" && value.days === 30 ? "default" : "outline"} className="rounded-full" onClick={() => onChange({ mode: "quick", days: 30 })}>
        Últimos 30 dias
      </Button>
      <Button size="sm" variant={value.mode === "quick" && value.days === 365 ? "default" : "outline"} className="rounded-full" onClick={() => onChange({ mode: "quick", days: 365 })}>
        12 meses
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" variant="secondary" className="rounded-full">
            <CalendarIcon className="mr-2 h-3.5 w-3.5" /> {periodLabel(value)}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[22rem] p-3">
          <Tabs defaultValue="dia">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dia">Dia</TabsTrigger>
              <TabsTrigger value="mes">Mês</TabsTrigger>
              <TabsTrigger value="meses">Meses</TabsTrigger>
              <TabsTrigger value="range">Período</TabsTrigger>
            </TabsList>

            <TabsContent value="dia" className="mt-3">
              <Calendar
                mode="single"
                selected={value.mode === "day" ? new Date(`${value.day}T00:00:00`) : undefined}
                onSelect={(d) => {
                  if (!d) return;
                  onChange({ mode: "day", day: iso(d) });
                  setOpen(false);
                }}
                className={cn("p-0 pointer-events-auto")}
              />
            </TabsContent>

            <TabsContent value="mes" className="mt-3">
              <div className="grid max-h-64 grid-cols-2 gap-1.5 overflow-y-auto pr-1">
                {months.map((m) => (
                  <Button key={m} size="sm" variant={value.mode === "month" && value.month === m ? "default" : "outline"} className="justify-start capitalize" onClick={() => { onChange({ mode: "month", month: m }); setOpen(false); }}>
                    {monthLabel(m)}
                  </Button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="meses" className="mt-3">
              <p className="mb-2 text-xs text-muted-foreground">Selecione um ou mais meses, mesmo não consecutivos.</p>
              <div className="grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto pr-1">
                {months.map((m) => {
                  const sel = value.mode === "months" && value.months.includes(m);
                  return (
                    <Button
                      key={m}
                      size="sm"
                      variant={sel ? "default" : "outline"}
                      className="justify-start capitalize"
                      onClick={() => {
                        const cur = value.mode === "months" ? value.months : [];
                        const next = sel ? cur.filter((x) => x !== m) : [...cur, m];
                        onChange(next.length ? { mode: "months", months: next.sort() } : DEFAULT_PERIOD);
                      }}
                    >
                      {sel && <Check className="mr-1 h-3 w-3" />} {monthLabel(m)}
                    </Button>
                  );
                })}
              </div>
              {value.mode === "months" && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {value.months.map((m) => (
                    <Badge key={m} variant="secondary" className="capitalize">{monthLabel(m)}</Badge>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="range" className="mt-3">
              <Calendar
                mode="range"
                selected={range as never}
                onSelect={(r) => setRange((r ?? {}) as { from?: Date; to?: Date })}
                numberOfMonths={1}
                className={cn("p-0 pointer-events-auto")}
              />
              {rangeError && <p className="mt-2 text-xs text-destructive">{rangeError}</p>}
              <Button size="sm" className="mt-2 w-full" onClick={applyRange}>Aplicar período</Button>
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>
    </div>
  );
}
