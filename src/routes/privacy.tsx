import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Kotiva" },
      { name: "description", content: "Saiba como o Kotiva coleta, usa e protege seus dados pessoais." },
      { property: "og:title", content: "Política de Privacidade" },
      { property: "og:description", content: "Como cuidamos dos seus dados no Kotiva." },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <article className="prose prose-neutral dark:prose-invert mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-4xl font-extrabold">Política de Privacidade</h1>
      <p className="text-muted-foreground">Última atualização: 23 de julho de 2026</p>
      <h2 className="mt-8 font-display text-2xl font-bold">1. Dados coletados</h2>
      <p className="text-muted-foreground">Coletamos apenas os dados necessários para oferecer nossos serviços: e-mail, nome, itens cadastrados na sua geladeira e listas de compras.</p>
      <h2 className="mt-6 font-display text-2xl font-bold">2. Uso dos dados</h2>
      <p className="text-muted-foreground">Usamos seus dados para gerar receitas personalizadas, enviar alertas de validade e melhorar continuamente o produto.</p>
      <h2 className="mt-6 font-display text-2xl font-bold">3. Compartilhamento</h2>
      <p className="text-muted-foreground">Nunca vendemos seus dados. Compartilhamos apenas com processadores de pagamento (Mercado Pago) e infraestrutura (Lovable Cloud).</p>
      <h2 className="mt-6 font-display text-2xl font-bold">4. Seus direitos</h2>
      <p className="text-muted-foreground">Você pode acessar, corrigir ou excluir seus dados a qualquer momento na página de Configurações.</p>
      <h2 className="mt-6 font-display text-2xl font-bold">5. Contato</h2>
      <p className="text-muted-foreground">Dúvidas? Escreva para privacidade@kotiva.ai</p>
    </article>
  );
}
