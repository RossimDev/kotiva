import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Sparkles, Plus, Trash2, ShieldCheck, ShieldAlert, ShieldX, Loader2, Beaker, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { analyzeCleaningMix, cleaningTips, type CleaningGuide, type MixAnalysis } from "@/lib/cleaning.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/cleaning")({
  head: () => ({ meta: [{ title: "Limpeza IA — Kotiva" }, { name: "robots", content: "noindex" }] }),
  component: Cleaning,
});

const COMMON = [
  "Detergente neutro",
  "Água sanitária",
  "Cloro",
  "Álcool 70%",
  "Vinagre",
  "Amônia",
  "Desengordurante",
  "Bicarbonato de sódio",
  "Sabão em pó",
  "Limpa-vidros",
  "Ácido muriático",
  "Água oxigenada",
  "Removedor de limo",
  "Limpador multiuso",
];

const SURFACES = [
  "Fogão engordurado",
  "Micro-ondas",
  "Geladeira",
  "Piso porcelanato",
  "Vidros e espelhos",
  "Box de banheiro",
  "Vaso sanitário",
  "Móveis de madeira",
  "Sofá de tecido",
  "Panelas com crosta",
  "Azulejo da cozinha",
  "Organização da casa",
];

const RISK = {
  seguro: { label: "Segura", cls: "bg-accent/15 text-accent border-accent/30", Icon: ShieldCheck },
  atencao: { label: "Atenção", cls: "bg-warning/15 text-warning border-warning/30", Icon: ShieldAlert },
  perigoso: { label: "Perigosa", cls: "bg-destructive/15 text-destructive border-destructive/30", Icon: ShieldX },
} as const;

function Cleaning() {
  const { user } = useAuth();
  const analyze = useServerFn(analyzeCleaningMix);
  const tips = useServerFn(cleaningTips);

  const [products, setProducts] = useState<string[]>(["Detergente neutro", "Água sanitária"]);
  const [draft, setDraft] = useState("");
  const [context, setContext] = useState("");
  const [result, setResult] = useState<MixAnalysis | null>(null);
  const [loadingMix, setLoadingMix] = useState(false);

  const [surface, setSurface] = useState("Fogão engordurado");
  const [problem, setProblem] = useState("");
  const [homemade, setHomemade] = useState(true);
  const [guide, setGuide] = useState<CleaningGuide | null>(null);
  const [loadingTip, setLoadingTip] = useState(false);

  const addProduct = (value: string) => {
    const v = value.trim();
    if (!v) return;
    if (products.some((p) => p.toLowerCase() === v.toLowerCase())) return;
    if (products.length >= 20) return toast.error("Máximo de 20 produtos por análise.");
    setProducts([...products, v.slice(0, 80)]);
    setDraft("");
  };

  const runAnalysis = async () => {
    if (products.length < 2) return toast.error("Adicione pelo menos 2 produtos para analisar a mistura.");
    setLoadingMix(true);
    try {
      const res = await analyze({ data: { products, context: context || undefined } });
      setResult(res);
      if (user) {
        await supabase.from("cleaning_analyses").insert({
          user_id: user.id,
          products,
          risk: res.risk,
          summary: res.summary,
          details: JSON.parse(JSON.stringify(res)),
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao analisar");
    } finally {
      setLoadingMix(false);
    }
  };

  const runTips = async () => {
    setLoadingTip(true);
    try {
      setGuide(await tips({ data: { surface, problem: problem || undefined, preferHomemade: homemade } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar guia");
    } finally {
      setLoadingTip(false);
    }
  };

  const Risk = result ? RISK[result.risk] ?? RISK.atencao : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Limpeza IA</h1>
        <p className="text-muted-foreground">Assistente de limpeza doméstica com checagem de segurança química.</p>
      </div>

      <Tabs defaultValue="mix">
        <TabsList>
          <TabsTrigger value="mix"><Beaker className="mr-2 h-4 w-4" /> Modo Compatibilidade</TabsTrigger>
          <TabsTrigger value="tips"><BookOpen className="mr-2 h-4 w-4" /> Dicas de limpeza</TabsTrigger>
        </TabsList>

        <TabsContent value="mix" className="space-y-4">
          <Card className="p-5">
            <Label className="text-xs">Produtos da mistura (sem limite fixo de campos)</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {products.map((p) => (
                <Badge key={p} variant="secondary" className="gap-1 py-1.5 pl-3 pr-1.5">
                  {p}
                  <button onClick={() => setProducts(products.filter((x) => x !== p))} className="rounded p-0.5 hover:bg-background/60" aria-label={`Remover ${p}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </Badge>
              ))}
              {products.length === 0 && <span className="text-sm text-muted-foreground">Nenhum produto adicionado.</span>}
            </div>

            <div className="mt-4 flex gap-2">
              <Input
                value={draft}
                placeholder="Digite um produto e pressione Enter"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addProduct(draft); } }}
              />
              <Button variant="outline" onClick={() => addProduct(draft)}><Plus className="h-4 w-4" /></Button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {COMMON.filter((c) => !products.includes(c)).map((c) => (
                <Button key={c} size="sm" variant="outline" className="h-7 rounded-full text-xs" onClick={() => addProduct(c)}>
                  <Plus className="mr-1 h-3 w-3" /> {c}
                </Button>
              ))}
            </div>

            <div className="mt-4">
              <Label className="text-xs">Onde pretende usar (opcional)</Label>
              <Input value={context} maxLength={300} placeholder="Ex: box do banheiro com limo" onChange={(e) => setContext(e.target.value)} />
            </div>

            <Button className="mt-4 w-full sm:w-auto" onClick={runAnalysis} disabled={loadingMix}>
              {loadingMix ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Analisar compatibilidade
            </Button>
          </Card>

          {result && Risk && (
            <Card className={`border-2 p-5 ${Risk.cls}`}>
              <div className="flex items-center gap-3">
                <Risk.Icon className="h-8 w-8" />
                <div>
                  <div className="font-display text-2xl font-extrabold">Mistura {Risk.label}</div>
                  <p className="text-sm opacity-90">{result.summary}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 text-foreground sm:grid-cols-2">
                <Block title="Reações químicas" items={result.reactions} />
                <Block title="Gases que podem ser liberados" items={result.gases} />
                <Block title="Riscos para pessoas" items={result.humanRisks} />
                <Block title="Riscos para animais" items={result.petRisks} />
                <Block title="Cuidados obrigatórios" items={result.precautions} />
                {result.safeAlternative && (
                  <div className="rounded-xl bg-background/70 p-4">
                    <div className="mb-2 font-display text-sm font-bold">Alternativa segura</div>
                    <p className="text-sm text-muted-foreground">{result.safeAlternative}</p>
                  </div>
                )}
              </div>

              {result.pairs.length > 0 && (
                <div className="mt-4 rounded-xl bg-background/70 p-4 text-foreground">
                  <div className="mb-2 font-display text-sm font-bold">Análise par a par</div>
                  <ul className="space-y-2">
                    {result.pairs.map((p, i) => {
                      const R = RISK[p.risk] ?? RISK.atencao;
                      return (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <R.Icon className="mt-0.5 h-4 w-4 shrink-0" />
                          <span><strong>{p.a} + {p.b}:</strong> {p.reason}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </Card>
          )}

          <p className="text-xs text-muted-foreground">
            Nunca misture água sanitária com amônia, ácidos (vinagre, limão, ácido muriático) ou álcool. Em caso de exposição, ventile o ambiente e procure atendimento médico.
          </p>
        </TabsContent>

        <TabsContent value="tips" className="space-y-4">
          <Card className="grid gap-3 p-5 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Superfície, cômodo ou eletrodoméstico</Label>
              <Input value={surface} maxLength={120} onChange={(e) => setSurface(e.target.value)} />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SURFACES.map((s) => (
                  <Button key={s} size="sm" variant="outline" className="h-7 rounded-full text-xs" onClick={() => setSurface(s)}>{s}</Button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Problema (gordura, crosta, mancha, mofo...)</Label>
                <Textarea rows={3} maxLength={300} value={problem} onChange={(e) => setProblem(e.target.value)} placeholder="Ex: crosta de gordura queimada na boca do fogão" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={homemade} onCheckedChange={setHomemade} id="homemade" />
                <Label htmlFor="homemade" className="text-sm">Priorizar soluções caseiras seguras</Label>
              </div>
              <Button onClick={runTips} disabled={loadingTip}>
                {loadingTip ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Gerar guia
              </Button>
            </div>
          </Card>

          {guide && (
            <Card className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl font-bold">{guide.title}</h2>
                <Badge variant="secondary">{guide.difficulty}</Badge>
                <Badge variant="outline">{guide.minutes} min</Badge>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Block title="Materiais" items={guide.materials} />
                <Block title="Nunca faça" items={guide.avoid} />
              </div>
              <div className="mt-4">
                <div className="mb-2 font-display text-sm font-bold">Passo a passo</div>
                <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
                  {guide.steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              </div>
              {guide.homemadeMix && (
                <p className="mt-4 rounded-lg bg-accent/10 p-3 text-sm">
                  <strong>Mistura caseira segura:</strong> {guide.homemadeMix}
                </p>
              )}
              {guide.warnings.length > 0 && (
                <div className="mt-4 rounded-lg bg-warning/10 p-3 text-sm">
                  <strong>Avisos de segurança</strong>
                  <ul className="mt-1 list-disc pl-5">{guide.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
                </div>
              )}
              {guide.sources.length > 0 && (
                <p className="mt-4 text-xs text-muted-foreground">Fontes de referência: {guide.sources.join(" • ")}</p>
              )}
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="rounded-xl bg-background/70 p-4">
      <div className="mb-2 font-display text-sm font-bold">{title}</div>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {items.map((t, i) => <li key={i}>{t}</li>)}
      </ul>
    </div>
  );
}
