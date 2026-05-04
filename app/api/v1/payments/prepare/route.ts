import {NextResponse} from "next/server";
import {preparePayment} from "@/lib/mock-booking-store";

type PrepareBody = {
  reservationId?: number;
  /** 결제위젯 통화. 해외 간편 UI는 USD만 지원합니다. */
  currency?: "KRW" | "USD";
};

export async function POST(request: Request) {
  let body: PrepareBody;
  try {
    body = (await request.json()) as PrepareBody;
  } catch {
    return NextResponse.json(
      {success: false, error: {code: "INVALID_JSON", message: "Invalid request body."}},
      {status: 400}
    );
  }

  if (typeof body.reservationId !== "number") {
    return NextResponse.json(
      {success: false, error: {code: "INVALID_INPUT", message: "reservationId is required."}},
      {status: 400}
    );
  }

  const currency =
    body.currency === "USD" || body.currency === "KRW" ? body.currency : undefined;
  const result = preparePayment(body.reservationId, {currency});
  if (!result) {
    return NextResponse.json(
      {success: false, error: {code: "RESERVATION_NOT_FOUND", message: "Reservation not found."}},
      {status: 400}
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      reservationId: result.reservation.id,
      orderId: result.payment.orderId,
      amount: result.payment.amount,
      currency: result.payment.currency,
      customerName: result.reservation.name
    }
  });
}
