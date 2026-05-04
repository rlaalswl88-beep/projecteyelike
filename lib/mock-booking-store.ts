type ContactType = "phone" | "email";
type ReservationStatus = "PENDING_PAYMENT" | "CONFIRMED" | "PAYMENT_FAILED";
type PaymentStatus = "READY" | "DONE" | "FAILED";

export type ReservationRecord = {
  id: number;
  reservationNo: string;
  locale: string;
  name: string;
  contactType: ContactType;
  contact: string;
  visitDate: string;
  visitTime: string;
  visitDatetime: string;
  status: ReservationStatus;
  createdAt: string;
};

export type PaymentCurrency = "KRW" | "USD";

export type PaymentRecord = {
  orderId: string;
  reservationId: number;
  amount: number;
  currency: PaymentCurrency;
  status: PaymentStatus;
  paymentKey?: string;
  approvedAt?: string;
};

type CreateReservationInput = {
  locale: string;
  name: string;
  contactType: ContactType;
  contact: string;
  visitDate: string;
  visitTime: string;
};

const DEPOSIT_KRW = 20000;
const reservations = new Map<number, ReservationRecord>();
const payments = new Map<string, PaymentRecord>();
let reservationSequence = 1000;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function buildReservationNo(now: Date, id: number) {
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  return `ELK-${date}-${String(id).padStart(4, "0")}`;
}

export function createReservation(input: CreateReservationInput) {
  reservationSequence += 1;
  const now = new Date();
  const visitDatetime = `${input.visitDate}T${input.visitTime}:00+09:00`;

  const reservation: ReservationRecord = {
    id: reservationSequence,
    reservationNo: buildReservationNo(now, reservationSequence),
    locale: input.locale,
    name: input.name.trim(),
    contactType: input.contactType,
    contact: input.contact.trim(),
    visitDate: input.visitDate,
    visitTime: input.visitTime,
    visitDatetime,
    status: "PENDING_PAYMENT",
    createdAt: now.toISOString()
  };

  reservations.set(reservation.id, reservation);
  return reservation;
}

const USD_RATE_KRW = 1300;

function krwToUsdTwoDecimals(krw: number) {
  const raw = krw / USD_RATE_KRW;
  return Math.max(0.01, Math.round(raw * 100) / 100);
}

function amountsMatchForConfirm(
  stored: number,
  input: number,
  currency: PaymentCurrency
) {
  if (currency === "KRW") {
    return stored === input;
  }
  return Math.abs(stored - input) < 0.0001;
}

export function preparePayment(
  reservationId: number,
  options?: {currency?: PaymentCurrency}
) {
  const reservation = reservations.get(reservationId);
  if (!reservation) {
    return null;
  }

  const currency: PaymentCurrency = options?.currency === "USD" ? "USD" : "KRW";
  const uniqueToken = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const orderId = `ORDER-ELK-${reservation.id}-${uniqueToken}`;
  const amount = currency === "USD" ? krwToUsdTwoDecimals(DEPOSIT_KRW) : DEPOSIT_KRW;
  const payment: PaymentRecord = {
    orderId,
    reservationId: reservation.id,
    amount,
    currency,
    status: "READY"
  };

  payments.set(orderId, payment);

  return {
    payment,
    reservation
  };
}

export function confirmPayment(input: {reservationId: number; orderId: string; paymentKey: string; amount: number}) {
  const reservation = reservations.get(input.reservationId);
  const payment = payments.get(input.orderId);

  if (!reservation || !payment || payment.reservationId !== reservation.id) {
    return {ok: false as const, reason: "NOT_FOUND"};
  }

  if (!amountsMatchForConfirm(payment.amount, input.amount, payment.currency)) {
    reservation.status = "PAYMENT_FAILED";
    payment.status = "FAILED";
    return {ok: false as const, reason: "AMOUNT_MISMATCH"};
  }

  const approvedAt = new Date().toISOString();
  payment.status = "DONE";
  payment.paymentKey = input.paymentKey;
  payment.approvedAt = approvedAt;
  reservation.status = "CONFIRMED";

  payments.set(payment.orderId, payment);
  reservations.set(reservation.id, reservation);

  return {
    ok: true as const,
    reservation,
    payment
  };
}
