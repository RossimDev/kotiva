import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingCart, ClipboardList, Wallet, BrainCircuit, Bell, User } from "lucide-react";

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
    <div className="min-h-screen bg-[#0F172A] text-[#F8FAFC]">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-[#0F172A]/80 px-6 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <img src="/logo-kotiva.png" alt="Kotiva" className="h-10 w-auto drop-shadow-md" />
          <h1 className="font-display text-xl font-extrabold tracking-tight">Anotar</h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="rounded-full p-2 hover:bg-white/10" aria-label="Notificações"><Bell className="h-5 w-5 text-[#F8FAFC]" /></button>
          <div className="h-9 w-9 overflow-hidden rounded-full ring-2 ring-[#5B4DFF]/40">
            <img src="https://i.pravatar.cc/150?img=12" alt="Guilherme" className="h-full w-full object-cover" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 py-8">
        {/* Card Saldo */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#5B4DFF] via-[#6D48F2] to-[#7C3AED] p-7 shadow-2xl shadow-[#5B4DFF]/30">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-medium text-white/80">Saldo do mês</h2>
              <div className="mt-1 font-display text-4xl font-extrabold tracking-tight text-white">R$ 2.345,67</div>
              <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-white/70">
                <Wallet className="h-3.5 w-3.5" /> Controle financeiro
              </div>
            </div>
            {/* Circular progress */}
            <div className="relative h-20 w-20 shrink-0">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="10" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="#F59E0B" strokeWidth="10" strokeLinecap="round" strokeDasharray="264" strokeDashoffset="60" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="#22C55E" strokeWidth="10" strokeLinecap="round" strokeDasharray="264" strokeDashoffset="100" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="#5B4DFF" strokeWidth="10" strokeLinecap="round" strokeDasharray="264" strokeDashoffset="160" />
              </svg>
            </div>
          </div>
        </section>

        {/* Saudação */}
        <div className="mt-6">
          <h3 className="font-display text-2xl font-bold">Olá, Guilherme! 👋</h3>
          <p className="mt-1 text-sm text-slate-300">Tudo organizado na sua casa.</p>
        </div>

        {/* 4 Botões */}
        <section className="mt-8 grid grid-cols-4 gap-3">
          {[
            { icon: ShoppingCart, label: "Compras", color: "from-[#5B4DFF] to-[#7C3AED]" },
            { icon: ClipboardList, label: "Tarefas", color: "from-[#7C3AED] to-[#5B4DFF]" },
            { icon: Wallet, label: "Finanças", color: "from-[#F59E0B] to-[#F97316]" },
            { icon: BrainCircuit, label: "IA Assistente", color: "from-[#22C55E] to-[#16A34A]" },
          ].map((b) => (
            <Link
              key={b.label}
              to="/app/dashboard"
              className={`flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-br ${b.color} p-4 shadow-lg shadow-black/20 transition-transform hover:-translate-y-1 hover:shadow-xl`}
            >
              <div className="grid h-12 w-12 place-items-center rounded-full bg-white/10 backdrop-blur">
                <b.icon className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs font-semibold text-white">{b.label}</span>
            </Link>
          ))}
        </section>

        {/* Pequeno destaque de marca no final */}
        <div className="mt-10 text-center">
          <img src="/logo-kotiva.png" alt="Kotiva" className="mx-auto h-8 w-auto opacity-80" />
          <p className="mt-2 text-xs text-slate-400">Kotiva — A inteligência completa da sua casa</p>
        </div>
      </main>
    </div>
  );
}
