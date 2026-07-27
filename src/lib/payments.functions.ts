import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MP_PLANS, createMpPreference } from "./payments.server";

const Input = z.object({
  plan: z.enum(["pro", "family"]),
  origin: z.string().url().max(300),
});

export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const plan = MP_PLANS[data.plan];
    const email = (context.claims as { email?: string } | undefined)?.email;
    return createMpPreference(plan, { email, userId: context.userId }, data.origin.replace(/\/$/, ""));
  });
