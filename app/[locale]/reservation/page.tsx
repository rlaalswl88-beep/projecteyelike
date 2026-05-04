"use client";

import {useMemo, useState} from "react";
import {useLocale, useTranslations} from "next-intl";
import {useSearchParams} from "next/navigation";
import {Link, useRouter} from "@/i18n/navigation";

function toDateLabel(dateText: string, locale: string) {
  const date = new Date(`${dateText}T00:00:00`);
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short"
  }).format(date);
}

function buildTimeSlots() {
  const result: string[] = [];
  for (let hour = 10; hour <= 19; hour += 1) {
    result.push(`${String(hour).padStart(2, "0")}:00`);
    if (hour !== 19) result.push(`${String(hour).padStart(2, "0")}:30`);
  }
  result.push("19:30");
  return result;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthCells(monthCursor: Date) {
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingEmpty = firstDay.getDay();

  const cells: Array<{date: Date | null}> = [];
  for (let index = 0; index < leadingEmpty; index += 1) {
    cells.push({date: null});
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({date: new Date(year, month, day)});
  }
  while (cells.length % 7 !== 0) {
    cells.push({date: null});
  }
  return cells;
}

export default function ReservationPage() {
  const t = useTranslations("Reservation");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const name = searchParams.get("name") ?? "";
  const contactType = searchParams.get("contactType") ?? "";
  const contact = searchParams.get("contact") ?? "";

  const todayDate = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const [selectedDate, setSelectedDate] = useState("");
  const [monthCursor, setMonthCursor] = useState(
    () => new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)
  );
  const [selectedTime, setSelectedTime] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const timeSlots = useMemo(() => buildTimeSlots(), []);
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "long"
      }).format(monthCursor),
    [locale, monthCursor]
  );
  const monthCells = useMemo(() => getMonthCells(monthCursor), [monthCursor]);
  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, {weekday: "short"});
    return Array.from({length: 7}, (_, day) =>
      formatter.format(new Date(2026, 0, 4 + day))
    );
  }, [locale]);

  if (!name || !contactType || !contact) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-10">
        <section className="w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-zinc-900">{t("missingInfoTitle")}</h1>
          <p className="mt-2 text-sm text-zinc-600">{t("missingInfoDescription")}</p>
          <Link
            href="/"
            className="btn-add mt-4 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
          >
            {t("goHome")}
          </Link>
        </section>
      </main>
    );
  }

  const handleConfirm = async () => {
    if (!selectedTime || isSubmitting) return;

    setSubmitError("");
    setIsSubmitting(true);

    try {
      const reservationResponse = await fetch("/api/v1/reservations", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          locale,
          name,
          contactType,
          contact,
          visitDate: selectedDate,
          visitTime: selectedTime
        })
      });

      const reservationResult = (await reservationResponse.json()) as {
        success: boolean;
        data?: {
          reservationId: number;
          reservationNo: string;
          orderId: string;
          amount: number;
          currency: string;
        };
      };

      if (!reservationResponse.ok || !reservationResult.success || !reservationResult.data) {
        throw new Error("reservation_failed");
      }

      const {reservationId, reservationNo, orderId, amount, currency} = reservationResult.data;
      if (!orderId || typeof amount !== "number" || !currency) {
        throw new Error("payment_prepare_failed");
      }

      const params = new URLSearchParams({
        name,
        contactType,
        contact,
        date: selectedDate,
        time: selectedTime,
        reservationId: String(reservationId),
        reservationNo,
        orderId,
        amount: String(amount),
        currency
      });

      router.push(`/checkout-preview?${params.toString()}`);
    } catch {
      setSubmitError(t("submitError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10">
      <section className="w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-zinc-900">{t("title")}</h1>
        <p className="mt-2 text-sm text-zinc-600">{t("description")}</p>

        <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-800">{t("dateLabel")}</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setMonthCursor(
                    (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                  )
                }
                className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-700 hover:border-zinc-500"
              >
                {t("monthPrev")}
              </button>
              <p className="min-w-28 text-center text-sm font-semibold text-zinc-900">{monthLabel}</p>
              <button
                type="button"
                onClick={() =>
                  setMonthCursor(
                    (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                  )
                }
                className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-700 hover:border-zinc-500"
              >
                {t("monthNext")}
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-2">
            {weekdayLabels.map((weekday) => (
              <div key={weekday} className="py-1 text-center text-xs font-semibold text-zinc-500">
                {weekday}
              </div>
            ))}
            {monthCells.map((cell, index) => {
              if (!cell.date) {
                return <div key={`empty-${index}`} className="h-11 rounded-md bg-transparent" />;
              }

              const dateKey = toDateKey(cell.date);
              const isPast = cell.date < todayDate;
              const isSelected = selectedDate === dateKey;

              return (
                <button
                  type="button"
                  key={dateKey}
                  disabled={isPast}
                  onClick={() => {
                    setSelectedDate(dateKey);
                    setSelectedTime("");
                  }}
                  className={[
                    "h-11 rounded-md border text-sm font-semibold transition",
                    isSelected
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : isPast
                        ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
                        : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-500"
                  ].join(" ")}
                >
                  {cell.date.getDate()}
                </button>
              );
            })}
          </div>

          {selectedDate ? (
            <p className="mt-3 text-sm font-medium text-zinc-800">
              {t("selectedDate")}: {toDateLabel(selectedDate, locale)}
            </p>
          ) : (
            <p className="mt-3 text-sm font-medium text-zinc-600">{t("selectDateFirst")}</p>
          )}
        </div>

        <div className="mt-5">
          <h2 className="text-sm font-semibold text-zinc-800">{t("timeTitle")}</h2>
          {selectedDate ? (
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {timeSlots.map((time) => {
                const isSelected = selectedTime === time;
                return (
                  <button
                    type="button"
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={[
                      "rounded-md border px-2 py-2 text-sm font-medium transition",
                      isSelected
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-500"
                    ].join(" ")}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">{t("selectDateFirst")}</p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Link
            href="/"
            className="btn-clear inline-flex items-center justify-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800"
          >
            {t("back")}
          </Link>
          <button
            type="button"
            className="btn-save rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
            onClick={handleConfirm}
            disabled={!selectedDate || !selectedTime || isSubmitting}
          >
            {isSubmitting ? t("submitting") : t("confirm")}
          </button>
        </div>
        {submitError ? <p className="mt-3 text-sm font-medium text-red-600">{submitError}</p> : null}
      </section>
    </main>
  );
}
