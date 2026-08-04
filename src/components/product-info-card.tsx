import { Barcode, Check, Package, Tag, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/kotiva";
import type { BarcodeProduct } from "@/lib/barcode";

const SECTION_LABEL: Record<string, string> = {
  geladeira: "Geladeira",
  congelador: "Congelador",
  despensa: "Despensa",
  limpeza: "Limpeza",
};

/** Card com as informações do produto identificado pela leitura do código. */
export function ProductInfoCard({
  product,
  onDismiss,
}: {
  product: BarcodeProduct;
  onDismiss: () => void;
}) {
  const found = product.source !== "none" && !!product.name;

  return (
    <Card className="relative animate-fade-in border-primary/40 bg-primary/5 p-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={onDismiss}
        aria-label="Fechar informações do produto"
        className="absolute right-2 top-2 h-7 w-7"
      >
        <X className="h-4 w-4" />
      </Button>
      <div className="flex items-start gap-3 pr-8">
        <div className="rounded-lg bg-primary/15 p-2">
          <Package className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-base font-bold">
              {found ? product.name : "Produto não encontrado"}
            </span>
            {found && (
              <Badge variant="secondary" className="gap-1">
                <Check className="h-3 w-3" />
                {product.source === "base" ? "Base Kotiva" : "Base pública"}
              </Badge>
            )}
          </div>
          {product.brand && <div className="text-xs text-muted-foreground">{product.brand}</div>}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline" className="gap-1">
              <Barcode className="h-3 w-3" />
              {product.code}
            </Badge>
            {found && (
              <>
                <Badge variant="outline" className="gap-1">
                  <Tag className="h-3 w-3" />
                  {product.category}
                </Badge>
                <Badge variant="outline">{SECTION_LABEL[product.section] ?? product.section}</Badge>
                <Badge variant="outline">Unidade: {product.unit}</Badge>
              </>
            )}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {product.lastPrice != null ? (
              <>
                Último preço pago: <strong>{brl(product.lastPrice)}</strong>
                {product.lastPurchasedAt
                  ? ` em ${new Date(product.lastPurchasedAt).toLocaleDateString("pt-BR")}`
                  : ""}
              </>
            ) : found ? (
              "Sem histórico de preço para este produto."
            ) : (
              "Preencha o nome e salve — o produto entra na base para as próximas leituras."
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
