
REVOKE ALL ON FUNCTION public.seed_default_categories(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seed_default_categories(uuid) TO service_role;
