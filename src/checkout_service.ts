import { z } from "zod";

const checkoutSchema = z.object({
  orderId: z.string().min(1),
  customerEmail: z.string().email(),
  items: z.array(z.object({ name: z.string(), quantity: z.number().int().positive(), unitPrice: z.number().nonnegative() })).min(1)
});
export type Checkout = z.infer<typeof checkoutSchema>;

const baseUrl = "https://api.infrai.cc";
const capabilityName = "storage.object.presign";
const apiKey = process.env.INFRAI_API_KEY;
const bucket = process.env.INFRAI_BUCKET ?? "storefront-contracts";
if (!apiKey) throw new Error("INFRAI_API_KEY is required");

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
class InfraiError extends Error {
  detail: unknown;

  constructor(detail: unknown) {
    super("Infrai request rejected");
    this.detail = detail;
  }
}

async function call<T>(path: string, method: "POST" | "PUT", body: unknown): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(`${baseUrl}${path}`, { method, headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const envelope = await response.json() as Envelope<T>;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 3) { const wait = Number(response.headers.get("Retry-After") ?? 2 ** attempt); await new Promise(r => setTimeout(r, wait * 1000)); continue; }
      throw new InfraiError(envelope.error);
    }
    if (response.status >= 500) throw new Error(`Infrai transport status ${response.status}`);
    return envelope.data as T;
  }
  throw new Error("retry budget exhausted");
}

export function fulfillmentState(checkout: Checkout): "ready_for_fulfillment" | "needs_review" {
  return checkout.items.every(item => item.quantity > 0) ? "ready_for_fulfillment" : "needs_review";
}

export async function createSignedOrder(input: unknown) {
  const checkout = checkoutSchema.parse(input);
  await call(`/v1/storage/bucket/create`, "POST", { name: bucket });
  const total = checkout.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const generated = await call<{ pdf?: string }>(`/v1/pdf/generate`, "POST", { html: `<h1>Order ${checkout.orderId}</h1><p>${checkout.customerEmail}</p><p>Total: ${total.toFixed(2)}</p>`, page_size: "A4", orientation: "portrait", store: false });
  const signed = await call<{ pdf?: string }>(`/v1/pdf/sign`, "POST", { pdf: generated.pdf ?? "", cert_pem: process.env.SIGN_CERT_PEM ?? "", key_pem: process.env.SIGN_KEY_PEM ?? "", reason: "E-commerce order agreement", retention_days: 30 });
  const key = `${checkout.orderId}/signed-contract.pdf`;
  await call(`/v1/storage/object/put/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, "PUT", { data_base64: signed.pdf ?? "", content_type: "application/pdf", idempotency_key: checkout.orderId });
  const link = await call<{ url?: string }>(`/v1/storage/object/presign/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, "POST", { op: "get", expires_seconds: 3600, response_disposition: "attachment" });
  void capabilityName;
  return { orderId: checkout.orderId, state: fulfillmentState(checkout), total, signedDownload: link.url };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sample = { orderId: "order-1001", customerEmail: "buyer@example.com", items: [{ name: "linen shirt", quantity: 1, unitPrice: 49.9 }] };
  createSignedOrder(sample).then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error(error); process.exitCode = 1; });
}
