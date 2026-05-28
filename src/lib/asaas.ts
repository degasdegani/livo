// ============================================================
// LIVO — Cliente Asaas
// Wrapper para a API de pagamentos Asaas
// Sandbox: https://sandbox.asaas.com/api/v3
// Produção: https://api.asaas.com/v3
// ============================================================

const ASAAS_BASE_URL =
  process.env.NEXT_PUBLIC_ASAAS_SANDBOX === "true"
    ? "https://sandbox.asaas.com/api/v3"
    : "https://api.asaas.com/v3";

const ASAAS_API_KEY = process.env.ASAAS_API_KEY!;

// ── Cliente HTTP básico ───────────────────────────────────────
async function asaasRequest<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: object,
): Promise<T> {
  const response = await fetch(`${ASAAS_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      access_token: ASAAS_API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error("[Asaas] Erro:", error);
    throw new Error(`Asaas API error: ${response.status}`);
  }

  return response.json();
}

// ── Tipos ─────────────────────────────────────────────────────
export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
}

export interface AsaasCharge {
  id: string;
  status: string;
  value: number;
  dueDate: string;
  invoiceUrl: string;
  pixQrCode?: {
    encodedImage: string;
    payload: string;
    expirationDate: string;
  };
}

export interface AsaasSubscription {
  id: string;
  status: string;
  value: number;
  nextDueDate: string;
  customer: string;
}

// ── Criar cliente ─────────────────────────────────────────────
export async function createAsaasCustomer(data: {
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
}): Promise<AsaasCustomer> {
  return asaasRequest("POST", "/customers", {
    name: data.name,
    email: data.email,
    cpfCnpj: data.cpfCnpj.replace(/\D/g, ""),
    mobilePhone: data.phone,
  });
}

// ── Criar assinatura ──────────────────────────────────────────
// A cobrança só começa após o trial (nextDueDate = trialEndsAt)
export async function createAsaasSubscription(data: {
  customerId: string;
  value: number; // em reais (97.00)
  nextDueDate: string; // "YYYY-MM-DD" — primeiro vencimento
  description: string;
}): Promise<AsaasSubscription> {
  return asaasRequest("POST", "/subscriptions", {
    customer: data.customerId,
    billingType: "UNDEFINED", // cliente escolhe PIX ou cartão
    value: data.value,
    nextDueDate: data.nextDueDate,
    cycle: "MONTHLY",
    description: data.description,
  });
}

// ── Buscar cobranças da assinatura ────────────────────────────
export async function getSubscriptionPayments(
  subscriptionId: string,
): Promise<{ data: AsaasCharge[] }> {
  return asaasRequest("GET", `/subscriptions/${subscriptionId}/payments`);
}

// ── Buscar cobrança com PIX ────────────────────────────────────
export async function getChargePixQrCode(
  chargeId: string,
): Promise<{ encodedImage: string; payload: string; expirationDate: string }> {
  return asaasRequest("GET", `/payments/${chargeId}/pixQrCode`);
}

// ── Cancelar assinatura ───────────────────────────────────────
export async function cancelAsaasSubscription(
  subscriptionId: string,
): Promise<void> {
  await asaasRequest("DELETE", `/subscriptions/${subscriptionId}`);
}
