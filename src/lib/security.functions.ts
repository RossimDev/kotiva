import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Rate limiting de rotas sensíveis (login, cadastro).
 * Executado no servidor com service_role — o cliente não consegue burlar a contagem.
 */
const AttemptInput = z.object({
  action: z.enum(["signin", "signup"]),
  email: z.string().trim().email().max(255),
});

export const guardAuthAttempt = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AttemptInput.parse(input))
  .handler(async ({ data }) => {
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const ip =
      getRequestHeader("cf-connecting-ip") ??
      (getRequestHeader("x-forwarded-for") ?? "").split(",")[0]?.trim() ??
      "unknown";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const limits =
      data.action === "signup"
        ? { limit: 5, windowSeconds: 3600 }
        : { limit: 10, windowSeconds: 600 };

    const identifiers = [`email:${data.email.toLowerCase()}`, `ip:${ip}`];
    for (const identifier of identifiers) {
      const { data: allowed, error } = await supabaseAdmin.rpc("check_rate_limit", {
        _bucket: data.action,
        _identifier: identifier,
        _limit: limits.limit,
        _window_seconds: limits.windowSeconds,
      });
      if (error) continue; // falha do limitador nunca bloqueia o usuário legítimo
      if (allowed === false) {
        return {
          allowed: false as const,
          message: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
        };
      }
    }
    return { allowed: true as const, message: "" };
  });
