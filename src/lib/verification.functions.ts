import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Verificação por código numérico de 5 dígitos (e-mail ou SMS).
 * Todo o fluxo roda no servidor: o código é gerado, enviado e conferido
 * com hash — o cliente nunca recebe o valor nem consegue ler a tabela.
 */

const ChannelSchema = z.enum(["email", "sms"]);
const PurposeSchema = z.enum(["signup", "password_reset"]);

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{7,14}$/, "Informe o celular com DDD e código do país (ex: +5511999999999)");

const RequestInput = z.object({
  purpose: PurposeSchema,
  channel: ChannelSchema,
  email: z.string().trim().email().max(255),
  phone: phoneSchema.optional(),
  name: z.string().trim().min(1).max(80).optional(),
  password: z.string().min(6).max(72).optional(),
});

const ConfirmInput = z.object({
  purpose: PurposeSchema,
  email: z.string().trim().email().max(255),
  code: z.string().trim().regex(/^\d{5}$/, "O código tem 5 dígitos"),
  newPassword: z.string().min(6).max(72).optional(),
});

type AdminClient = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

async function findUserByEmail(admin: AdminClient, email: string) {
  const target = email.toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) return null;
    const found = data.users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (found) return found;
    if (data.users.length < 200) return null;
  }
  return null;
}

export const requestVerificationCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RequestInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { generateCode, hashCode, sendEmailCode, sendSmsCode, CODE_TTL_MINUTES } = await import(
      "./verification.server"
    );

    if (data.channel === "sms" && !data.phone) {
      throw new Error("Informe o número de celular para receber o código por SMS.");
    }

    const email = data.email.toLowerCase();

    // Limite de envios por destino (anti-abuso)
    const { data: allowed } = await supabaseAdmin.rpc("check_rate_limit", {
      _bucket: `verify_${data.purpose}`,
      _identifier: `dest:${data.channel === "sms" ? data.phone : email}`,
      _limit: 5,
      _window_seconds: 900,
    });
    if (allowed === false) {
      throw new Error("Muitos códigos enviados. Aguarde alguns minutos e tente novamente.");
    }

    let existing = await findUserByEmail(supabaseAdmin, email);

    if (data.purpose === "signup") {
      if (existing?.email_confirmed_at) {
        throw new Error("Já existe uma conta com este e-mail. Faça login.");
      }
      if (!existing) {
        if (!data.password || !data.name) throw new Error("Dados de cadastro incompletos.");
        const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: data.password,
          email_confirm: false,
          user_metadata: { display_name: data.name, pending_phone: data.phone ?? null },
        });
        if (error) throw new Error(error.message);
        existing = created.user;
      } else if (data.password) {
        await supabaseAdmin.auth.admin.updateUserById(existing.id, { password: data.password });
      }
    } else if (!existing) {
      // Não revelamos se o e-mail existe
      return { sent: true, channel: data.channel, ttlMinutes: 10 };
    }

    const code = generateCode();
    const destination = data.channel === "sms" ? data.phone! : email;

    await supabaseAdmin
      .from("verification_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("destination", destination)
      .eq("purpose", data.purpose)
      .is("consumed_at", null);

    const { error: insertError } = await supabaseAdmin.from("verification_codes").insert({
      channel: data.channel,
      destination,
      purpose: data.purpose,
      code_hash: hashCode(code, destination),
      expires_at: new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString(),
      meta: { email, user_id: existing?.id ?? null, phone: data.phone ?? null },
    });
    if (insertError) throw new Error("Não foi possível gerar o código. Tente novamente.");

    if (data.channel === "sms") await sendSmsCode(destination, code, data.purpose);
    else await sendEmailCode(destination, code, data.purpose);

    return { sent: true, channel: data.channel, ttlMinutes: CODE_TTL_MINUTES };
  });

export const confirmVerificationCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ConfirmInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { hashCode } = await import("./verification.server");

    const email = data.email.toLowerCase();
    const { data: rows } = await supabaseAdmin
      .from("verification_codes")
      .select("*")
      .eq("purpose", data.purpose)
      .is("consumed_at", null)
      .contains("meta", { email })
      .order("created_at", { ascending: false })
      .limit(1);

    const row = rows?.[0];
    if (!row) throw new Error("Código inválido ou expirado. Solicite um novo.");
    if (new Date(row.expires_at).getTime() < Date.now()) {
      throw new Error("Código expirado. Solicite um novo.");
    }
    if (row.attempts >= 5) throw new Error("Muitas tentativas. Solicite um novo código.");

    if (hashCode(data.code, row.destination) !== row.code_hash) {
      await supabaseAdmin
        .from("verification_codes")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      throw new Error("Código incorreto.");
    }

    await supabaseAdmin
      .from("verification_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id);

    const meta = (row.meta ?? {}) as { user_id?: string | null; phone?: string | null };
    const userId = meta.user_id;
    if (!userId) throw new Error("Conta não encontrada para este código.");

    if (data.purpose === "signup") {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email_confirm: true,
        user_metadata: { verified_channel: row.channel, phone_number: meta.phone ?? null },
      });
      if (error) throw new Error(error.message);
      return { verified: true as const };
    }

    if (!data.newPassword) throw new Error("Informe a nova senha.");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: data.newPassword,
    });
    if (error) throw new Error(error.message);
    return { verified: true as const };
  });
