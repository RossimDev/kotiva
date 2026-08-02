CREATE TABLE public.user_chart_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope text NOT NULL,
  colors jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, scope)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_chart_colors TO authenticated;
GRANT ALL ON public.user_chart_colors TO service_role;

ALTER TABLE public.user_chart_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own chart colors" ON public.user_chart_colors
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_user_chart_colors_updated_at
  BEFORE UPDATE ON public.user_chart_colors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.has_premium(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND status = 'active'
      AND plan IN ('pro','family')
      AND (current_period_end IS NULL OR current_period_end > now())
  ) OR public.has_role(_user_id, 'admin')
$$;

DROP POLICY IF EXISTS "Own bills" ON public.household_bills;
CREATE POLICY "Own bills premium" ON public.household_bills
  FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.has_premium(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_premium(auth.uid()));

DROP POLICY IF EXISTS "Own gas tanks" ON public.gas_tanks;
CREATE POLICY "Own gas tanks premium" ON public.gas_tanks
  FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.has_premium(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_premium(auth.uid()));

DROP POLICY IF EXISTS "Own timers" ON public.kitchen_timers;
CREATE POLICY "Own timers premium" ON public.kitchen_timers
  FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.has_premium(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_premium(auth.uid()));

DROP POLICY IF EXISTS "Own meal plans" ON public.meal_plans;
CREATE POLICY "Own meal plans premium" ON public.meal_plans
  FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.has_premium(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_premium(auth.uid()));

DROP POLICY IF EXISTS "Own recipes" ON public.saved_recipes;
CREATE POLICY "Own recipes premium" ON public.saved_recipes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.has_premium(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_premium(auth.uid()));

DROP POLICY IF EXISTS "Own pets" ON public.pets;
CREATE POLICY "Own pets premium" ON public.pets
  FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.has_premium(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_premium(auth.uid()));

DROP POLICY IF EXISTS "Own pet reminders" ON public.pet_reminders;
CREATE POLICY "Own pet reminders premium" ON public.pet_reminders
  FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.has_premium(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_premium(auth.uid()));

DROP POLICY IF EXISTS "Own cleaning analyses" ON public.cleaning_analyses;
CREATE POLICY "Own cleaning analyses premium" ON public.cleaning_analyses
  FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.has_premium(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_premium(auth.uid()));