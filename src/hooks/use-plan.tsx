import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type PlanId = "free" | "pro" | "family";

export type Subscription = {
  plan: PlanId;
  status: string;
  provider: string;
  current_period_end: string | null;
  updated_at: string | null;
};

type PlanCtx = {
  plan: PlanId;
  subscription: Subscription | null;
  isPremium: boolean;
  loading: boolean;
  refresh: () => void;
};

const Ctx = createContext<PlanCtx>({ plan: "free", subscription: null, isPremium: false, loading: true, refresh: () => {} });

export const PLAN_LABEL: Record<PlanId, string> = { free: "Grátis", pro: "Pro", family: "Família" };

/** Abas liberadas no plano gratuito. */
export const FREE_ROUTES = ["/app/dashboard", "/app/items", "/app/shopping", "/app/soon", "/app/plan", "/app/profile", "/app/settings", "/app/notifications"];

export function PlanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    supabase
      .from("subscriptions")
      .select("plan,status,provider,current_period_end,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        setSubscription((data as Subscription | null) ?? null);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const active =
    !!subscription &&
    subscription.status === "active" &&
    (subscription.plan === "pro" || subscription.plan === "family") &&
    (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date());

  return (
    <Ctx.Provider
      value={{
        plan: active ? subscription!.plan : "free",
        subscription,
        isPremium: active,
        loading,
        refresh,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const usePlan = () => useContext(Ctx);
