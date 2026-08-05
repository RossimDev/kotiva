import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callAIJson, NUTRI_SYSTEM } from "./ai.server";

const Prefs = z.object({
  ingredients: z.array(z.string().min(1).max(80)).min(1).max(60),
  diet: z.string().max(40).optional(),
  goal: z.string().max(40).optional(),
  allergies: z.string().max(200).optional(),
  people: z.number().int().min(1).max(20).optional(),
  maxMinutes: z.number().int().min(5).max(240).optional(),
});

export type AiRecipe = {
  title: string;
  description: string;
  minutes: number;
  servings: number;
  difficulty: string;
  ingredients: string[];
  steps: string[];
  nutrition: { calories: number; protein: number; carbs: number; fat: number; fiber: number };
  tips: string[];
};

export const suggestRecipes = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Prefs.parse(input))
  .handler(async ({ data }) => {
    const prompt = `Com base nos ingredientes disponíveis, sugira 3 receitas completas.
Ingredientes disponíveis: ${data.ingredients.join(", ")}
Dieta: ${data.diet ?? "sem restrição"}
Objetivo nutricional: ${data.goal ?? "equilíbrio"}
Alergias/restrições: ${data.allergies || "nenhuma"}
Pessoas: ${data.people ?? 2}
Tempo máximo de preparo: ${data.maxMinutes ?? 60} minutos

Priorize os ingredientes que estão perto do vencimento. Pode incluir no máximo 3 itens básicos extras (sal, azeite, temperos).
Responda SOMENTE com JSON válido:
{"recipes":[{"title":string,"description":string,"minutes":number,"servings":number,"difficulty":"Fácil"|"Média"|"Difícil","ingredients":string[],"steps":string[],"nutrition":{"calories":number,"protein":number,"carbs":number,"fat":number,"fiber":number},"tips":string[]}]}`;

    const parsed = await callAIJson(prompt, NUTRI_SYSTEM);
    return { recipes: (parsed.recipes ?? []) as AiRecipe[] };
  });

const PlanInput = Prefs.extend({
  calorieTarget: z.number().int().min(800).max(6000).optional(),
});

export type MealPlanDay = {
  day: string;
  breakfast: string;
  lunch: string;
  snack: string;
  dinner: string;
  calories: number;
  protein: number;
};

export const generateMealPlan = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => PlanInput.parse(input))
  .handler(async ({ data }) => {
    const prompt = `Monte um cardápio completo de 7 dias (segunda a domingo) para ${data.people ?? 2} pessoa(s).
Ingredientes já disponíveis em casa: ${data.ingredients.join(", ")}
Dieta: ${data.diet ?? "sem restrição"}
Objetivo: ${data.goal ?? "equilíbrio"}
Alergias/restrições: ${data.allergies || "nenhuma"}
Meta calórica diária aproximada: ${data.calorieTarget ?? 2000} kcal

Aproveite ao máximo o que já existe em casa e gere também a lista de compras do que falta, com quantidade e categoria de supermercado.
Responda SOMENTE com JSON válido:
{"summary":string,"days":[{"day":string,"breakfast":string,"lunch":string,"snack":string,"dinner":string,"calories":number,"protein":number}],"shoppingList":[{"name":string,"quantity":number,"unit":string,"category":string}],"tips":string[]}`;

    const parsed = await callAIJson(prompt, NUTRI_SYSTEM);
    return {
      summary: (parsed.summary as string) ?? "",
      days: (parsed.days ?? []) as MealPlanDay[],
      shoppingList: (parsed.shoppingList ?? []) as Array<{ name: string; quantity: number; unit: string; category: string }>,
      tips: (parsed.tips ?? []) as string[],
    };
  });

const LookupInput = z.object({ barcode: z.string().min(6).max(32) });

/** Mapeia as categorias do Open Food Facts para as categorias/seções do Kotiva. */
function mapCategory(raw: string | null): { category: string; section: string } {
  const t = (raw ?? "").toLowerCase();
  const rules: Array<[RegExp, string, string]> = [
    [/limpe|clean|deterg|sabão|desinfet/, "Limpeza", "limpeza"],
    [/higien|shampoo|sabonete|dental|papel/, "Higiene", "limpeza"],
    [/congel|frozen|sorvet/, "Congelados", "congelador"],
    [/carne|meat|frango|peixe|fish|poultry/, "Carnes", "geladeira"],
    [/leite|queijo|iogurt|dairy|cheese|milk|manteig/, "Laticínios", "geladeira"],
    [/bebid|drink|refrig|suco|juice|água|water|cerveja|beverag/, "Bebidas", "geladeira"],
    [/fruta|fruit|verdur|legum|vegetab|salad/, "Hortifruti", "geladeira"],
    [/pão|pães|bread|padar|bakery|bolo/, "Padaria", "despensa"],
    [/doce|chocolat|candy|snack|biscoit|sweet/, "Doces", "despensa"],
    [/pet|dog|cat|ração/, "Pet", "despensa"],
  ];
  for (const [re, category, section] of rules) if (re.test(t)) return { category, section };
  return { category: "Mercearia", section: "despensa" };
}

/**
 * Consulta o Open Food Facts pelo código de barras e alimenta a base
 * compartilhada do Kotiva para que a próxima leitura seja instantânea.
 */
export const lookupBarcode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => LookupInput.parse(input))
  .handler(async ({ data }) => {
    const code = data.barcode.trim();
    const endpoints = [
      `https://br.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`,
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`,
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, { headers: { "User-Agent": "Kotiva/1.0 (kotiva.app)" } });
        if (!res.ok) continue;
        const json = (await res.json()) as {
          status?: number;
          product?: {
            product_name?: string;
            product_name_pt?: string;
            brands?: string;
            quantity?: string;
            categories?: string;
            categories_tags?: string[];
          };
        };
        const p = json.product;
        const name = p?.product_name_pt || p?.product_name;
        if (json.status !== 1 || !name) continue;

        const rawCategory = p?.categories?.split(",")[0]?.trim() ?? p?.categories_tags?.[0] ?? null;
        const { category, section } = mapCategory(`${rawCategory ?? ""} ${p?.categories ?? ""}`);
        const brand = p?.brands?.split(",")[0]?.trim() || null;

        // Alimenta a base compartilhada (sem sobrescrever produtos verificados)
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: existing } = await supabaseAdmin
            .from("product_barcodes")
            .select("id")
            .eq("code", code)
            .maybeSingle();
          if (!existing) {
            await supabaseAdmin.from("product_barcodes").insert({
              code,
              name: name.slice(0, 160),
              brand,
              category,
              section,
              default_unit: "un",
              verified: false,
            });
          }
          await supabaseAdmin
            .from("product_catalog")
            .upsert(
              { barcode: code, name: name.slice(0, 160), brand, category, package: p?.quantity ?? null },
              { onConflict: "barcode" },
            );
        } catch (e) {
          console.error("[lookupBarcode] falha ao salvar na base:", e);
        }

        return { found: true, name, brand, quantity: p?.quantity ?? null, category, section };
      } catch {
        /* tenta o próximo endpoint */
      }
    }
    return { found: false, name: null, brand: null, quantity: null, category: null, section: null };
  });
