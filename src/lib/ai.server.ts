const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

export async function callAIJson(prompt: string, system?: string) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        { role: "user", content: prompt },
      ],
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
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
}

export const NUTRI_SYSTEM =
  "Você é o Cozinheiro Kotiva: chef profissional e nutricionista clínico brasileiro. Suas respostas são práticas, seguras, econômicas e sempre em português do Brasil. Você calcula estimativas nutricionais realistas por porção e respeita rigorosamente restrições alimentares e alergias informadas.";
