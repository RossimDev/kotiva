import { normalizeName } from "@/lib/parse-items";

export type PresetItem = { name: string; quantity: number; unit: string; category: string };

export type PresetTemplate = { name: string; icon: string; items: PresetItem[] };

const it = (name: string, category: string, quantity = 1, unit = "un"): PresetItem => ({ name, category, quantity, unit });

export const DEFAULT_PRESETS: PresetTemplate[] = [
  {
    name: "Compras básicas",
    icon: "🛒",
    items: [
      it("Arroz", "Mercearia", 5, "kg"),
      it("Feijão", "Mercearia", 1, "kg"),
      it("Óleo de soja", "Mercearia"),
      it("Açúcar", "Mercearia", 1, "kg"),
      it("Café", "Mercearia"),
      it("Sal", "Mercearia"),
      it("Macarrão", "Mercearia", 2),
      it("Leite", "Laticínios", 6),
      it("Ovos", "Hortifruti", 1, "dz"),
      it("Pão de forma", "Padaria"),
    ],
  },
  {
    name: "Compras para cozinha",
    icon: "🍳",
    items: [
      it("Alho", "Hortifruti"),
      it("Cebola", "Hortifruti", 1, "kg"),
      it("Tomate", "Hortifruti", 1, "kg"),
      it("Batata", "Hortifruti", 2, "kg"),
      it("Azeite", "Mercearia"),
      it("Molho de tomate", "Mercearia", 2),
      it("Queijo mussarela", "Laticínios"),
      it("Peito de frango", "Carnes", 1, "kg"),
      it("Carne moída", "Carnes", 1, "kg"),
      it("Temperos", "Mercearia"),
    ],
  },
  {
    name: "Compras de limpeza",
    icon: "🧼",
    items: [
      it("Detergente", "Limpeza", 2),
      it("Sabão em pó", "Limpeza", 1, "kg"),
      it("Amaciante", "Limpeza"),
      it("Água sanitária", "Limpeza"),
      it("Desinfetante", "Limpeza"),
      it("Esponja", "Limpeza", 2),
      it("Saco de lixo", "Limpeza"),
      it("Papel toalha", "Limpeza"),
    ],
  },
  {
    name: "Higiene pessoal",
    icon: "🧴",
    items: [
      it("Papel higiênico", "Higiene"),
      it("Sabonete", "Higiene", 4),
      it("Shampoo", "Higiene"),
      it("Condicionador", "Higiene"),
      it("Creme dental", "Higiene", 2),
      it("Desodorante", "Higiene"),
    ],
  },
  {
    name: "Café da manhã",
    icon: "☕",
    items: [
      it("Pão francês", "Padaria", 1, "kg"),
      it("Manteiga", "Laticínios"),
      it("Presunto", "Carnes"),
      it("Queijo", "Laticínios"),
      it("Iogurte", "Laticínios", 6),
      it("Achocolatado", "Mercearia"),
      it("Frutas", "Hortifruti"),
    ],
  },
];

export type HistoryRow = { normalized_name: string; name: string; category: string | null; quantity: number; unit: string | null; purchased_at: string };

export type Suggestion = {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  timesBought: number;
  avgIntervalDays: number | null;
  daysSinceLast: number;
  reason: string;
  score: number;
};

const DAY = 86400000;

/** Analisa o histórico e sugere itens prováveis para a próxima compra. */
export function buildSuggestions(rows: HistoryRow[], alreadyInList: string[] = []): Suggestion[] {
  const skip = new Set(alreadyInList.map((n) => normalizeName(n)));
  const groups = new Map<string, HistoryRow[]>();
  for (const r of rows) {
    const key = r.normalized_name || normalizeName(r.name);
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  const today = Date.now();
  const out: Suggestion[] = [];

  for (const [key, list] of groups) {
    if (skip.has(key)) continue;
    const dates = list
      .map((r) => new Date(`${r.purchased_at}T00:00:00`).getTime())
      .sort((a, b) => a - b);
    const last = dates[dates.length - 1] ?? today;
    const daysSinceLast = Math.max(0, Math.round((today - last) / DAY));

    let avgIntervalDays: number | null = null;
    if (dates.length > 1) {
      let sum = 0;
      for (let i = 1; i < dates.length; i++) sum += (dates[i]! - dates[i - 1]!) / DAY;
      avgIntervalDays = Math.round(sum / (dates.length - 1));
    }

    const times = list.length;
    let score = times * 10;
    let reason = `Comprado ${times}x`;

    if (avgIntervalDays && avgIntervalDays > 0) {
      const ratio = daysSinceLast / avgIntervalDays;
      score += ratio >= 1 ? 60 : ratio * 40;
      if (ratio >= 1) reason = `Você costuma comprar a cada ${avgIntervalDays} dias — já se passaram ${daysSinceLast}`;
      else reason = `Comprado a cada ~${avgIntervalDays} dias (última há ${daysSinceLast})`;
    } else if (daysSinceLast >= 25) {
      score += 25;
      reason = `Comprado uma vez, há ${daysSinceLast} dias`;
    } else {
      score -= 10;
    }

    const latest = list[list.length - 1]!;
    out.push({
      name: latest.name,
      category: latest.category ?? "Outros",
      quantity: Math.max(1, Math.round(list.reduce((s, r) => s + Number(r.quantity ?? 1), 0) / times)),
      unit: latest.unit ?? "un",
      timesBought: times,
      avgIntervalDays,
      daysSinceLast,
      reason,
      score,
    });
  }

  return out.sort((a, b) => b.score - a.score).slice(0, 20);
}
