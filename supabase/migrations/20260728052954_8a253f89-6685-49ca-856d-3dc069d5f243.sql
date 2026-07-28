
CREATE TABLE public.pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  species text NOT NULL DEFAULT 'cachorro',
  breed text,
  weight_kg numeric,
  size text,
  age_months integer,
  sex text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pets TO authenticated;
GRANT ALL ON public.pets TO service_role;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own pets" ON public.pets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER pets_updated_at BEFORE UPDATE ON public.pets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.pet_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'alimentacao',
  title text NOT NULL,
  time_of_day time,
  due_date date,
  repeat_rule text NOT NULL DEFAULT 'diario',
  active boolean NOT NULL DEFAULT true,
  last_done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pet_reminders TO authenticated;
GRANT ALL ON public.pet_reminders TO service_role;
ALTER TABLE public.pet_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own pet reminders" ON public.pet_reminders FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER pet_reminders_updated_at BEFORE UPDATE ON public.pet_reminders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.cleaning_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  products jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk text NOT NULL DEFAULT 'seguro',
  summary text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cleaning_analyses TO authenticated;
GRANT ALL ON public.cleaning_analyses TO service_role;
ALTER TABLE public.cleaning_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own cleaning analyses" ON public.cleaning_analyses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.product_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode text NOT NULL UNIQUE,
  name text NOT NULL,
  brand text,
  category text,
  package text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.product_catalog TO authenticated;
GRANT ALL ON public.product_catalog TO service_role;
ALTER TABLE public.product_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Catalog readable by authenticated" ON public.product_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "Catalog insert by authenticated" ON public.product_catalog FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by AND length(name) BETWEEN 1 AND 160 AND length(barcode) BETWEEN 6 AND 32);
CREATE POLICY "Catalog update by owner" ON public.product_catalog FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE TRIGGER product_catalog_updated_at BEFORE UPDATE ON public.product_catalog FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.gas_tanks ADD COLUMN IF NOT EXISTS emptied_at date;
ALTER TABLE public.kitchen_timers ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.kitchen_timers ADD COLUMN IF NOT EXISTS sound text;
