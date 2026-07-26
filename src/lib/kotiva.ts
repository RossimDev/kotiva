export const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function money(v: number | null | undefined) {
  return BRL.format(Number(v ?? 0));
}

export const SHOPPING_CATEGORIES = [
  "Hortifruti",
  "Carnes",
  "Laticínios",
  "Bebidas",
  "Padaria",
  "Congelados",
  "Mercearia",
  "Limpeza",
  "Higiene",
  "Pet",
  "Outros",
] as const;

export const BILL_CATEGORIES = [
  "Moradia",
  "Energia",
  "Água",
  "Internet",
  "Telefone",
  "Streaming",
  "Mercado",
  "Transporte",
  "Saúde",
  "Educação",
  "Outros",
] as const;

export const DIET_OPTIONS = [
  { value: "nenhuma", label: "Sem restrição" },
  { value: "vegetariana", label: "Vegetariana" },
  { value: "vegana", label: "Vegana" },
  { value: "low-carb", label: "Low carb" },
  { value: "cetogenica", label: "Cetogênica" },
  { value: "sem-gluten", label: "Sem glúten" },
  { value: "sem-lactose", label: "Sem lactose" },
  { value: "mediterranea", label: "Mediterrânea" },
] as const;

export const GOAL_OPTIONS = [
  { value: "equilibrio", label: "Equilíbrio" },
  { value: "emagrecimento", label: "Emagrecimento" },
  { value: "massa", label: "Ganho de massa" },
  { value: "energia", label: "Mais energia" },
  { value: "economia", label: "Economizar" },
] as const;

export function daysBetween(from: string | Date, to: Date = new Date()) {
  const a = typeof from === "string" ? new Date(`${from}T00:00:00`) : from;
  const b = new Date(to);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function formatSeconds(total: number) {
  const s = Math.max(0, Math.floor(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/** Pede permissão e dispara uma notificação do navegador (PWA). */
export async function pushLocalNotification(title: string, body?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  let perm = Notification.permission;
  if (perm === "default") perm = await Notification.requestPermission();
  if (perm !== "granted") return false;
  new Notification(title, { body, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png" });
  return true;
}
