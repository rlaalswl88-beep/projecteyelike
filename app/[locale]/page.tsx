"use client";

import {FormEvent, useState} from "react";
import {useLocale, useTranslations} from "next-intl";
import {Link, usePathname, useRouter} from "@/i18n/navigation";

export default function HomePage() {
  const t = useTranslations("Home");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const [name, setName] = useState("");
  const [contactType, setContactType] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isPhoneValid = phone.trim().length >= 8;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isFormValid =
    name.trim().length > 1 &&
    ((contactType === "phone" && isPhoneValid) ||
      (contactType === "email" && isEmailValid));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isFormValid) {
      setErrorMessage(t("validation"));
      return;
    }

    const params = new URLSearchParams({
      name: name.trim(),
      contactType,
      contact: (contactType === "phone" ? phone : email).trim()
    });

    router.push(`/reservation?${params.toString()}`);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-10">
      <section className="w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex gap-2">
          <Link
            href={pathname}
            locale="ko"
            className={[
              "rounded border px-2 py-1 text-xs font-medium transition",
              locale === "ko"
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 bg-zinc-50 text-zinc-700 hover:border-zinc-400 hover:text-zinc-900"
            ].join(" ")}
          >
            한국어
          </Link>
          <Link
            href={pathname}
            locale="en"
            className={[
              "rounded border px-2 py-1 text-xs font-medium transition",
              locale === "en"
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 bg-zinc-50 text-zinc-700 hover:border-zinc-400 hover:text-zinc-900"
            ].join(" ")}
          >
            English
          </Link>
          <Link
            href={pathname}
            locale="zh"
            className={[
              "rounded border px-2 py-1 text-xs font-medium transition",
              locale === "zh"
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 bg-zinc-50 text-zinc-700 hover:border-zinc-400 hover:text-zinc-900"
            ].join(" ")}
          >
            中文
          </Link>
          <Link
            href={pathname}
            locale="ja"
            className={[
              "rounded border px-2 py-1 text-xs font-medium transition",
              locale === "ja"
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 bg-zinc-50 text-zinc-700 hover:border-zinc-400 hover:text-zinc-900"
            ].join(" ")}
          >
            日本語
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-zinc-900">{t("title")}</h1>
        <p className="mt-2 text-sm text-zinc-600">{t("description")}</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label htmlFor="name" className="text-sm font-medium text-zinc-800">
              {t("name")}
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errorMessage) setErrorMessage("");
              }}
              placeholder={t("namePlaceholder")}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-500"
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-zinc-800">{t("contactType")}</legend>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                <input
                  type="radio"
                  name="contactType"
                  checked={contactType === "phone"}
                  onChange={() => {
                    setContactType("phone");
                    setErrorMessage("");
                  }}
                />
                {t("phone")}
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                <input
                  type="radio"
                  name="contactType"
                  checked={contactType === "email"}
                  onChange={() => {
                    setContactType("email");
                    setErrorMessage("");
                  }}
                />
                {t("email")}
              </label>
            </div>
          </fieldset>

          {contactType === "phone" ? (
            <div className="space-y-1">
              <label htmlFor="phone" className="text-sm font-medium text-zinc-800">
                {t("phone")}
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setErrorMessage("");
                }}
                placeholder={t("phonePlaceholder")}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-500"
              />
            </div>
          ) : (
            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium text-zinc-800">
                {t("email")}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setErrorMessage("");
                }}
                placeholder={t("emailPlaceholder")}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-500"
              />
            </div>
          )}

          {errorMessage ? <p className="text-sm font-medium text-red-600">{errorMessage}</p> : null}

          <button
            type="submit"
            className="btn-add w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
            disabled={!isFormValid}
          >
            {t("reserveButton")}
          </button>
        </form>
      </section>
    </main>
  );
}
