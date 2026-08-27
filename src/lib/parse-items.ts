import { UNITS } from "@/lib/units";

export type ParsedItem = {
  name: string;
  quantity: number;
  unit: string;
  hasQuantity: boolean;
};

const UNIT_ALIASES: Record<string, string> = {
  un: "un",
  uns: "un",
  unid: "un",
  unidade: "un",
  unidades: "un",
  pct: "pct",
  pacote: "pct",
  pacotes: "pct",
  cx: "cx",
  caixa: "cx",
  caixas: "cx",
  dz: "dz",
  duzia: "dz",
  duzias: "dz",
  l: "L",
  lt: "L",
  litro: "L",
  litros: "L",
  ml: "ml",
  kg: "kg",
  quilo: "kg",
  quilos: "kg",
  kilo: "kg",
  kilos: "kg",
  g: "g",
  grama: "g",
  gramas: "g",
  mg: "mg",
  fatia: "fatia",
  fatias: "fatia",
  garrafa: "garrafa",
  garrafas: "garrafa",
  lata: "lata",
  latas: "lata",
  pote: "pote",
  potes: "pote",
  saco: "saco",
  sacos: "saco",
  bandeja: "bandeja",
  bandejas: "bandeja",
};

const VALID_UNITS = new Set<string>(UNITS.map((u) => u.value));

const STOP_PREFIX = /^(?:[-*•·–—]+|\d+[.)])\s*/;

const deaccent = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/** Singulariza formas simples do português (leites -> leite, maçãs -> maçã). */
function singularize(word: string) {
  if (word.length <= 3) return word;
  if (/ões$/i.test(word)) return word.replace(/ões$/i, "ão");
  if (/ães$/i.test(word)) return word.replace(/ães$/i, "ão");
  if (/ais$/i.test(word)) return word.replace(/ais$/i, "al");
  if (/is$/i.test(word)) return word.replace(/is$/i, "il");
  if (/ns$/i.test(word)) return word.replace(/ns$/i, "m");
  if (/s$/i.test(word)) return word.slice(0, -1);
  return word;
}

function titleCase(s: string) {
  const small = new Set(["de", "da", "do", "das", "dos", "e", "com", "sem", "em", "para"]);
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) =>
      i > 0 && small.has(deaccent(w)) ? deaccent(w) : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join(" ");
}

function parseOne(raw: string): ParsedItem | null {
  let text = raw.trim().replace(STOP_PREFIX, "").replace(/\s+/g, " ");
  // remove marcações de checkbox e emojis simples
  text = text
    .replace(/^\[[ xX]?\]\s*/, "")
    .replace(/[\u2600-\u27bf]|\p{Extended_Pictographic}/gu, "")
    .trim();
  if (!text) return null;

  let quantity = 1;
  let unit = "un";
  let hasQuantity = false;

  // "2x leite" | "2 x leite"
  const xMatch = text.match(/^(\d+(?:[.,]\d+)?)\s*[xX×]\s+(.+)$/);
  if (xMatch?.[1] && xMatch[2]) {
    quantity = Number(xMatch[1].replace(",", "."));
    hasQuantity = true;
    text = xMatch[2];
  } else {
    // "2 kg de arroz" | "500g açúcar" | "3 maçãs"
    const numMatch = text.match(
      /^(\d+(?:[.,]\d+)?)\s*([a-zA-ZçÇãáéíóúÁÉÍÓÚ]+)?\s*(?:de\s+|do\s+|da\s+)?(.*)$/,
    );
    if (numMatch?.[1]) {
      const maybeUnit = numMatch[2] ? UNIT_ALIASES[deaccent(numMatch[2])] : undefined;
      const rest = (numMatch[3] ?? "").trim();
      if (maybeUnit && rest) {
        quantity = Number(numMatch[1].replace(",", "."));
        unit = VALID_UNITS.has(maybeUnit) ? maybeUnit : "un";
        hasQuantity = true;
        text = rest;
      } else if (!numMatch[2] || !rest) {
        // número seguido direto do nome: "3 maçãs"
        const tail = [numMatch[2], rest].filter(Boolean).join(" ").trim();
        if (tail) {
          quantity = Number(numMatch[1].replace(",", "."));
          hasQuantity = true;
          text = tail;
        }
      } else {
        // "2 leites" onde a palavra não é unidade
        quantity = Number(numMatch[1].replace(",", "."));
        hasQuantity = true;
        text = `${numMatch[2]} ${rest}`.trim();
      }
    }
  }

  // sufixo de quantidade: "arroz 2kg" / "leite x3"
  const suffix = text.match(/\s+[xX×]\s*(\d+(?:[.,]\d+)?)$/);
  if (suffix?.[1]) {
    quantity = Number(suffix[1].replace(",", "."));
    hasQuantity = true;
    text = text.replace(suffix[0], "");
  }

  text = text
    .replace(/^(?:de|do|da)\s+/i, "")
    .replace(/[.;,]+$/, "")
    .trim();
  if (!text || /^\d+$/.test(text)) return null;

  // pluraliza de volta ao singular quando há quantidade
  if (hasQuantity && quantity > 1) {
    const words = text.split(" ");
    const first = words[0];
    if (first) words[0] = singularize(first);
    text = words.join(" ");
  }

  if (!Number.isFinite(quantity) || quantity <= 0) quantity = 1;

  return { name: titleCase(text).slice(0, 120), quantity, unit, hasQuantity };
}

/** Interpreta um texto colado e separa em produtos individuais. */
export function parseItemsText(input: string): ParsedItem[] {
  if (!input?.trim()) return [];
  const chunks = input
    .split(/\r?\n|[;,]|\s+\/\s+|\se\s(?=\d)/gi)
    .map((c) => c.trim())
    .filter(Boolean);

  const out: ParsedItem[] = [];
  const seen = new Set<string>();
  for (const chunk of chunks) {
    const parsed = parseOne(chunk);
    if (!parsed) continue;
    const key = deaccent(parsed.name);
    if (seen.has(key)) {
      const existing = out.find((o) => deaccent(o.name) === key);
      if (existing && parsed.hasQuantity) existing.quantity += parsed.quantity;
      continue;
    }
    seen.add(key);
    out.push(parsed);
  }
  return out.slice(0, 100);
}

export const normalizeName = (s: string) => deaccent(singularize(s.trim())).replace(/\s+/g, " ");
