import {NextResponse} from "next/server";
import {confirmPayment} from "@/lib/mock-booking-store";
import {getTossSecretKey, requestTossPaymentConfirm} from "@/lib/toss-payments-confirm";

type ConfirmBody = {
  reservationId?: number;
  orderId?: string;
  paymentKey?: string;
  amount?: number;
};

export async function POST(request: Request) {
  let body: ConfirmBody;
  try {
    body = (await request.json()) as ConfirmBody;
  } catch {
    return NextResponse.json(
      {success: false, error: {code: "INVALID_JSON", message: "Invalid request body."}},
      {status: 400}
    );
  }

  if (
    typeof body.reservationId !== "number" ||
    !body.orderId ||
    !body.paymentKey ||
    typeof body.amount !== "number"
  ) {
    return NextResponse.json(
      {success: false, error: {code: "INVALID_INPUT", message: "Missing required fields."}},
      {status: 400}
    );
  }

  const secretKey = getTossSecretKey();

  if (secretKey) {
    const toss = await requestTossPaymentConfirm({
      secretKey,
      paymentKey: body.paymentKey,
      orderId: body.orderId,
      amount: body.amount
    });

    if (!toss.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: toss.code,
            message: toss.message
          }
        },
        {status: toss.httpStatus >= 400 && toss.httpStatus < 600 ? toss.httpStatus : 502}
      );
    }
  }

  const result = confirmPayment({
    reservationId: body.reservationId,
    orderId: body.orderId,
    paymentKey: body.paymentKey,
    amount: body.amount
  });

  if (!result.ok) {
    const status = result.reason === "AMOUNT_MISMATCH" ? 409 : 404;
    const code = result.reason === "AMOUNT_MISMATCH" ? "PAYMENT_AMOUNT_MISMATCH" : "NOT_FOUND";
    return NextResponse.json({success: false, error: {code, message: "Payment confirmation failed."}}, {status});
  }

  return NextResponse.json({
    success: true,
    data: {
      reservationId: result.reservation.id,
      reservationStatus: result.reservation.status,
      paymentStatus: result.payment.status,
      approvedAt: result.payment.approvedAt,
      confirmMode: secretKey ? ("toss" as const) : ("mock" as const)
    }
  });
}
