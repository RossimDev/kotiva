import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Kotiva" },
      { name: "description", content: "Termos e condições para uso do Kotiva." },
      { property: "og:title", content: "Termos de Uso" },
      { property: "og:description", content: "Condições de uso da plataforma Kotiva." },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-4xl font-extrabold">Termos de Uso</h1>
      <p className="mt-2 text-muted-foreground">Última atualização: 23 de julho de 2026</p>
      <div className="mt-8 space-y-6 text-muted-foreground">
        <section><h2 className="font-display text-2xl font-bold text-foreground">1. Aceitação</h2><p>Ao usar o Kotiva, você concorda com estes termos.</p></section>
        <section><h2 className="font-display text-2xl font-bold text-foreground">2. Uso da conta</h2><p>Você é responsável por manter suas credenciais em segurança e por todas as atividades realizadas em sua conta.</p></section>
        <section><h2 className="font-display text-2xl font-bold text-foreground">3. Conteúdo gerado por IA</h2><p>Sugestões de receitas são geradas por IA e servem como referência. Verifique sempre restrições alimentares antes de preparar.</p></section>
        <section><h2 className="font-display text-2xl font-bold text-foreground">4. Assinaturas</h2><p>Assinaturas pagas são renovadas automaticamente e podem ser canceladas a qualquer momento nas configurações da conta.</p></section>
        <section><h2 className="font-display text-2xl font-bold text-foreground">5. Limitação de responsabilidade</h2><p>Fornecemos o serviço "como está". Não nos responsabilizamos por decisões alimentares tomadas com base em sugestões da IA.</p></section>
      </div>
    </article>
  );
}
