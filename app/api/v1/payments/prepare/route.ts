import {NextResponse} from "next/server";
import {preparePayment} from "@/lib/mock-booking-store";

type PrepareBody = {
  reservationId?: number;
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

  const result = preparePayment(body.reservationId);
  if (!result) {
    return NextResponse.json(
      {success: false, error: {code: "RESERVATION_NOT_FOUND", message: "Reservation not found."}},
      {status: 404}
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      reservationId: result.reservation.id,
      orderId: result.payment.orderId,
      amount: result.payment.amount,
      customerName: result.reservation.name
    }
  });
}
