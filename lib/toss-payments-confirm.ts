const TOSS_CONFIRM_URL = "https://api.tosspayments.com/v1/payments/confirm";

type TossConfirmErrorBody = {
  code?: string;
  message?: string;
};

export async function requestTossPaymentConfirm(params: {
  secretKey: string;
  paymentKey: string;
  orderId: string;
  amount: number;
}) {
  const authorization = `Basic ${Buffer.from(`${params.secretKey}:`).toString("base64")}`;
  const response = await fetch(TOSS_CONFIRM_URL, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      paymentKey: params.paymentKey,
      orderId: params.orderId,
      amount: params.amount
    })
  });

  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const err = json as TossConfirmErrorBody | null;
    return {
      ok: false as const,
      httpStatus: response.status,
      code: typeof err?.code === "string" ? err.code : "TOSS_CONFIRM_HTTP_ERROR",
      message: typeof err?.message === "string" ? err.message : response.statusText
    };
  }

  return {ok: true as const, payment: json};
}

export function getTossSecretKey(): string | undefined {
  return process.env.TOSS_PAYMENTS_SECRET_KEY ?? process.env.TOSS_SECRET_KEY;
}
