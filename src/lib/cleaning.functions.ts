import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callAIJson } from "./ai.server";

export const CLEANING_SYSTEM =
  "Você é o Especialista de Limpeza Kotiva: químico de produtos de limpeza e consultor de higiene doméstica brasileiro. " +
  "Responde sempre em português do Brasil, com base em literatura técnica reconhecida (fichas de segurança FISPQ, ANVISA, CDC, EPA). " +
  "Segurança vem antes de eficiência: NUNCA recomende misturas perigosas (ex.: água sanitária/hipoclorito com amônia, com ácidos como vinagre/limão/ácido muriático, ou com álcool; peróxido com vinagre). " +
  "Só sugira misturas caseiras comprovadamente seguras. Sempre alerte sobre ventilação, EPI, crianças e animais.";

const MixInput = z.object({
  products: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
  context: z.string().trim().max(300).optional(),
});

export type MixAnalysis = {
  risk: "seguro" | "atencao" | "perigoso";
  summary: string;
  reactions: string[];
  gases: string[];
  humanRisks: string[];
  petRisks: string[];
  precautions: string[];
  safeAlternative: string;
  pairs: Array<{ a: string; b: string; risk: "seguro" | "atencao" | "perigoso"; reason: string }>;
};

export const analyzeCleaningMix = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => MixInput.parse(input))
  .handler(async ({ data }) => {
    const prompt = `Analise a compatibilidade química da combinação destes produtos de limpeza domésticos: ${data.products.join(" + ")}.
Contexto de uso: ${data.context || "limpeza doméstica geral"}.

Classifique o risco global como "seguro", "atencao" ou "perigoso".
Explique reações químicas possíveis, gases liberados (ex.: cloramina, cloro gasoso, ácido peracético), riscos para pessoas e animais, e cuidados obrigatórios.
Avalie também cada par de produtos individualmente.
Se a mistura for arriscada, indique uma alternativa segura para o mesmo objetivo.

Responda SOMENTE com JSON válido:
{"risk":"seguro"|"atencao"|"perigoso","summary":string,"reactions":string[],"gases":string[],"humanRisks":string[],"petRisks":string[],"precautions":string[],"safeAlternative":string,"pairs":[{"a":string,"b":string,"risk":"seguro"|"atencao"|"perigoso","reason":string}]}`;

    const parsed = (await callAIJson(prompt, CLEANING_SYSTEM)) as Partial<MixAnalysis>;
    return {
      risk: (parsed.risk ?? "atencao") as MixAnalysis["risk"],
      summary: parsed.summary ?? "Não foi possível analisar com segurança. Não misture os produtos.",
      reactions: parsed.reactions ?? [],
      gases: parsed.gases ?? [],
      humanRisks: parsed.humanRisks ?? [],
      petRisks: parsed.petRisks ?? [],
      precautions: parsed.precautions ?? [],
      safeAlternative: parsed.safeAlternative ?? "",
      pairs: parsed.pairs ?? [],
    } satisfies MixAnalysis;
  });

const TipsInput = z.object({
  surface: z.string().trim().min(1).max(120),
  problem: z.string().trim().max(300).optional(),
  preferHomemade: z.boolean().optional(),
});

export type CleaningGuide = {
  title: string;
  difficulty: string;
  minutes: number;
  materials: string[];
  steps: string[];
  homemadeMix: string;
  avoid: string[];
  warnings: string[];
  sources: string[];
};

export const cleaningTips = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TipsInput.parse(input))
  .handler(async ({ data }) => {
    const prompt = `Monte um guia prático e confiável de limpeza.
Superfície/local/eletrodoméstico: ${data.surface}
Problema específico: ${data.problem || "limpeza e manutenção geral"}
Preferência: ${data.preferHomemade ? "priorizar soluções caseiras seguras" : "pode indicar produtos comerciais comuns no Brasil"}

Inclua materiais, passo a passo numerado, mistura caseira SOMENTE se comprovadamente segura (caso contrário deixe string vazia), o que nunca fazer/misturar, avisos de segurança e fontes técnicas de referência.
Responda SOMENTE com JSON válido:
{"title":string,"difficulty":string,"minutes":number,"materials":string[],"steps":string[],"homemadeMix":string,"avoid":string[],"warnings":string[],"sources":string[]}`;

    const parsed = (await callAIJson(prompt, CLEANING_SYSTEM)) as Partial<CleaningGuide>;
    return {
      title: parsed.title ?? data.surface,
      difficulty: parsed.difficulty ?? "Fácil",
      minutes: Number(parsed.minutes ?? 15),
      materials: parsed.materials ?? [],
      steps: parsed.steps ?? [],
      homemadeMix: parsed.homemadeMix ?? "",
      avoid: parsed.avoid ?? [],
      warnings: parsed.warnings ?? [],
      sources: parsed.sources ?? [],
    } satisfies CleaningGuide;
  });
