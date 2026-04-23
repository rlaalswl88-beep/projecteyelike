"use client";

import {useTranslations} from "next-intl";
import {Link} from "@/i18n/navigation";

export default function PaymentPendingPage() {
  const t = useTranslations("PaymentResult");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-10">
      <section className="w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-zinc-900">{t("titlePending")}</h1>
        <p className="mt-2 text-sm text-zinc-600">{t("descriptionPending")}</p>

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
