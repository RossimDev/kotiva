import { useCanGoBack, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/** Botão de voltar. Usa o histórico quando possível, com destino de fallback. */
export function BackButton({ fallbackTo = "/app/dashboard", className }: { fallbackTo?: string; className?: string }) {
  const router = useRouter();
  const canGoBack = useCanGoBack();

  return (
    <button
      type="button"
      aria-label="Voltar"
      onClick={() => {
        if (canGoBack) router.history.back();
        else router.navigate({ to: fallbackTo });
      }}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  );
}
