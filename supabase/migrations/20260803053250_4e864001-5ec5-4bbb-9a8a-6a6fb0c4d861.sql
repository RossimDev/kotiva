-- 1. Base compartilhada de códigos de barras
CREATE TABLE public.product_barcodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  brand text,
  category text NOT NULL DEFAULT 'Outros',
  section text NOT NULL DEFAULT 'despensa',
  default_unit text NOT NULL DEFAULT 'un',
  verified boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.product_barcodes TO authenticated;
GRANT ALL ON public.product_barcodes TO service_role;
ALTER TABLE public.product_barcodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Barcodes readable by authenticated" ON public.product_barcodes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Barcodes insert by authenticated" ON public.product_barcodes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND length(code) BETWEEN 6 AND 40 AND length(name) BETWEEN 1 AND 160);
CREATE POLICY "Barcodes update by owner or admin" ON public.product_barcodes FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER product_barcodes_updated BEFORE UPDATE ON public.product_barcodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX product_barcodes_code_idx ON public.product_barcodes (code);

-- 2. Convites de administrador
CREATE TABLE public.admin_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_invites TO authenticated;
GRANT ALL ON public.admin_invites TO service_role;
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin invites visible to admins" ON public.admin_invites FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- novos cadastros com e-mail convidado viram admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)), NEW.raw_user_meta_data->>'avatar_url');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  IF EXISTS (SELECT 1 FROM public.admin_invites WHERE lower(email) = lower(NEW.email)) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  PERFORM public.seed_default_categories(NEW.id);
  RETURN NEW;
END;
$function$;

INSERT INTO public.admin_invites (email) VALUES ('guilhermehrossim@gmail.com') ON CONFLICT DO NOTHING;
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE lower(email) = 'guilhermehrossim@gmail.com'
ON CONFLICT DO NOTHING;

-- 3. Presets de listas de compras
CREATE TABLE public.shopping_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_presets TO authenticated;
GRANT ALL ON public.shopping_presets TO service_role;
ALTER TABLE public.shopping_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own shopping presets" ON public.shopping_presets FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER shopping_presets_updated BEFORE UPDATE ON public.shopping_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Histórico de compras (para sugestões)
CREATE TABLE public.purchase_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  normalized_name text NOT NULL,
  category text,
  quantity numeric NOT NULL DEFAULT 1,
  unit text DEFAULT 'un',
  unit_price numeric NOT NULL DEFAULT 0,
  purchased_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.purchase_history TO authenticated;
GRANT ALL ON public.purchase_history TO service_role;
ALTER TABLE public.purchase_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own purchase history" ON public.purchase_history FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX purchase_history_user_idx ON public.purchase_history (user_id, normalized_name, purchased_at DESC);

-- 5. Base inicial de produtos de mercado
INSERT INTO public.product_barcodes (code, name, brand, category, section, default_unit, verified) VALUES
('7891000100103','Leite Condensado 395g','Moça','Mercearia','despensa','un',true),
('7891000053508','Leite Ninho Integral 400g','Ninho','Laticínios','despensa','un',true),
('7891910000197','Açúcar Refinado 1kg','União','Mercearia','despensa','kg',true),
('7891910000201','Arroz Branco Tipo 1 5kg','Tio João','Mercearia','despensa','kg',true),
('7896006711124','Feijão Carioca 1kg','Camil','Mercearia','despensa','kg',true),
('7891149101009','Óleo de Soja 900ml','Liza','Mercearia','despensa','un',true),
('7896102500103','Macarrão Espaguete 500g','Renata','Mercearia','despensa','un',true),
('7891000315507','Café Torrado e Moído 500g','Nescafé','Mercearia','despensa','un',true),
('7622300861308','Biscoito Recheado Chocolate','Oreo','Doces','despensa','un',true),
('7891962057014','Chocolate ao Leite 90g','Lacta','Doces','despensa','un',true),
('7891008103007','Achocolatado em Pó 400g','Nescau','Doces','despensa','un',true),
('7891000244203','Bombom Sortido 251g','Garoto','Doces','despensa','un',true),
('7894900011517','Refrigerante Cola 2L','Coca-Cola','Bebidas','geladeira','un',true),
('7891991010924','Refrigerante Guaraná 2L','Guaraná Antarctica','Bebidas','geladeira','un',true),
('7891000100202','Suco de Laranja 1L','Del Valle','Bebidas','geladeira','un',true),
('7891910000924','Água Mineral 1,5L','Crystal','Bebidas','despensa','un',true),
('7891025200130','Leite Integral 1L','Italac','Laticínios','geladeira','un',true),
('7891000100301','Iogurte Natural 170g','Nestlé','Laticínios','geladeira','un',true),
('7891000053607','Requeijão Cremoso 200g','Catupiry','Laticínios','geladeira','un',true),
('7896004400105','Queijo Mussarela Fatiado 150g','Tirolez','Laticínios','geladeira','un',true),
('7891000100400','Manteiga com Sal 200g','Aviação','Laticínios','geladeira','un',true),
('7896036090114','Presunto Cozido Fatiado 200g','Sadia','Carnes','geladeira','un',true),
('7891515000103','Linguiça Toscana 700g','Perdigão','Carnes','geladeira','kg',true),
('7891515002107','Peito de Frango Congelado 1kg','Sadia','Carnes','congelador','kg',true),
('7896102501001','Hambúrguer Bovino Congelado 672g','Seara','Congelados','congelador','un',true),
('7891000101100','Pizza Congelada Mussarela','Sadia','Congelados','congelador','un',true),
('7896066300108','Pão de Forma Tradicional 500g','Pullman','Padaria','despensa','un',true),
('7891000100509','Ovos Brancos 12 unidades','Granja','Hortifruti','geladeira','un',true),
('7891000100608','Banana Prata (kg)','Hortifruti','Hortifruti','geladeira','kg',true),
('7891000100707','Tomate (kg)','Hortifruti','Hortifruti','geladeira','kg',true),
('7891000100806','Batata Inglesa (kg)','Hortifruti','Hortifruti','despensa','kg',true),
('7894650009017','Detergente Líquido Neutro 500ml','Ypê','Limpeza','limpeza','un',true),
('7891022100014','Sabão em Pó 1kg','Omo','Limpeza','limpeza','kg',true),
('7891035100017','Amaciante Concentrado 2L','Downy','Limpeza','limpeza','un',true),
('7896098900017','Água Sanitária 2L','Qboa','Limpeza','limpeza','un',true),
('7891024100015','Desinfetante Lavanda 500ml','Veja','Limpeza','limpeza','un',true),
('7894900700015','Esponja Multiuso Dupla Face','Scotch-Brite','Limpeza','limpeza','un',true),
('7891008130010','Papel Higiênico Folha Dupla 12un','Neve','Higiene','limpeza','un',true),
('7891150000018','Sabonete Hidratante 90g','Dove','Higiene','limpeza','un',true),
('7891024130012','Creme Dental 90g','Colgate','Higiene','limpeza','un',true),
('7891150064010','Shampoo Hidratação 350ml','Seda','Higiene','limpeza','un',true),
('7891150000117','Desodorante Aerosol 150ml','Rexona','Higiene','limpeza','un',true),
('7896029011010','Ração Seca para Cães Adultos 10kg','Pedigree','Pet','despensa','kg',true),
('7896029012017','Ração Seca para Gatos 1kg','Whiskas','Pet','despensa','kg',true)
ON CONFLICT (code) DO NOTHING;