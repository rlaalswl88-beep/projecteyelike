"use client";

import {useEffect, useMemo, useState} from "react";
import {useLocale, useTranslations} from "next-intl";
import {useSearchParams} from "next/navigation";
import {Link} from "@/i18n/navigation";
import {getTossClientKeyMode} from "@/lib/toss-client-key";

export default function PaymentSuccessPage() {
  const t = useTranslations("PaymentResult");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const paymentKey = searchParams.get("paymentKey") ?? "";
  const orderId = searchParams.get("orderId") ?? "";
  const amount = Number(searchParams.get("amount") ?? "0");
  const reservationId = Number(searchParams.get("reservationId") ?? "0");
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const tossKeyMode = getTossClientKeyMode(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY);

  const formattedAmount = useMemo(() => {
    if (!amount) return "-";
    return `${amount.toLocaleString(locale)} KRW`;
  }, [amount, locale]);

  useEffect(() => {
    let ignore = false;

    async function confirmPayment() {
      if (!paymentKey || !orderId || !amount || !reservationId) {
        setStatus("failed");
        return;
      }

      try {
        const response = await fetch("/api/v1/payments/confirm", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({
            reservationId,
            orderId,
            paymentKey,
            amount
          })
        });
        const result = (await response.json()) as {success: boolean};
        if (!ignore) {
          setStatus(response.ok && result.success ? "success" : "failed");
        }
      } catch {
        if (!ignore) {
          setStatus("failed");
        }
      }
    }

    void confirmPayment();
    return () => {
      ignore = true;
    };
  }, [amount, orderId, paymentKey, reservationId]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-10">
      <section className="w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-zinc-900">{t("titleSuccess")}</h1>
        <p className="mt-2 text-sm text-zinc-600">
          {status === "loading" ? t("descriptionLoading") : status === "success" ? t("descriptionSuccess") : t("descriptionFailed")}
        </p>
        {tossKeyMode === "test" && status === "success" ? (
          <p className="mt-2 text-xs text-amber-800">{t("testModeNote")}</p>
        ) : null}

        <dl className="mt-6 space-y-3 rounded-xl bg-zinc-50 p-4 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="font-medium text-zinc-700">{t("orderId")}</dt>
            <dd className="text-zinc-900">{orderId || "-"}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="font-medium text-zinc-700">{t("amount")}</dt>
            <dd className="text-zinc-900">{formattedAmount}</dd>
          </div>
        </dl>

        <div className="mt-6">
          <Link
            href="/"
            className="btn-add inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
          >
            {t("goHome")}
          </Link>
        </div>
      </section>
    </main>
  );
}
