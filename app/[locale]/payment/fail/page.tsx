"use client";

import {useTranslations} from "next-intl";
import {useSearchParams} from "next/navigation";
import {Link} from "@/i18n/navigation";

export default function PaymentFailPage() {
  const t = useTranslations("PaymentResult");
  const searchParams = useSearchParams();
  const code = searchParams.get("code") ?? "";
  const message = searchParams.get("message") ?? "";
  const orderId = searchParams.get("orderId") ?? "";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-10">
      <section className="w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-zinc-900">{t("titleFail")}</h1>
        <p className="mt-2 text-sm text-zinc-600">{t("descriptionFail")}</p>

        <dl className="mt-6 space-y-3 rounded-xl bg-zinc-50 p-4 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="font-medium text-zinc-700">{t("orderId")}</dt>
            <dd className="text-zinc-900">{orderId || "-"}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="font-medium text-zinc-700">{t("errorCode")}</dt>
            <dd className="text-zinc-900">{code || "-"}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="font-medium text-zinc-700">{t("errorMessage")}</dt>
            <dd className="max-w-60 text-right text-zinc-900">{message || "-"}</dd>
          </div>
        </dl>

        <div className="mt-6 flex gap-2">
          <Link
            href="/reservation"
            className="btn-clear inline-flex items-center justify-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800"
          >
            {t("backToReservation")}
          </Link>
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
