/**
 * Lib Asaas exclusiva do Clube de Assinatura.
 * Separada da lib Asaas existente (src/lib/asaas.ts).
 * Opera na conta raiz do LIVO com header asaas-wallet-id para agir
 * em nome da subconta da barbearia (zero armazenamento de apiKey de subconta).
 *
 * Env vars alinhadas com a lib existente:
 *   - ASAAS_KEY: chave da conta raiz (nunca logada, nunca exposta ao client).
 *   - NEXT_PUBLIC_ASAAS_SANDBOX: "true" usa sandbox, caso contrario producao.
 */

const ASAAS_BASE_URL =
  process.env.NEXT_PUBLIC_ASAAS_SANDBOX === "true"
    ? "https://sandbox.asaas.com/api/v3"
    : "https://api.asaas.com/v3";

function getHeaders(walletId?: string): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    access_token: process.env.ASAAS_KEY ?? "",
  };
  if (walletId) {
    headers["asaas-wallet-id"] = walletId;
  }
  return headers;
}

// ---------------------------------------------------------------------------
// Validação de CNPJ com dígitos verificadores (lição VS-4)
// ---------------------------------------------------------------------------

export function validarCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const calc = (d: string, len: number) => {
    let sum = 0;
    let pos = len - 7;
    for (let i = len; i >= 1; i--) {
      sum += parseInt(d[len - i]) * pos--;
      if (pos < 2) pos = 9;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };

  if (calc(digits, 12) !== parseInt(digits[12])) return false;
  if (calc(digits, 13) !== parseInt(digits[13])) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Criar subconta Asaas para a barbearia
// ---------------------------------------------------------------------------

export type CreateSubaccountInput = {
  name: string;
  email: string;
  cnpj: string;
  mobilePhone: string;
};

export type CreateSubaccountResult =
  | { success: true; walletId: string; accountStatus: string }
  | { success: false; error: string };

export async function createAsaasSubaccount(
  input: CreateSubaccountInput
): Promise<CreateSubaccountResult> {
  try {
    const response = await fetch(`${ASAAS_BASE_URL}/accounts`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        name: input.name,
        email: input.email,
        cpfCnpj: input.cnpj,
        mobilePhone: input.mobilePhone,
        companyType: "MEI",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg =
        data?.errors?.[0]?.description ??
        data?.message ??
        "Erro ao criar conta no Asaas.";
      return { success: false, error: msg };
    }

    const walletId: string = data.walletId ?? data.id;
    const accountStatus: string = data.accountStatus ?? "pending";
    return { success: true, walletId, accountStatus };
  } catch (err) {
    console.error("[asaas-clube] createAsaasSubaccount error:", err);
    return { success: false, error: "Erro de conexao com o Asaas." };
  }
}

// ---------------------------------------------------------------------------
// Configurar webhook da subconta
// ---------------------------------------------------------------------------

export type ConfigureWebhookResult =
  | { success: true }
  | { success: false; error: string };

export async function configureClubWebhook(
  walletId: string,
  appBaseUrl: string
): Promise<ConfigureWebhookResult> {
  try {
    const response = await fetch(`${ASAAS_BASE_URL}/webhooks`, {
      method: "POST",
      headers: getHeaders(walletId),
      body: JSON.stringify({
        url: `${appBaseUrl}/api/webhooks/asaas/clube`,
        email: process.env.ASAAS_WEBHOOK_EMAIL ?? "",
        enabled: true,
        interrupted: false,
        authToken: process.env.ASAAS_CLUBE_WEBHOOK_TOKEN ?? "",
        events: [
          "PAYMENT_CONFIRMED",
          "PAYMENT_RECEIVED",
          "PAYMENT_OVERDUE",
          "PAYMENT_DELETED",
          "PAYMENT_REFUNDED",
        ],
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      const msg =
        data?.errors?.[0]?.description ?? "Erro ao configurar webhook.";
      return { success: false, error: msg };
    }

    return { success: true };
  } catch (err) {
    console.error("[asaas-clube] configureClubWebhook error:", err);
    return { success: false, error: "Erro de conexao com o Asaas." };
  }
}

// ---------------------------------------------------------------------------
// Cancelar assinatura no Asaas (Fase E — cancelamento self-service)
// ---------------------------------------------------------------------------

export type CancelSubscriptionResult =
  | { success: true }
  | { success: false; error: string };

export async function cancelAsaasSubscription(
  walletId: string,
  asaasSubscriptionId: string
): Promise<CancelSubscriptionResult> {
  try {
    const response = await fetch(
      `${ASAAS_BASE_URL}/subscriptions/${asaasSubscriptionId}`,
      {
        method: "DELETE",
        headers: getHeaders(walletId),
      }
    );

    if (!response.ok && response.status !== 404) {
      const data = await response.json();
      const msg =
        data?.errors?.[0]?.description ?? "Erro ao cancelar assinatura.";
      return { success: false, error: msg };
    }

    return { success: true };
  } catch (err) {
    console.error("[asaas-clube] cancelAsaasSubscription error:", err);
    return { success: false, error: "Erro de conexao com o Asaas." };
  }
}

// ---------------------------------------------------------------------------
// Criar customer no Asaas (na subconta da barbearia)
// ---------------------------------------------------------------------------

export type CreateCustomerInput = {
  name: string;
  phone: string;
  walletId: string;
};

export type CreateCustomerResult =
  | { success: true; asaasCustomerId: string }
  | { success: false; error: string };

export async function createAsaasCustomer(
  input: CreateCustomerInput
): Promise<CreateCustomerResult> {
  try {
    const response = await fetch(`${ASAAS_BASE_URL}/customers`, {
      method: "POST",
      headers: getHeaders(input.walletId),
      body: JSON.stringify({
        name: input.name,
        mobilePhone: input.phone,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg =
        data?.errors?.[0]?.description ??
        data?.message ??
        "Erro ao criar cliente no Asaas.";
      return { success: false, error: msg };
    }

    return { success: true, asaasCustomerId: data.id };
  } catch (err) {
    console.error("[asaas-clube] createAsaasCustomer error:", err);
    return { success: false, error: "Erro de conexao com o Asaas." };
  }
}

// ---------------------------------------------------------------------------
// Criar assinatura recorrente no Asaas (na subconta da barbearia)
// ---------------------------------------------------------------------------

export type CreateAsaasSubscriptionInput = {
  walletId: string;
  asaasCustomerId: string;
  priceInCents: number;
  planName: string;
};

export type CreateAsaasSubscriptionResult =
  | { success: true; asaasSubscriptionId: string; checkoutUrl: string }
  | { success: false; error: string };

export async function createAsaasRecurringSubscription(
  input: CreateAsaasSubscriptionInput
): Promise<CreateAsaasSubscriptionResult> {
  try {
    // Próximo vencimento = amanhã (Asaas exige data futura)
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 1);
    const dueDateStr = nextDueDate.toISOString().split("T")[0];

    const response = await fetch(`${ASAAS_BASE_URL}/subscriptions`, {
      method: "POST",
      headers: getHeaders(input.walletId),
      body: JSON.stringify({
        customer: input.asaasCustomerId,
        billingType: "CREDIT_CARD",
        value: input.priceInCents / 100,
        nextDueDate: dueDateStr,
        cycle: "MONTHLY",
        description: input.planName,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg =
        data?.errors?.[0]?.description ??
        data?.message ??
        "Erro ao criar assinatura no Asaas.";
      return { success: false, error: msg };
    }

    // URL de checkout para o cliente inserir o cartão
    const checkoutUrl: string =
      data.bankSlipUrl ?? data.invoiceUrl ?? data.paymentLink ?? "";

    return {
      success: true,
      asaasSubscriptionId: data.id,
      checkoutUrl,
    };
  } catch (err) {
    console.error("[asaas-clube] createAsaasRecurringSubscription error:", err);
    return { success: false, error: "Erro de conexao com o Asaas." };
  }
}
