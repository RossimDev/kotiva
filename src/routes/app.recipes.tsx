import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChefHat, Sparkles, Bookmark, CalendarDays, Flame, Clock, Users, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { suggestRecipes, generateMealPlan, type AiRecipe, type MealPlanDay } from "@/lib/ai.functions";
import { DIET_OPTIONS, GOAL_OPTIONS, isoDate } from "@/lib/kotiva";

export const Route = createFileRoute("/app/recipes")({
  head: () => ({ meta: [{ title: "Cozinheiro IA — Kotiva" }, { name: "robots", content: "noindex" }] }),
  component: Recipes,
});

function Recipes() {
  const { user } = useAuth();
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<AiRecipe[]>([]);
  const [plan, setPlan] = useState<{ summary: string; days: MealPlanDay[]; shoppingList: Array<{ name: string; quantity: number; unit: string; category: string }>; tips: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [prefs, setPrefs] = useState({ diet: "nenhuma", goal: "equilibrio", allergies: "", people: "2", maxMinutes: "45", calorieTarget: "2000" });

  const gen = useServerFn(suggestRecipes);
  const genPlan = useServerFn(generateMealPlan);

  useEffect(() => {
    supabase.from("fridge_items").select("name").then(({ data }) => setIngredients((data ?? []).map((d) => d.name)));
  }, []);

  const base = useMemo(
    () => ({
      ingredients: ingredients.length ? ingredients : ["arroz", "feijão", "ovos"],
      diet: prefs.diet,
      goal: prefs.goal,
      allergies: prefs.allergies,
      people: Number(prefs.people) || 2,
      maxMinutes: Number(prefs.maxMinutes) || 45,
    }),
    [ingredients, prefs],
  );

  const generate = async () => {
    setLoading(true);
    try {
      const res = await gen({ data: base });
      setRecipes(res.recipes ?? []);
      if (!res.recipes?.length) toast.error("Não foi possível gerar receitas agora");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na IA");
    } finally {
      setLoading(false);
    }
  };

  const buildPlan = async () => {
    setPlanLoading(true);
    try {
      const res = await genPlan({ data: { ...base, calorieTarget: Number(prefs.calorieTarget) || 2000 } });
      setPlan(res);
      if (user && res.days?.length) {
        await supabase.from("meal_plans").insert({ user_id: user.id, week_start: isoDate(new Date()), plan: JSON.parse(JSON.stringify(res)) });
      }
      toast.success("Cardápio de 7 dias pronto!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na IA");
    } finally {
      setPlanLoading(false);
    }
  };

  const save = async (r: AiRecipe) => {
    if (!user) return;
    const { error } = await supabase.from("saved_recipes").insert({
      user_id: user.id,
      title: r.title,
      description: r.description,
      ingredients: r.ingredients,
      steps: r.steps,
    });
    if (error) return toast.error(error.message);
    toast.success("Receita salva!");
  };

  const sendPlanToShopping = async () => {
    if (!user || !plan?.shoppingList?.length) return;
    const { data: list } = await supabase
      .from("shopping_lists")
      .insert({ user_id: user.id, name: `Cardápio ${new Date().toLocaleDateString("pt-BR")}` })
      .select("id")
      .single();
    const { error } = await supabase.from("shopping_items").insert(
      plan.shoppingList.map((s) => ({
        user_id: user.id,
        list_id: list?.id ?? null,
        name: s.name,
        quantity: s.quantity || 1,
        unit: s.unit || "un",
        category: s.category || "Outros",
      })),
    );
    if (error) return toast.error(error.message);
    toast.success("Lista de compras criada!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Cozinheiro IA</h1>
        <p className="text-muted-foreground">Chef e nutricionista virtual, usando o que você já tem em casa.</p>
      </div>

      <Card className="grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6">
        <div>
          <Label className="text-xs">Dieta</Label>
          <Select value={prefs.diet} onValueChange={(v) => setPrefs({ ...prefs, diet: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{DIET_OPTIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Objetivo</Label>
          <Select value={prefs.goal} onValueChange={(v) => setPrefs({ ...prefs, goal: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{GOAL_OPTIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Pessoas</Label>
          <Input type="number" min="1" value={prefs.people} onChange={(e) => setPrefs({ ...prefs, people: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Tempo máx. (min)</Label>
          <Input type="number" min="5" value={prefs.maxMinutes} onChange={(e) => setPrefs({ ...prefs, maxMinutes: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Meta kcal/dia</Label>
          <Input type="number" min="800" value={prefs.calorieTarget} onChange={(e) => setPrefs({ ...prefs, calorieTarget: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Alergias</Label>
          <Input placeholder="Ex: amendoim" value={prefs.allergies} onChange={(e) => setPrefs({ ...prefs, allergies: e.target.value })} />
        </div>
      </Card>

      <Tabs defaultValue="recipes">
        <TabsList>
          <TabsTrigger value="recipes"><ChefHat className="mr-2 h-4 w-4" /> Receitas</TabsTrigger>
          <TabsTrigger value="plan"><CalendarDays className="mr-2 h-4 w-4" /> Cardápio 7 dias</TabsTrigger>
        </TabsList>

        <TabsContent value="recipes" className="space-y-6 pt-4">
          <Card className="flex flex-wrap items-center justify-between gap-4 bg-hero p-6 text-primary-foreground shadow-glow">
            <div>
              <Sparkles className="h-6 w-6" />
              <h2 className="mt-2 font-display text-xl font-bold">{ingredients.length} ingredientes disponíveis</h2>
              <p className="text-sm opacity-90">Receitas com informações nutricionais completas.</p>
            </div>
            <Button size="lg" variant="secondary" onClick={generate} disabled={loading}>
              {loading ? "Gerando..." : "Gerar receitas"}
            </Button>
          </Card>

          {recipes.length === 0 && !loading && (
            <Card className="flex flex-col items-center gap-3 p-16 text-center">
              <ChefHat className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">Ajuste suas preferências e clique em "Gerar receitas".</p>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recipes.map((r, i) => (
              <Card key={i} className="flex flex-col p-6">
                <h3 className="font-display text-lg font-bold">{r.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />{r.minutes} min</Badge>
                  <Badge variant="secondary"><Users className="mr-1 h-3 w-3" />{r.servings} porções</Badge>
                  <Badge variant="secondary">{r.difficulty}</Badge>
                </div>
                {r.nutrition && (
                  <div className="mt-4 grid grid-cols-4 gap-2 rounded-xl bg-muted/50 p-3 text-center text-xs">
                    <div><div className="font-display text-base font-bold">{r.nutrition.calories}</div>kcal</div>
                    <div><div className="font-display text-base font-bold">{r.nutrition.protein}g</div>prot</div>
                    <div><div className="font-display text-base font-bold">{r.nutrition.carbs}g</div>carb</div>
                    <div><div className="font-display text-base font-bold">{r.nutrition.fat}g</div>gord</div>
                  </div>
                )}
                <div className="mt-4">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Ingredientes</div>
                  <ul className="mt-1 list-inside list-disc text-sm">{r.ingredients?.map((ing, k) => <li key={k}>{ing}</li>)}</ul>
                </div>
                <div className="mt-4">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Modo de preparo</div>
                  <ol className="mt-1 list-inside list-decimal space-y-1 text-sm">{r.steps?.map((s, k) => <li key={k}>{s}</li>)}</ol>
                </div>
                {r.tips?.length ? (
                  <div className="mt-4 rounded-lg bg-accent/10 p-3 text-sm">
                    <div className="text-xs font-semibold uppercase text-accent">Dicas do nutricionista</div>
                    <ul className="mt-1 list-inside list-disc">{r.tips.map((t, k) => <li key={k}>{t}</li>)}</ul>
                  </div>
                ) : null}
                <Button variant="outline" size="sm" className="mt-6" onClick={() => save(r)}>
                  <Bookmark className="mr-2 h-4 w-4" /> Salvar receita
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="plan" className="space-y-6 pt-4">
          <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <h2 className="font-display text-xl font-bold">Cardápio completo de 7 dias</h2>
              <p className="text-sm text-muted-foreground">Café, almoço, lanche e jantar com metas nutricionais.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={buildPlan} disabled={planLoading} className="shadow-glow">
                {planLoading ? "Montando..." : "Gerar cardápio"}
              </Button>
              {plan?.shoppingList?.length ? (
                <Button variant="outline" onClick={sendPlanToShopping}>
                  <ShoppingCart className="mr-2 h-4 w-4" /> Criar lista de compras
                </Button>
              ) : null}
            </div>
          </Card>

          {plan?.summary && <Card className="p-5 text-sm">{plan.summary}</Card>}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {plan?.days?.map((d, i) => (
              <Card key={i} className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold">{d.day}</h3>
                  <Badge variant="secondary"><Flame className="mr-1 h-3 w-3" />{d.calories} kcal</Badge>
                </div>
                <dl className="mt-3 space-y-2 text-sm">
                  <div><dt className="text-xs uppercase text-muted-foreground">Café</dt><dd>{d.breakfast}</dd></div>
                  <div><dt className="text-xs uppercase text-muted-foreground">Almoço</dt><dd>{d.lunch}</dd></div>
                  <div><dt className="text-xs uppercase text-muted-foreground">Lanche</dt><dd>{d.snack}</dd></div>
                  <div><dt className="text-xs uppercase text-muted-foreground">Jantar</dt><dd>{d.dinner}</dd></div>
                </dl>
                <div className="mt-3 text-xs text-muted-foreground">Proteína: {d.protein}g</div>
              </Card>
            ))}
          </div>

          {plan?.tips?.length ? (
            <Card className="p-5">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Orientações</div>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm">{plan.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
