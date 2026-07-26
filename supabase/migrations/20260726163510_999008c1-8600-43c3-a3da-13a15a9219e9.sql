
CREATE TABLE public.shopping_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text,
  budget numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_lists TO authenticated;
GRANT ALL ON public.shopping_lists TO service_role;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own shopping lists" ON public.shopping_lists FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER shopping_lists_updated BEFORE UPDATE ON public.shopping_lists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.shopping_items
  ADD COLUMN list_id uuid REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
  ADD COLUMN category text,
  ADD COLUMN unit_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN barcode text,
  ADD COLUMN notes text;

CREATE TABLE public.meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start date NOT NULL DEFAULT current_date,
  title text NOT NULL DEFAULT 'Cardápio semanal',
  plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plans TO authenticated;
GRANT ALL ON public.meal_plans TO service_role;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own meal plans" ON public.meal_plans FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.kitchen_timers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  seconds integer NOT NULL DEFAULT 300,
  icon text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kitchen_timers TO authenticated;
GRANT ALL ON public.kitchen_timers TO service_role;
ALTER TABLE public.kitchen_timers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own timers" ON public.kitchen_timers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.household_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Outros',
  amount numeric NOT NULL DEFAULT 0,
  due_day integer NOT NULL DEFAULT 1,
  due_date date,
  recurring boolean NOT NULL DEFAULT true,
  paid boolean NOT NULL DEFAULT false,
  paid_at date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.household_bills TO authenticated;
GRANT ALL ON public.household_bills TO service_role;
ALTER TABLE public.household_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own bills" ON public.household_bills FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER household_bills_updated BEFORE UPDATE ON public.household_bills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.gas_tanks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Botijão principal',
  capacity_kg numeric NOT NULL DEFAULT 13,
  installed_at date NOT NULL DEFAULT current_date,
  avg_days integer NOT NULL DEFAULT 45,
  price numeric,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gas_tanks TO authenticated;
GRANT ALL ON public.gas_tanks TO service_role;
ALTER TABLE public.gas_tanks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own gas tanks" ON public.gas_tanks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER gas_tanks_updated BEFORE UPDATE ON public.gas_tanks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'inactive',
  provider text NOT NULL DEFAULT 'mercadopago',
  external_id text,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own subscription read" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER subscriptions_updated BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
