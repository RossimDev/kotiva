import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callAIJson } from "./ai.server";

export const PET_SYSTEM =
  "Você é o Assistente Pet Kotiva, com formação em nutrição animal. Responde em português do Brasil com estimativas conservadoras baseadas em diretrizes reconhecidas (FEDIAF, AAFCO, NRC). " +
  "Você SEMPRE deixa explícito que são apenas estimativas e que a orientação do médico-veterinário prevalece. Nunca prescreve medicamentos.";

const PetInput = z.object({
  name: z.string().trim().min(1).max(60),
  species: z.string().trim().min(1).max(40),
  breed: z.string().trim().max(60).optional(),
  weightKg: z.number().min(0.02).max(120),
  size: z.string().trim().max(30).optional(),
  ageMonths: z.number().int().min(0).max(360).optional(),
  sex: z.string().trim().max(20).optional(),
  notes: z.string().trim().max(300).optional(),
});

export type PetPlan = {
  dailyGrams: number;
  mealsPerDay: number;
  gramsPerMeal: number;
  waterMl: number;
  calories: number;
  foodType: string;
  schedule: string[];
  care: string[];
  warnings: string[];
};

export const petFeedingPlan = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => PetInput.parse(input))
  .handler(async ({ data }) => {
    const prompt = `Estime um plano alimentar diário para o animal:
Nome: ${data.name}
Espécie: ${data.species}
Raça: ${data.breed || "não informada"}
Peso: ${data.weightKg} kg
Porte: ${data.size || "não informado"}
Idade: ${data.ageMonths ?? "não informada"} meses
Sexo: ${data.sex || "não informado"}
Observações: ${data.notes || "nenhuma"}

Calcule a necessidade energética (RER/MER quando aplicável) e converta em gramas de ração seca de qualidade média, número de refeições por dia, gramas por refeição e consumo de água estimado em ml.
Inclua horários sugeridos, cuidados gerais e avisos (sempre lembrando que é estimativa e que o veterinário deve ser consultado).
Responda SOMENTE com JSON válido:
{"dailyGrams":number,"mealsPerDay":number,"gramsPerMeal":number,"waterMl":number,"calories":number,"foodType":string,"schedule":string[],"care":string[],"warnings":string[]}`;

    const parsed = (await callAIJson(prompt, PET_SYSTEM)) as Partial<PetPlan>;
    return {
      dailyGrams: Number(parsed.dailyGrams ?? 0),
      mealsPerDay: Number(parsed.mealsPerDay ?? 2),
      gramsPerMeal: Number(parsed.gramsPerMeal ?? 0),
      waterMl: Number(parsed.waterMl ?? 0),
      calories: Number(parsed.calories ?? 0),
      foodType: parsed.foodType ?? "",
      schedule: parsed.schedule ?? [],
      care: parsed.care ?? [],
      warnings: parsed.warnings ?? [],
    } satisfies PetPlan;
  });
