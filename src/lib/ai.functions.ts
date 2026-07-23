import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const RecipeSchema = z.object({
  ingredients: z.array(z.string().min(1).max(80)).min(1).max(30),
});

export const suggestRecipes = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RecipeSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const prompt = `Você é um chef criativo. Com base APENAS nos ingredientes disponíveis abaixo, sugira 3 receitas práticas em português.
Ingredientes: ${data.ingredients.join(", ")}

Responda SOMENTE com JSON válido no formato:
{ "recipes": [ { "title": string, "description": string, "ingredients": string[], "steps": string[] } ] }`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) throw new Error("Muitas solicitações. Tente novamente em alguns segundos.");
      if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
      throw new Error(`Erro na IA: ${text}`);
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content ?? "{}";
    try {
      const parsed = JSON.parse(content);
      return parsed as { recipes: Array<{ title: string; description: string; ingredients: string[]; steps: string[] }> };
    } catch {
      return { recipes: [] };
    }
  });
