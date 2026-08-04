import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type Ctx = { supabase: SupabaseClient<Database>; userId: string };

async function assertAdmin(context: Ctx) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (data !== true) throw new Error("Acesso restrito a administradores");
}

/** Limite de ações administrativas por admin (mitiga abuso/força bruta). */
async function guardAdminRate(userId: string, bucket: string, limit = 30) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("check_rate_limit", {
    _bucket: `admin:${bucket}`,
    _identifier: userId,
    _limit: limit,
    _window_seconds: 300,
  });
  if (!error && data === false) throw new Error("Muitas ações em pouco tempo. Aguarde e tente novamente.");
}

/** Registro de auditoria para ações administrativas sensíveis. */
async function audit(input: {
  actorId: string;
  actorEmail: string | null;
  action: string;
  targetEmail?: string | null;
  targetUserId?: string | null;
  details?: Record<string, unknown>;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("admin_audit_log").insert({
    actor_id: input.actorId,
    actor_email: input.actorEmail,
    action: input.action,
    target_email: input.targetEmail ?? null,
    target_user_id: input.targetUserId ?? null,
    details: (input.details ?? {}) as never,
  });
}

/** Verificação server-side de acesso admin (usada para bloquear a rota /app/admin). */
export const verifyAdminAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: data === true };
  });


export type AdminStats = {
  users: number;
  newUsers7d: number;
  admins: number;
  activeSubscriptions: number;
  fridgeItems: number;
  shoppingItems: number;
  recipes: number;
  pets: number;
  barcodes: number;
  messages: number;
  recent: Array<{ email: string; createdAt: string; lastSignInAt: string | null }>;
  signupsByDay: Array<{ day: string; count: number }>;
};

export const getAdminStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminStats> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: userList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const users = userList?.users ?? [];
    const now = Date.now();
    const week = 7 * 86400000;

    const head = { count: "exact" as const, head: true };
    const [fridge, shopping, recipesQ, petsQ, barcodesQ, messagesQ, adminsQ, subsQ] =
      await Promise.all([
        supabaseAdmin.from("fridge_items").select("id", head),
        supabaseAdmin.from("shopping_items").select("id", head),
        supabaseAdmin.from("saved_recipes").select("id", head),
        supabaseAdmin.from("pets").select("id", head),
        supabaseAdmin.from("product_barcodes").select("id", head),
        supabaseAdmin.from("contact_messages").select("id", head),
        supabaseAdmin.from("user_roles").select("id", head).eq("role", "admin"),
        supabaseAdmin.from("subscriptions").select("id", head).eq("status", "active"),
      ]);
    const fridgeItems = fridge.count ?? 0;
    const shoppingItems = shopping.count ?? 0;
    const recipes = recipesQ.count ?? 0;
    const pets = petsQ.count ?? 0;
    const barcodes = barcodesQ.count ?? 0;
    const messages = messagesQ.count ?? 0;
    const admins = adminsQ.count ?? 0;
    const activeSubscriptions = subsQ.count ?? 0;

    const signups = new Map<string, number>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now - i * 86400000).toISOString().slice(0, 10);
      signups.set(d, 0);
    }
    for (const u of users) {
      const day = (u.created_at ?? "").slice(0, 10);
      if (signups.has(day)) signups.set(day, (signups.get(day) ?? 0) + 1);
    }

    return {
      users: users.length,
      newUsers7d: users.filter((u) => u.created_at && now - new Date(u.created_at).getTime() < week)
        .length,
      admins,
      activeSubscriptions,
      fridgeItems,
      shoppingItems,
      recipes,
      pets,
      barcodes,
      messages,
      recent: users
        .slice()
        .sort(
          (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
        )
        .slice(0, 12)
        .map((u) => ({
          email: u.email ?? "—",
          createdAt: u.created_at ?? "",
          lastSignInAt: u.last_sign_in_at ?? null,
        })),
      signupsByDay: [...signups.entries()].map(([day, c]) => ({ day: day.slice(5), count: c })),
    };
  });

export const listAdmins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: roles }, { data: userList }, { data: invites }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin"),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      supabaseAdmin.from("admin_invites").select("email,created_at").order("created_at"),
    ]);
    const byId = new Map((userList?.users ?? []).map((u) => [u.id, u.email ?? ""]));
    return {
      admins: (roles ?? []).map((r) => ({
        userId: r.user_id,
        email: byId.get(r.user_id) ?? "(conta removida)",
      })),
      invites: (invites ?? []).map((i) => ({ email: i.email, createdAt: i.created_at })),
    };
  });

const EmailInput = z.object({ email: z.string().trim().email().max(255) });

export const grantAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EmailInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();

    await supabaseAdmin
      .from("admin_invites")
      .upsert({ email, invited_by: context.userId }, { onConflict: "email" });

    const { data: userList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const target = (userList?.users ?? []).find((u) => (u.email ?? "").toLowerCase() === email);
    if (!target)
      return {
        ok: true,
        pending: true,
        message:
          "E-mail autorizado. O acesso admin será aplicado assim que a pessoa criar a conta.",
      };

    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: target.id, role: "admin" },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);
    return { ok: true, pending: false, message: "Acesso de administrador concedido." };
  });

export const revokeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EmailInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();

    const { data: userList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const target = (userList?.users ?? []).find((u) => (u.email ?? "").toLowerCase() === email);
    if (target?.id === context.userId) throw new Error("Você não pode remover seu próprio acesso.");

    await supabaseAdmin.from("admin_invites").delete().eq("email", email);
    if (target)
      await supabaseAdmin.from("user_roles").delete().eq("user_id", target.id).eq("role", "admin");
    return { ok: true };
  });
