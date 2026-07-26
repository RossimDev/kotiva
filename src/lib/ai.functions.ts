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

export const lookupBarcode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => LookupInput.parse(input))
  .handler(async ({ data }) => {
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(data.barcode)}.json`, {
        headers: { "User-Agent": "Kotiva/1.0" },
      });
      if (res.ok) {
        const json = (await res.json()) as { status?: number; product?: { product_name?: string; product_name_pt?: string; quantity?: string; categories?: string } };
        const name = json.product?.product_name_pt || json.product?.product_name;
        if (json.status === 1 && name) {
          return { found: true, name, quantity: json.product?.quantity ?? null, category: json.product?.categories?.split(",")[0]?.trim() ?? null };
        }
      }
    } catch {
      /* segue para fallback */
    }
    return { found: false, name: null, quantity: null, category: null };
  });
