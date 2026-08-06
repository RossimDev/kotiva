import { createHash, randomInt } from "crypto";

/** Gera um código numérico aleatório de exatamente 5 dígitos. */
export function generateCode(): string {
  return String(randomInt(0, 100000)).padStart(5, "0");
}

/** Hash do código — nunca armazenamos o código em texto puro. */
export function hashCode(code: string, destination: string): string {
  return createHash("sha256")
    .update(`${destination.toLowerCase()}::${code}::kotiva`)
    .digest("hex");
}

export const CODE_TTL_MINUTES = 10;

const PURPOSE_LABEL: Record<string, string> = {
  signup: "confirmar seu cadastro no Kotiva",
  password_reset: "redefinir sua senha do Kotiva",
};

/** Envia o código por e-mail (Resend). */
export async function sendEmailCode(to: string, code: string, purpose: string) {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    throw new Error(
      "O envio de e-mails ainda não está configurado. Peça ao administrador para cadastrar a chave RESEND_API_KEY.",
    );
  }
  const from = process.env["RESEND_FROM"] ?? "Kotiva <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `${code} é o seu código Kotiva`,
      html: `<div style="font-family:system-ui,sans-serif;background:#0d0b18;padding:32px;color:#fff;border-radius:16px">
        <h1 style="font-size:20px;margin:0 0 8px">Seu código Kotiva</h1>
        <p style="color:#c4b5fd;margin:0 0 24px">Use o código abaixo para ${PURPOSE_LABEL[purpose] ?? "continuar"}.</p>
        <div style="font-size:40px;letter-spacing:12px;font-weight:800;background:#1c1630;padding:16px 24px;border-radius:12px;text-align:center">${code}</div>
        <p style="color:#a1a1aa;font-size:13px;margin-top:24px">O código expira em ${CODE_TTL_MINUTES} minutos. Se não foi você, ignore este e-mail.</p>
        <p style="color:#a1a1aa;font-size:13px">Se a mensagem não chegar, verifique sua caixa de spam.</p>
      </div>`,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[verification] Resend falhou [${res.status}]: ${body}`);
    throw new Error("Não foi possível enviar o e-mail agora. Tente novamente em instantes.");
  }
}
