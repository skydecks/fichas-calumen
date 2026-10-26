"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconAgent,
  IconFile,
  IconFolder,
  IconHome,
  IconLogout,
  IconPackage,
  IconPlus,
  IconSettings,
  IconSparkles,
  IconUsers,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { SpectrumButton } from "@/components/spectrum/button";
import { useAppSettings } from "@/lib/app-settings";

const mainLinks = [
  { href: "/", label: "Inicio", icon: IconHome, exact: true },
  { href: "/clientes", label: "Clientes", icon: IconUsers },
  { href: "/proyectos", label: "Proyectos", icon: IconFolder },
  { href: "/agentes", label: "Agentes de venta", icon: IconAgent },
  { href: "/fichas", label: "Fichas técnicas", icon: IconFile },
  { href: "/productos", label: "Productos", icon: IconPackage },
  { href: "/asistente", label: "Asistente IA", icon: IconSparkles },
  { href: "/configuracion", label: "Configuración", icon: IconSettings },
];

export default function SidebarSpectrum() {
  const pathname = usePathname();
  const appSettings = useAppSettings();
  const appName = appSettings.appName || "Fichas técnicas";
  const organization = [appSettings.organizationName, appSettings.organizationTagline]
    .filter(Boolean)
    .join(" · ");

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.assign("/login");
    }
  }

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside className="w-full shrink-0 bg-navy-950 text-slate-300 lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex items-center justify-between gap-3 px-4 py-4 lg:px-5 lg:py-6 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2.5">
          {appSettings.organizationLogo ? (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-0.5 shadow-lg shadow-brand-600/20">
              <img
                src={appSettings.organizationLogo}
                alt={appSettings.organizationName || "Logo"}
                className="h-9 w-9 object-contain"
              />
            </span>
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-400 text-white shadow-lg shadow-brand-600/20">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                <rect x="4" y="6" width="5" height="15" rx="1" fill="currentColor" opacity="0.95" />
                <rect x="10.5" y="3" width="4" height="18" rx="1" fill="currentColor" opacity="0.7" />
                <rect x="16" y="8" width="4" height="13" rx="1" fill="currentColor" opacity="0.45" />
              </svg>
            </span>
          )}
          <div className="min-w-0">
            <span className="block truncate text-[15px] font-semibold text-white">
              {appName}
            </span>
            <span className="block truncate text-[10.5px] font-medium uppercase tracking-[0.16em] text-slate-400">
              {organization || "CEYCO · Vidrio"}
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex min-w-0 max-w-full items-center gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:items-stretch lg:gap-0.5 lg:overflow-visible lg:px-3 lg:pb-0">
        <p className="nav-section hidden lg:block">Operación</p>
        {mainLinks.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.href, link.exact);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn("nav-item", active && "nav-item-active")}
            >
              <Icon width={17} height={17} />
              <span className="whitespace-nowrap">{link.label}</span>
            </Link>
          );
        })}

        <SpectrumButton
          href="/fichas/nueva"
          variant="primary"
          size="sm"
          leftIcon={<IconPlus width={16} height={16} />}
          className="ml-auto shrink-0 whitespace-nowrap lg:ml-0 lg:mt-4 lg:w-full lg:justify-center"
        >
          Nueva ficha
        </SpectrumButton>
      </nav>

      <div className="border-t border-white/10 px-5 py-4 lg:px-5 lg:py-6">
        <p className="text-[11px] leading-relaxed text-slate-400">
          Prestaciones calculadas con Calumen®. Normas EN 410, EN 673, ISO 9050
          y NFRC.
        </p>
        <p className="mt-2 text-[10px] text-slate-500">
          {appSettings.supportLine || "Documentos informativos · Saint-Gobain"}
        </p>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 transition hover:text-white"
        >
          <IconLogout width={13} height={13} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
