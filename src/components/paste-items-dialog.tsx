import { useState } from "react";
import { ClipboardPaste, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UNITS } from "@/lib/units";
import { parseItemsText, type ParsedItem } from "@/lib/parse-items";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: string;
  saving?: boolean;
  onConfirm: (items: ParsedItem[]) => void | Promise<void>;
};

export function PasteItemsDialog({
  open,
  onOpenChange,
  title = "Colar e separar produtos",
  saving,
  onConfirm,
}: Props) {
  const [text, setText] = useState("");
  const [items, setItems] = useState<ParsedItem[]>([]);

  const parse = (value: string) => {
    setText(value);
    setItems(parseItemsText(value));
  };

  const update = (idx: number, patch: Partial<ParsedItem>) =>
    setItems((cur) => cur.map((i, n) => (n === idx ? { ...i, ...patch } : i)));

  const close = (v: boolean) => {
    onOpenChange(v);
    if (!v) {
      setText("");
      setItems([]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="h-5 w-5" /> {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">Cole aqui o texto (conversa, lista, mensagem...)</Label>
            <Textarea
              rows={5}
              autoFocus
              placeholder={"Ex: 2 leites, arroz, 3 maçãs\n1kg de carne\ndetergente"}
              value={text}
              onChange={(e) => parse(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Reconhecemos quantidades e unidades automaticamente. Sem quantidade, assumimos 1
              unidade.
            </p>
          </div>

          {items.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Wand2 className="h-4 w-4 text-primary" /> Prévia ({items.length} produto
                  {items.length > 1 ? "s" : ""})
                </span>
                <Button variant="ghost" size="sm" onClick={() => setItems([])}>
                  Limpar
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((i, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 items-center gap-2 rounded-lg border border-border p-2"
                  >
                    <Input
                      className="col-span-6"
                      value={i.name}
                      onChange={(e) => update(idx, { name: e.target.value })}
                    />
                    <Input
                      className="col-span-2"
                      type="number"
                      min="0"
                      step="0.01"
                      value={i.quantity}
                      onChange={(e) =>
                        update(idx, { quantity: Number(e.target.value) || 1, hasQuantity: true })
                      }
                    />
                    <Select value={i.unit} onValueChange={(v) => update(idx, { unit: v })}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map((u) => (
                          <SelectItem key={u.value} value={u.value}>
                            {u.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="col-span-1"
                      aria-label={`Remover ${i.name}`}
                      onClick={() => setItems((cur) => cur.filter((_, n) => n !== idx))}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    {!i.hasQuantity && (
                      <Badge variant="secondary" className="col-span-12 w-fit text-[10px]">
                        Quantidade não informada — assumido 1
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Cancelar
          </Button>
          <Button disabled={items.length === 0 || saving} onClick={() => onConfirm(items)}>
            {saving ? "Salvando..." : `Adicionar ${items.length || ""} item(ns)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
