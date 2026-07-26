export const UNITS = [
  { value: "un", label: "Unidade (un)" },
  { value: "pct", label: "Pacote (pct)" },
  { value: "cx", label: "Caixa (cx)" },
  { value: "dz", label: "Dúzia (dz)" },
  { value: "L", label: "Litro (L)" },
  { value: "ml", label: "Mililitro (ml)" },
  { value: "kg", label: "Quilograma (kg)" },
  { value: "g", label: "Grama (g)" },
  { value: "mg", label: "Miligrama (mg)" },
  { value: "fatia", label: "Fatia" },
  { value: "garrafa", label: "Garrafa" },
  { value: "lata", label: "Lata" },
  { value: "pote", label: "Pote" },
  { value: "saco", label: "Saco" },
  { value: "bandeja", label: "Bandeja" },
] as const;

export type UnitValue = (typeof UNITS)[number]["value"];

export function unitLabel(value: string | null | undefined) {
  if (!value) return "un";
  return UNITS.find((u) => u.value === value)?.value ?? value;
}

export function daysUntil(date: string | null | undefined) {
  if (!date) return null;
  const target = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export type ExpiryStatus = "expired" | "critical" | "soon" | "ok" | "none";

export function expiryStatus(date: string | null | undefined): ExpiryStatus {
  const d = daysUntil(date);
  if (d === null) return "none";
  if (d < 0) return "expired";
  if (d <= 2) return "critical";
  if (d <= 7) return "soon";
  return "ok";
}
