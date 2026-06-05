// src/lib/asaas.ts
const ASAAS_BASE_URL =
  process.env.NEXT_PUBLIC_ASAAS_SANDBOX === "true"
    ? "https://sandbox.asaas.com/api/v3"
    : "https://api.asaas.com/v3";

const ASAAS_KEY = process.env.ASAAS_KEY ?? "";

async function asaasRequest<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: object,
): Promise<T> {
  const response = await fetch(`${ASAAS_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      access_token: ASAAS_KEY,
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

export async function createAsaasSubscription(data: {
  customerId: string;
  value: number;
  nextDueDate: string;
  description: string;
  cycle?: "MONTHLY" | "YEARLY";
}): Promise<AsaasSubscription> {
  return asaasRequest("POST", "/subscriptions", {
    customer: data.customerId,
    billingType: "UNDEFINED",
    value: data.value,
    nextDueDate: data.nextDueDate,
    cycle: data.cycle ?? "MONTHLY",
    description: data.description,
  });
}

export async function getSubscriptionPayments(
  subscriptionId: string,
): Promise<{ data: AsaasCharge[] }> {
  return asaasRequest("GET", `/subscriptions/${subscriptionId}/payments`);
}

export async function getChargePixQrCode(
  chargeId: string,
): Promise<{ encodedImage: string; payload: string; expirationDate: string }> {
  return asaasRequest("GET", `/payments/${chargeId}/pixQrCode`);
}

export async function cancelAsaasSubscription(
  subscriptionId: string,
): Promise<void> {
  await asaasRequest("DELETE", `/subscriptions/${subscriptionId}`);
}
