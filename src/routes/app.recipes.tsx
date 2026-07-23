import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChefHat, Sparkles, Bookmark } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { suggestRecipes } from "@/lib/ai.functions";

type Recipe = { title: string; description: string; ingredients: string[]; steps: string[] };

export const Route = createFileRoute("/app/recipes")({
  head: () => ({ meta: [{ title: "Receitas IA — SmartFridge AI" }, { name: "robots", content: "noindex" }] }),
  component: Recipes,
});

function Recipes() {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const gen = useServerFn(suggestRecipes);

  useEffect(() => {
    supabase.from("fridge_items").select("name").then(({ data }) => setIngredients((data ?? []).map((d) => d.name)));
  }, []);

  const generate = async () => {
    if (ingredients.length === 0) return toast.error("Adicione itens à geladeira primeiro");
    setLoading(true);
    try {
      const res = await gen({ data: { ingredients } });
      setRecipes(res.recipes ?? []);
      if (!res.recipes?.length) toast.error("Não foi possível gerar receitas agora");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na IA");
    } finally { setLoading(false); }
  };

  const save = async (r: Recipe) => {
    const { data: session } = await supabase.auth.getUser();
    if (!session.user) return;
    const { error } = await supabase.from("saved_recipes").insert({
      user_id: session.user.id, title: r.title, description: r.description, ingredients: r.ingredients, steps: r.steps,
    });
    if (error) return toast.error(error.message);
    toast.success("Receita salva!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Receitas com IA</h1>
        <p className="text-muted-foreground">Sugestões baseadas no que você tem em casa.</p>
      </div>

      <Card className="p-6 bg-hero text-primary-foreground shadow-glow">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Sparkles className="h-6 w-6" />
            <h2 className="mt-2 font-display text-xl font-bold">{ingredients.length} ingredientes disponíveis</h2>
            <p className="text-sm opacity-90">Gere 3 receitas personalizadas agora mesmo.</p>
          </div>
          <Button size="lg" variant="secondary" onClick={generate} disabled={loading}>
            {loading ? "Gerando..." : "Gerar receitas"}
          </Button>
        </div>
      </Card>

      {recipes.length === 0 && !loading && (
        <Card className="flex flex-col items-center gap-3 p-16 text-center">
          <ChefHat className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">Clique em "Gerar receitas" para começar.</p>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {recipes.map((r, i) => (
          <Card key={i} className="flex flex-col p-6">
            <h3 className="font-display text-lg font-bold">{r.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
            <div className="mt-4">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Ingredientes</div>
              <ul className="mt-1 list-inside list-disc text-sm">{r.ingredients.map((ing, k) => <li key={k}>{ing}</li>)}</ul>
            </div>
            <div className="mt-4">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Passos</div>
              <ol className="mt-1 list-inside list-decimal space-y-1 text-sm">{r.steps.map((s, k) => <li key={k}>{s}</li>)}</ol>
            </div>
            <Button variant="outline" size="sm" className="mt-auto pt-4" onClick={() => save(r)}>
              <Bookmark className="mr-2 h-4 w-4" /> Salvar
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
