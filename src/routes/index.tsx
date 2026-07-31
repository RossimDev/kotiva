import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kotiva — A inteligência completa da sua casa" },
      { name: "description", content: "Finanças, refeições, tarefas e organização da casa em um só app inteligente, elegante e feito para você." },
      { property: "og:title", content: "Kotiva — A inteligência completa da sua casa" },
      { property: "og:description", content: "Tudo organizado na sua casa. Controle financeiro, compras, tarefas e IA assistente." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F8FAFC] flex flex-col items-center justify-center px-6 py-16">
      <div className="flex flex-col items-center text-center max-w-lg">
        <img src="/logo-kotiva.png" alt="Kotiva" className="h-24 w-auto drop-shadow-[0_0_60px_rgba(91,77,255,0.4)] mb-8" />
        <h1 className="font-display text-5xl md:text-7xl font-extrabold leading-tight tracking-tight">
          KOTIVA <span className="text-[#5B4DFF]">.</span>
        </h1>
        <p className="mt-5 text-lg text-slate-300 leading-relaxed">
          Finanças, refeições, tarefas e organização da casa — tudo inteligente, elegante e feito para você.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Button asChild size="lg" className="shadow-glow bg-[#5B4DFF] hover:bg-[#4B3DE8] text-white">
            <Link to="/auth" search={{ mode: "signup" }}>Começar agora <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10 hover:text-white">
            <Link to="/app/dashboard">Painel</Link>
          </Button>
        </div>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
          <Sparkles className="h-3.5 w-3.5 text-[#F59E0B]" /> Powered by IA
        </div>
      </div>
    </div>
  );
}
