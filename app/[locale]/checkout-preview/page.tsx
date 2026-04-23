"use client";

import {loadTossPayments} from "@tosspayments/tosspayments-sdk";
import {useMemo, useRef, useState} from "react";
import {useLocale, useTranslations} from "next-intl";
import {useSearchParams} from "next/navigation";
import {Link} from "@/i18n/navigation";
import {getTossClientKeyMode} from "@/lib/toss-client-key";

export default function CheckoutPreviewPage() {
  const t = useTranslations("CheckoutPreview");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const name = searchParams.get("name") ?? "";
  const contactType = searchParams.get("contactType") ?? "";
  const contact = searchParams.get("contact") ?? "";
  const date = searchParams.get("date") ?? "";
  const time = searchParams.get("time") ?? "";
  const reservationId = Number(searchParams.get("reservationId") ?? "0");
  const reservationNo = searchParams.get("reservationNo") ?? "";
  const initialOrderId = searchParams.get("orderId") ?? "";
  const initialAmount = Number(searchParams.get("amount") ?? "0");
  const [orderId, setOrderId] = useState(initialOrderId);
  const [amount, setAmount] = useState(initialAmount);
  const [payStatus, setPayStatus] = useState<"idle" | "loading" | "failed">("idle");
  const [payErrorDetail, setPayErrorDetail] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<"CARD" | "ALIPAY" | "PAYPAL">("CARD");
  const [foreignEmail, setForeignEmail] = useState(contactType === "email" ? contact.trim() : "");
  const payRequestLockRef = useRef(false);

  const formattedDate = useMemo(() => {
    if (!date) return "-";
    const dateValue = new Date(`${date}T00:00:00`);
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short"
    }).format(dateValue);
  }, [date, locale]);

  const missingRequiredValue =
    !name || !contact || !date || !time || !reservationId || !orderId || !amount;
  const contactLabel = contactType === "phone" ? t("phone") : t("email");
  const tossClientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  const tossKeyMode = getTossClientKeyMode(tossClientKey);

  const selectedMethodLabel =
    selectedMethod === "CARD"
      ? t("methodCard")
      : selectedMethod === "ALIPAY"
        ? "Alipay"
        : "PayPal";

  const handleTossPayment = async () => {
    if (missingRequiredValue || payStatus === "loading" || payRequestLockRef.current) {
      return;
    }

    payRequestLockRef.current = true;
    setPayErrorDetail("");
    setPayStatus("loading");
    try {
      const clientKey = tossClientKey;
      if (!clientKey) {
        throw new Error("missing_client_key");
      }

      const contactValue = contact.trim();
      const customerEmail = contactType === "email" ? contactValue : foreignEmail.trim();
      const customerMobilePhone = contactType === "phone" ? contactValue : undefined;

      const prepareResponse = await fetch("/api/v1/payments/prepare", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({reservationId})
      });
      const prepareResult = (await prepareResponse.json()) as {
        success: boolean;
        data?: {orderId: string; amount: number};
      };
      if (!prepareResponse.ok || !prepareResult.success || !prepareResult.data) {
        throw new Error("payment_prepare_failed");
      }

      const latestOrderId = prepareResult.data.orderId;
      const latestAmount = prepareResult.data.amount;
      setOrderId(latestOrderId);
      setAmount(latestAmount);

      const tossPayments = await loadTossPayments(clientKey);
      const uniqueCustomerKey = `eyelike_${reservationId}_${latestOrderId.slice(-8)}`.slice(0, 50);
      const payment = tossPayments.payment({
        customerKey: uniqueCustomerKey
      });

      const successUrl = `${window.location.origin}/${locale}/payment/success?reservationId=${reservationId}`;
      const failUrl = `${window.location.origin}/${locale}/payment/fail?reservationId=${reservationId}`;
      const pendingUrl = `${window.location.origin}/${locale}/payment/pending?reservationId=${reservationId}`;

      if (selectedMethod === "CARD") {
        await payment.requestPayment({
          method: "CARD",
          amount: {
            currency: "KRW",
            value: latestAmount
          },
          orderId: latestOrderId,
          orderName: "EYELIKE 예약금",
          customerName: name,
          customerEmail,
          customerMobilePhone,
          successUrl,
          failUrl
        });
        return;
      }

      const isForeignEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail);
      if (!isForeignEmailValid) {
        setPayErrorDetail(t("emailRequiredForForeign"));
        setPayStatus("failed");
        return;
      }
      const foreignCountry =
        selectedMethod === "ALIPAY"
          ? "CN"
          : locale === "ja"
            ? "JP"
            : locale === "zh"
              ? "CN"
              : "KR";

      await payment.requestPayment({
        method: "FOREIGN_EASY_PAY",
        amount: {
          currency: "USD",
          value: Math.max(1, Math.round(latestAmount / 1300))
        },
        orderId: latestOrderId,
        orderName: "EYELIKE 예약금",
        customerName: name,
        customerEmail,
        successUrl,
        failUrl,
        pendingUrl,
        foreignEasyPay: {
          provider: selectedMethod,
          country: foreignCountry
        }
      });
    } catch (error: unknown) {
      const errorCode =
        typeof error === "object" && error && "code" in error
          ? String((error as {code?: string}).code ?? "")
          : "";
      const errorMessage =
        typeof error === "object" && error && "message" in error
          ? String((error as {message?: string}).message ?? "")
          : "";
      const detail = [errorCode, errorMessage].filter(Boolean).join(" - ");
      setPayErrorDetail(detail);
      setPayStatus("failed");
    } finally {
      payRequestLockRef.current = false;
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-10">
      <section className="w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="text-2xl font-bold text-zinc-900">{t("title")}</h1>
          {tossKeyMode === "test" ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
              {t("testModeBadge")}
            </span>
          ) : null}
          {tossKeyMode === "live" ? (
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-900">
              {t("liveModeBadge")}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-zinc-600">{t("description")}</p>
        {tossKeyMode === "test" ? <p className="mt-2 text-xs text-zinc-500">{t("testModeHint")}</p> : null}

        <dl className="mt-6 space-y-3 rounded-xl bg-zinc-50 p-4 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="font-medium text-zinc-700">{t("name")}</dt>
            <dd className="text-zinc-900">{name || "-"}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="font-medium text-zinc-700">{contactLabel}</dt>
            <dd className="text-zinc-900">{contact || "-"}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="font-medium text-zinc-700">{t("date")}</dt>
            <dd className="text-zinc-900">{formattedDate}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="font-medium text-zinc-700">{t("time")}</dt>
            <dd className="text-zinc-900">{time || "-"}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="font-medium text-zinc-700">{t("reservationNo")}</dt>
            <dd className="text-zinc-900">{reservationNo || "-"}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="font-medium text-zinc-700">{t("deposit")}</dt>
            <dd className="text-zinc-900">{amount ? `${amount.toLocaleString(locale)} KRW` : "-"}</dd>
          </div>
        </dl>

        <div className="mt-6 space-y-2">
          <p className="text-sm font-medium text-zinc-800">{t("methodTitle")}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setSelectedMethod("CARD")}
              className={[
                "rounded-lg border px-4 py-2 text-sm font-semibold transition",
                selectedMethod === "CARD"
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-500"
              ].join(" ")}
            >
              {t("methodCard")}
            </button>
            <button
              type="button"
              onClick={() => setSelectedMethod("ALIPAY")}
              className={[
                "rounded-lg border px-4 py-2 text-sm font-semibold transition",
                selectedMethod === "ALIPAY"
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-500"
              ].join(" ")}
            >
              Alipay
            </button>
            <button
              type="button"
              onClick={() => setSelectedMethod("PAYPAL")}
              className={[
                "rounded-lg border px-4 py-2 text-sm font-semibold transition",
                selectedMethod === "PAYPAL"
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-500"
              ].join(" ")}
            >
              PayPal
            </button>
          </div>
        </div>

        {selectedMethod !== "CARD" && contactType !== "email" ? (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <label htmlFor="foreignEmail" className="text-sm font-semibold text-zinc-800">
              {t("emailForForeignLabel")}
            </label>
            <input
              id="foreignEmail"
              type="email"
              value={foreignEmail}
              onChange={(event) => {
                setForeignEmail(event.target.value);
                if (payStatus === "failed") {
                  setPayStatus("idle");
                  setPayErrorDetail("");
                }
              }}
              placeholder={t("emailForForeignPlaceholder")}
              className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-500"
            />
            <p className="mt-2 text-xs text-zinc-600">{t("emailForForeignHelp")}</p>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Link
            href={{pathname: "/reservation", query: {name, contactType, contact, date, time}}}
            className="btn-clear inline-flex items-center justify-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800"
          >
            {t("back")}
          </Link>
          <button
            type="button"
            disabled={missingRequiredValue || payStatus === "loading"}
            onClick={() => void handleTossPayment()}
            className="btn-save rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {payStatus === "loading" ? t("paying") : t("payButtonSelected", {method: selectedMethodLabel})}
          </button>
        </div>

        {missingRequiredValue ? (
          <p className="mt-3 text-sm font-medium text-red-600">{t("missingWarning")}</p>
        ) : null}
        {!tossClientKey ? (
          <p className="mt-3 text-sm font-medium text-amber-600">{t("clientKeyMissing")}</p>
        ) : null}
        {payStatus === "failed" ? <p className="mt-3 text-sm font-medium text-red-600">{t("paymentFailed")}</p> : null}
        {payErrorDetail ? <p className="mt-1 text-xs text-red-500">{payErrorDetail}</p> : null}
      </section>
    </main>
  );
}
