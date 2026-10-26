"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconAlert, IconCheck, IconSettings } from "@/components/icons";
import { SpectrumButton } from "@/components/spectrum/button";
import { useAppSettings } from "@/lib/app-settings";

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const appSettings = useAppSettings();
  const appName = appSettings.appName || "Fichas técnicas";
  const organization = [appSettings.organizationName, appSettings.organizationTagline]
    .filter(Boolean)
    .join(" · ");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "No se pudo iniciar sesión.");
      }
      router.replace(next);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo iniciar sesión.",
      );
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 text-center">
        {appSettings.organizationLogo ? (
          <span className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white p-1 shadow-lg shadow-brand-600/10 ring-1 ring-slate-200">
            <img
              src={appSettings.organizationLogo}
              alt={appSettings.organizationName || "Logo"}
              className="h-12 w-12 object-contain"
            />
          </span>
        ) : (
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-400 text-white shadow-lg shadow-brand-600/20">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
              <rect x="4" y="6" width="5" height="15" rx="1" fill="currentColor" opacity="0.95" />
              <rect x="10.5" y="3" width="4" height="18" rx="1" fill="currentColor" opacity="0.7" />
              <rect x="16" y="8" width="4" height="13" rx="1" fill="currentColor" opacity="0.45" />
            </svg>
          </span>
        )}
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
          {appName}
        </h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          {organization || "CEYCO · Vidrio"}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <IconSettings width={16} height={16} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Acceso privado
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Introduce la contraseña configurada para este sistema.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              autoFocus
              className="input"
              placeholder="••••••••"
            />
          </div>

          {error ? (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <IconAlert width={14} height={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <SpectrumButton
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
            leftIcon={<IconCheck width={16} height={16} />}
          >
            Entrar
          </SpectrumButton>
        </form>

        <p className="mt-4 text-center text-[10px] leading-relaxed text-slate-400">
          La contraseña se configura en <code>APP_PASSWORD</code> y la sesión
          expira automáticamente.
        </p>
      </div>

      <p className="mt-4 text-center text-[10px] text-slate-400">
        {appSettings.supportLine || "Prestaciones calculadas con Calumen®"}
      </p>
    </div>
  );
}
