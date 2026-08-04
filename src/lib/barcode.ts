import { supabase } from "@/integrations/supabase/client";
import { lookupBarcode } from "@/lib/ai.functions";

export type ProductSection = "geladeira" | "congelador" | "despensa" | "limpeza";

export const SECTION_LABEL: Record<ProductSection, string> = {
  geladeira: "Geladeira",
  congelador: "Congelador",
  despensa: "Despensa",
  limpeza: "Limpeza e higiene",
};

export type BarcodeProduct = {
  code: string;
  name: string;
  brand: string | null;
  category: string;
  section: ProductSection;
  unit: string;
  /** Último preço unitário pago pelo usuário (histórico de compras). */
  lastPrice: number | null;
  lastPurchasedAt: string | null;
  source: "base" | "web" | "none";
};

/** Busca o preço mais recente pago pelo usuário para um produto. */
async function lastPriceFor(name: string, userId?: string) {
  if (!userId || !name.trim()) return { lastPrice: null, lastPurchasedAt: null };
  const { data } = await supabase
    .from("purchase_history")
    .select("unit_price,purchased_at")
    .eq("user_id", userId)
    .eq("normalized_name", name.trim().toLowerCase())
    .order("purchased_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return {
    lastPrice: data ? Number(data.unit_price) : null,
    lastPurchasedAt: data?.purchased_at ?? null,
  };
}

const SECTION_BY_CATEGORY: Record<string, ProductSection> = {
  Hortifruti: "geladeira",
  Carnes: "geladeira",
  Laticínios: "geladeira",
  Bebidas: "geladeira",
  Congelados: "congelador",
  Padaria: "despensa",
  Mercearia: "despensa",
  Doces: "despensa",
  Pet: "despensa",
  Limpeza: "limpeza",
  Higiene: "limpeza",
};

export function sectionFor(category: string | null | undefined): ProductSection {
  return SECTION_BY_CATEGORY[category ?? ""] ?? "despensa";
}

/** Busca o código na base compartilhada e, se não achar, tenta a base pública da web. */
export async function lookupProduct(
  code: string,
  webLookup?: (args: {
    data: { barcode: string };
  }) => Promise<{ found: boolean; name: string | null; category: string | null }>,
  userId?: string,
): Promise<BarcodeProduct> {
  const clean = code.trim();
  const { data } = await supabase
    .from("product_barcodes")
    .select("code,name,brand,category,section,default_unit")
    .eq("code", clean)
    .maybeSingle();

  if (data) {
    const price = await lastPriceFor(data.name, userId);
    return {
      ...price,
      code: clean,
      name: data.name,
      brand: data.brand,
      category: data.category,
      section: (data.section as ProductSection) ?? sectionFor(data.category),
      unit: data.default_unit ?? "un",
      source: "base",
    };
  }

  try {
    const fn = webLookup ?? ((args: { data: { barcode: string } }) => lookupBarcode(args));
    const res = await fn({ data: { barcode: clean } });
    if (res.found && res.name) {
      const price = await lastPriceFor(res.name, userId);
      return {
        ...price,
        code: clean,
        name: res.name,
        brand: null,
        category: "Outros",
        section: "despensa",
        unit: "un",
        source: "web",
      };
    }
  } catch {
    /* offline ou serviço indisponível */
  }

  return {
    lastPrice: null,
    lastPurchasedAt: null,
    code: clean,
    name: "",
    brand: null,
    category: "Outros",
    section: "despensa",
    unit: "un",
    source: "none",
  };
}

/** Alimenta a base compartilhada com um produto cadastrado manualmente. */
export async function saveProductToBase(input: {
  code: string;
  name: string;
  brand?: string | null;
  category: string;
  section: ProductSection;
  unit?: string;
  userId: string;
}) {
  if (!input.code.trim() || !input.name.trim()) return;
  const { data: existing } = await supabase
    .from("product_barcodes")
    .select("id")
    .eq("code", input.code.trim())
    .maybeSingle();
  if (existing) return;
  await supabase.from("product_barcodes").insert({
    code: input.code.trim().slice(0, 40),
    name: input.name.trim().slice(0, 160),
    brand: input.brand?.trim() || null,
    category: input.category,
    section: input.section,
    default_unit: input.unit ?? "un",
    created_by: input.userId,
  });
}
