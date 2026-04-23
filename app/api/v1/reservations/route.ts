import {NextResponse} from "next/server";
import {createReservation} from "@/lib/mock-booking-store";

type ReservationBody = {
  locale?: string;
  name?: string;
  contactType?: "phone" | "email";
  contact?: string;
  visitDate?: string;
  visitTime?: string;
};

export async function POST(request: Request) {
  let body: ReservationBody;
  try {
    body = (await request.json()) as ReservationBody;
  } catch {
    return NextResponse.json(
      {success: false, error: {code: "INVALID_JSON", message: "Invalid request body."}},
      {status: 400}
    );
  }

  const requiredValid =
    body.locale &&
    body.name &&
    body.contact &&
    body.visitDate &&
    body.visitTime &&
    (body.contactType === "phone" || body.contactType === "email");

  if (!requiredValid) {
    return NextResponse.json(
      {success: false, error: {code: "INVALID_INPUT", message: "Required fields are missing."}},
      {status: 400}
    );
  }

  const reservation = createReservation({
    locale: body.locale,
    name: body.name,
    contactType: body.contactType,
    contact: body.contact,
    visitDate: body.visitDate,
    visitTime: body.visitTime
  });

  return NextResponse.json({
    success: true,
    data: {
      reservationId: reservation.id,
      reservationNo: reservation.reservationNo,
      status: reservation.status
    }
  });
}
