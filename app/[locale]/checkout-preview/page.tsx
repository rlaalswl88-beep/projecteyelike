"use client";

import {ANONYMOUS, loadTossPayments} from "@tosspayments/tosspayments-sdk";
import type {
  TossPaymentsWidgets,
  WidgetAgreementStatus,
  WidgetAgreementWidget,
  WidgetPaymentMethodWidget
} from "@tosspayments/tosspayments-sdk";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useLocale, useTranslations} from "next-intl";
import {useSearchParams} from "next/navigation";
import {Link} from "@/i18n/navigation";

type CheckoutMode = "domestic" | "foreign";

/** 토스 결제위젯 약관 UI — 공식 안내 페이지(위젯 '상세보기'와 동일한 전문 확인용) */
const TOSS_PAYMENTS_TERMS_URL = "https://pages.tosspayments.com/terms/user";
const TOSS_PAYMENTS_PRIVACY_URL = "https://pages.tosspayments.com/privacy";

type AgreementWithSnapshot = WidgetAgreementWidget & {
  getAgreementStatus?: () => WidgetAgreementStatus;
};

function deriveAgreementReady(status: WidgetAgreementStatus) {
  if (status.agreedRequiredTerms === true) {
    return true;
  }
  const list = status.agreements;
  if (!Array.isArray(list) || list.length === 0) {
    return false;
  }
  const explicitlyRequired = list.filter((a) => a.term?.required === true);
  if (explicitlyRequired.length > 0) {
    return explicitlyRequired.every((a) => a.agreed);
  }
  // term.required가 비어 있어도 UI상 필수 1건인 경우가 있어, 항목이 모두 동의면 통과
  return list.every((a) => a.agreed === true);
}

/** API와 어긋날 때 대비: 약관 위젯 DOM의 체크박스 실제 체크 여부 */
function readAgreementDomAllChecked(): boolean | null {
  if (typeof document === "undefined") {
    return null;
  }
  const root = document.getElementById("eyelike-agreement");
  if (!root) {
    return null;
  }
  const boxes = [...root.querySelectorAll("input[type=checkbox]")] as HTMLInputElement[];
  if (boxes.length === 0) {
    return null;
  }
  return boxes.every((b) => b.checked);
}

function mergeAgreementReady(agreementWidget: WidgetAgreementWidget): boolean {
  const snap = (agreementWidget as AgreementWithSnapshot).getAgreementStatus?.();
  if (snap && deriveAgreementReady(snap)) {
    return true;
  }
  const dom = readAgreementDomAllChecked();
  if (dom === true) {
    return true;
  }
  if (dom === false) {
    return false;
  }
  return snap ? deriveAgreementReady(snap) : false;
}

function scheduleAgreementStatusResync(
  agreementWidget: WidgetAgreementWidget,
  onRead: (ready: boolean) => void,
  isCancelled: () => boolean
) {
  const delaysMs = [0, 16, 50, 100, 200, 400, 800, 1600, 2400, 3200];
  const ids: ReturnType<typeof setTimeout>[] = [];
  const tick = () => {
    if (isCancelled()) {
      return;
    }
    onRead(mergeAgreementReady(agreementWidget));
  };
  for (const ms of delaysMs) {
    ids.push(setTimeout(tick, ms));
  }
  return () => {
    for (const id of ids) {
      clearTimeout(id);
    }
  };
}

function attachAgreementDomWatch(
  agreementWidget: WidgetAgreementWidget,
  onRead: (ready: boolean) => void,
  isCancelled: () => boolean
) {
  const root = document.getElementById("eyelike-agreement");
  if (!root) {
    return () => {};
  }
  const sync = () => {
    if (!isCancelled()) {
      onRead(mergeAgreementReady(agreementWidget));
    }
  };
  sync();
  const onChange = () => {
    sync();
  };
  root.addEventListener("change", onChange);
  const observer = new MutationObserver(() => {
    sync();
  });
  observer.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["checked", "aria-checked"]
  });
  return () => {
    root.removeEventListener("change", onChange);
    observer.disconnect();
  };
}

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
  const initialAmountKrw = Number(searchParams.get("amount") ?? "0");

  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>("domestic");
  const [foreignEmail, setForeignEmail] = useState(contactType === "email" ? contact.trim() : "");
  const [widgetLoading, setWidgetLoading] = useState(false);
  const [widgetError, setWidgetError] = useState("");
  const [agreedRequiredTerms, setAgreedRequiredTerms] = useState(false);
  const [paymentMethodReady, setPaymentMethodReady] = useState(false);
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payErrorDetail, setPayErrorDetail] = useState("");

  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);
  const paymentMethodWidgetRef = useRef<WidgetPaymentMethodWidget | null>(null);
  const agreementWidgetRef = useRef<WidgetAgreementWidget | null>(null);

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

  const missingReservationContext = !name || !contact || !date || !time || !reservationId;
  const contactLabel = contactType === "phone" ? t("phone") : t("email");
  const tossClientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

  const variantDefault = process.env.NEXT_PUBLIC_TOSS_WIDGET_VARIANT_DEFAULT ?? "DEFAULT";
  const variantForeign = process.env.NEXT_PUBLIC_TOSS_WIDGET_VARIANT_FOREIGN ?? "FOREIGN-PAY";
  const variantAgreement = process.env.NEXT_PUBLIC_TOSS_WIDGET_VARIANT_AGREEMENT ?? "AGREEMENT";

  const foreignEmailForPay = contactType === "email" ? contact.trim() : foreignEmail.trim();
  const foreignEmailReady = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(foreignEmailForPay);
  const foreignBlocked = checkoutMode === "foreign" && !foreignEmailReady;

  const destroyWidgets = useCallback(async () => {
    await paymentMethodWidgetRef.current?.destroy().catch(() => {});
    await agreementWidgetRef.current?.destroy().catch(() => {});
    paymentMethodWidgetRef.current = null;
    agreementWidgetRef.current = null;
    widgetsRef.current = null;
  }, []);

  useEffect(() => {
    if (missingReservationContext || !tossClientKey || foreignBlocked) {
      void destroyWidgets();
      if (foreignBlocked) {
        setWidgetError(t("emailRequiredForForeign"));
      } else {
        setWidgetError("");
      }
      setWidgetLoading(false);
      setAgreedRequiredTerms(false);
      setPaymentMethodReady(false);
      return;
    }

    const clientKey = tossClientKey;
    let cancelled = false;
    let clearAgreementResync: (() => void) | undefined;
    let clearAgreementDomWatch: (() => void) | undefined;

    async function bootstrapWidget() {
      setWidgetError("");
      setWidgetLoading(true);
      setAgreedRequiredTerms(false);
      setPaymentMethodReady(false);
      await destroyWidgets();

      const currency = checkoutMode === "foreign" ? "USD" : "KRW";
      try {
        const prepareResponse = await fetch("/api/v1/payments/prepare", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({reservationId, currency})
        });
        const prepareResult = (await prepareResponse.json()) as {
          success: boolean;
          data?: {amount: number; currency: "KRW" | "USD"};
        };
        if (!prepareResponse.ok || !prepareResult.success || !prepareResult.data) {
          throw new Error("payment_prepare_failed");
        }

        if (cancelled) {
          return;
        }

        const tossPayments = await loadTossPayments(clientKey);
        const widgets = tossPayments.widgets({customerKey: ANONYMOUS});
        widgetsRef.current = widgets;

        await widgets.setAmount({
          currency: prepareResult.data.currency,
          value: prepareResult.data.amount
        });

        const paymentVariant = checkoutMode === "foreign" ? variantForeign : variantDefault;

        const [paymentMethodWidget, agreementWidget] = await Promise.all([
          widgets.renderPaymentMethods({
            selector: "#eyelike-payment-methods",
            variantKey: paymentVariant
          }),
          widgets.renderAgreement({
            selector: "#eyelike-agreement",
            variantKey: variantAgreement
          })
        ]);

        if (cancelled) {
          await paymentMethodWidget.destroy().catch(() => {});
          await agreementWidget.destroy().catch(() => {});
          return;
        }

        paymentMethodWidgetRef.current = paymentMethodWidget;
        agreementWidgetRef.current = agreementWidget;

        paymentMethodWidget.on("paymentMethodSelect", () => {
          setPaymentMethodReady(true);
        });

        try {
          const selected = await paymentMethodWidget.getSelectedPaymentMethod();
          if (selected?.code) {
            setPaymentMethodReady(true);
          }
        } catch {
          /* 위젯 초기화 직후에는 미선택일 수 있음 */
        }

        agreementWidget.on("agreementStatusChange", () => {
          if (!cancelled) {
            setAgreedRequiredTerms(mergeAgreementReady(agreementWidget));
          }
        });

        setAgreedRequiredTerms(mergeAgreementReady(agreementWidget));

        clearAgreementResync = scheduleAgreementStatusResync(
          agreementWidget,
          (ready) => {
            if (!cancelled) {
              setAgreedRequiredTerms(ready);
            }
          },
          () => cancelled
        );

        clearAgreementDomWatch = attachAgreementDomWatch(
          agreementWidget,
          (ready) => {
            if (!cancelled) {
              setAgreedRequiredTerms(ready);
            }
          },
          () => cancelled
        );
      } catch (error: unknown) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : String(error);
          setWidgetError(message || t("widgetInitFailed"));
          widgetsRef.current = null;
        }
      } finally {
        if (!cancelled) {
          setWidgetLoading(false);
        }
      }
    }

    void bootstrapWidget();

    return () => {
      cancelled = true;
      clearAgreementResync?.();
      clearAgreementDomWatch?.();
      void destroyWidgets();
    };
  }, [
    checkoutMode,
    contact,
    contactType,
    date,
    destroyWidgets,
    foreignBlocked,
    missingReservationContext,
    reservationId,
    t,
    tossClientKey,
    variantAgreement,
    variantDefault,
    variantForeign,
    foreignEmail
  ]);

  const handlePay = async () => {
    const clientKey = tossClientKey;
    if (
      missingReservationContext ||
      !clientKey ||
      foreignBlocked ||
      !widgetsRef.current ||
      !agreedRequiredTerms ||
      !paymentMethodReady ||
      paySubmitting
    ) {
      return;
    }

    setPaySubmitting(true);
    setPayErrorDetail("");

    const currency = checkoutMode === "foreign" ? "USD" : "KRW";
    const customerEmail = foreignEmailForPay;
    const customerMobilePhone = contactType === "phone" ? contact.trim() : undefined;

    try {
      const prepareResponse = await fetch("/api/v1/payments/prepare", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({reservationId, currency})
      });
      const prepareResult = (await prepareResponse.json()) as {
        success: boolean;
        data?: {orderId: string; amount: number; currency: "KRW" | "USD"};
      };
      if (!prepareResponse.ok || !prepareResult.success || !prepareResult.data) {
        throw new Error("payment_prepare_failed");
      }

      const {orderId: latestOrderId, amount: latestAmount, currency: latestCurrency} =
        prepareResult.data;

      const widgets = widgetsRef.current;
      if (!widgets) {
        throw new Error("widget_not_ready");
      }
      await widgets.setAmount({
        currency: latestCurrency,
        value: latestAmount
      });

      const origin = window.location.origin;
      const successUrl = `${origin}/${locale}/payment/success?reservationId=${reservationId}`;
      const failUrl = `${origin}/${locale}/payment/fail?reservationId=${reservationId}`;
      const pendingUrl = `${origin}/${locale}/payment/pending?reservationId=${reservationId}`;

      await widgets.requestPayment({
        orderId: latestOrderId,
        orderName: t("orderName"),
        successUrl,
        failUrl,
        ...(checkoutMode === "foreign" ? {pendingUrl} : {}),
        customerEmail,
        customerName: name,
        customerMobilePhone
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
      setPayErrorDetail(detail || t("paymentFailed"));
    } finally {
      setPaySubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-10">
      <section className="w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-zinc-900">{t("title")}</h1>
        <p className="mt-2 text-sm text-zinc-600">{t("description")}</p>

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
            <dd className="text-zinc-900">
              {initialAmountKrw ? `${initialAmountKrw.toLocaleString(locale)} KRW` : "-"}
            </dd>
          </div>
        </dl>

        <div className="mt-6 space-y-2">
          <p className="text-sm font-medium text-zinc-800">{t("widgetUiTitle")}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setCheckoutMode("domestic");
                setPayErrorDetail("");
              }}
              className={[
                "rounded-lg border px-4 py-2 text-sm font-semibold transition",
                checkoutMode === "domestic"
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-500"
              ].join(" ")}
            >
              {t("tabDomestic")}
            </button>
            <button
              type="button"
              onClick={() => {
                setCheckoutMode("foreign");
                setPayErrorDetail("");
              }}
              className={[
                "rounded-lg border px-4 py-2 text-sm font-semibold transition",
                checkoutMode === "foreign"
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-500"
              ].join(" ")}
            >
              {t("tabForeign")}
            </button>
          </div>
        </div>

        {checkoutMode === "foreign" && contactType !== "email" ? (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <label htmlFor="foreignEmail" className="text-sm font-semibold text-zinc-800">
              {t("emailForForeignLabel")}
            </label>
            <input
              id="foreignEmail"
              type="email"
              value={foreignEmail}
              onChange={(event) => setForeignEmail(event.target.value)}
              placeholder={t("emailForForeignPlaceholder")}
              className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-500"
            />
            <p className="mt-2 text-xs text-zinc-600">{t("emailForForeignHelp")}</p>
          </div>
        ) : null}

        <div className="mt-6 space-y-3">
          <div id="eyelike-payment-methods" className="min-h-[120px]" />
          <div id="eyelike-agreement" className="min-h-[80px]" />
          {!widgetLoading && !widgetError && tossClientKey ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
              <p className="font-medium text-zinc-800">{t("tossLegalLinksTitle")}</p>
              <p className="mt-1 leading-relaxed text-zinc-600">{t("tossLegalLinksDescription")}</p>
              <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                <a
                  href={TOSS_PAYMENTS_TERMS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-zinc-900 underline underline-offset-2 hover:text-zinc-600"
                >
                  {t("tossTermsViewFull")}
                </a>
                <a
                  href={TOSS_PAYMENTS_PRIVACY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-zinc-900 underline underline-offset-2 hover:text-zinc-600"
                >
                  {t("tossPrivacyViewFull")}
                </a>
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Link
            href={{pathname: "/reservation", query: {name, contactType, contact, date, time}}}
            className="btn-clear inline-flex items-center justify-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800"
          >
            {t("back")}
          </Link>
          <button
            type="button"
            disabled={
              missingReservationContext ||
              !tossClientKey ||
              foreignBlocked ||
              widgetLoading ||
              !!widgetError ||
              !agreedRequiredTerms ||
              !paymentMethodReady ||
              paySubmitting
            }
            onClick={() => void handlePay()}
            className="btn-save rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {paySubmitting ? t("paying") : t("payButtonWidget")}
          </button>
        </div>

        {!widgetLoading &&
        !widgetError &&
        !foreignBlocked &&
        tossClientKey &&
        !missingReservationContext &&
        (!agreedRequiredTerms || !paymentMethodReady) ? (
          <p className="mt-2 text-xs text-zinc-600">{t("payDisabledHint")}</p>
        ) : null}

        {widgetLoading ? (
          <p className="mt-3 text-sm text-zinc-600">{t("widgetLoading")}</p>
        ) : null}
        {missingReservationContext ? (
          <p className="mt-3 text-sm font-medium text-red-600">{t("missingWarning")}</p>
        ) : null}
        {!tossClientKey ? (
          <p className="mt-3 text-sm font-medium text-amber-600">{t("clientKeyMissing")}</p>
        ) : null}
        {widgetError ? <p className="mt-3 text-sm font-medium text-red-600">{widgetError}</p> : null}
        {foreignBlocked ? (
          <p className="mt-2 text-sm font-medium text-amber-700">{t("emailRequiredForForeign")}</p>
        ) : null}
        {payErrorDetail ? <p className="mt-2 text-xs text-red-500">{payErrorDetail}</p> : null}
      </section>
    </main>
  );
}
