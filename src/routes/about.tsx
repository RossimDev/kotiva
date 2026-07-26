import { createFileRoute } from "@tanstack/react-router";
import { Leaf, Users, Sparkles } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Sobre — Kotiva" },
      { name: "description", content: "Conheça a missão do Kotiva: menos desperdício, mais praticidade e uma experiência premium para sua cozinha." },
      { property: "og:title", content: "Sobre o Kotiva" },
      { property: "og:description", content: "Nossa missão é transformar como você cuida dos seus alimentos." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-4xl font-extrabold md:text-5xl">Nossa missão</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        O Kotiva nasceu com um propósito simples: reduzir o desperdício de alimentos e tornar a cozinha do dia a dia mais inteligente, prática e prazerosa.
      </p>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {[
          { icon: Leaf, title: "Sustentável", desc: "Ajudamos você a aproveitar melhor cada ingrediente." },
          { icon: Sparkles, title: "Inteligente", desc: "IA de ponta que sugere receitas personalizadas." },
          { icon: Users, title: "Humano", desc: "Feito para famílias, casais e quem mora sozinho." },
        ].map((v) => (
          <div key={v.title} className="rounded-2xl border border-border bg-card p-6">
            <v.icon className="h-6 w-6 text-primary" />
            <h3 className="mt-3 font-display text-lg font-bold">{v.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{v.desc}</p>
          </div>
        ))}
      </div>
      <div className="mt-12 space-y-4 text-muted-foreground">
        <h2 className="font-display text-2xl font-bold text-foreground">Nossa história</h2>
        <p>Começamos como um pequeno projeto para resolver um problema real: quantas vezes você já jogou comida fora porque esqueceu que estava lá? Hoje, milhares de pessoas usam o Kotiva todos os dias para planejar refeições, controlar validades e cozinhar com o que já têm em casa.</p>
        <p>Combinamos design premium, inteligência artificial e uma experiência acolhedora para transformar sua rotina alimentar.</p>
      </div>
    </div>
  );
}
