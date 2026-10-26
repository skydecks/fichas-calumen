"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconAgent,
  IconFile,
  IconFolder,
  IconHome,
  IconPlus,
  IconSparkles,
  IconUsers,
} from "@/components/icons";
import { cn } from "@/lib/utils";

const mainLinks = [
  { href: "/", label: "Inicio", icon: IconHome, exact: true },
  { href: "/clientes", label: "Clientes", icon: IconUsers },
  { href: "/proyectos", label: "Proyectos", icon: IconFolder },
  { href: "/agentes", label: "Agentes de venta", icon: IconAgent },
  { href: "/fichas", label: "Fichas técnicas", icon: IconFile },
  { href: "/asistente", label: "Asistente IA", icon: IconSparkles },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside className="w-full shrink-0 bg-navy-950 text-slate-300 lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-60 lg:flex-col">
      <div className="flex items-center justify-between gap-3 px-4 py-4 lg:px-5 lg:py-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-cyan-400 text-white shadow-lg shadow-brand-600/20">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <rect x="4" y="6" width="5" height="15" rx="1" fill="currentColor" opacity="0.95" />
              <rect x="10.5" y="3" width="4" height="18" rx="1" fill="currentColor" opacity="0.7" />
              <rect x="16" y="8" width="4" height="13" rx="1" fill="currentColor" opacity="0.45" />
            </svg>
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-semibold text-white">
              Fichas técnicas
            </span>
            <span className="block text-[10.5px] font-medium uppercase tracking-[0.16em] text-slate-400">
              CEYCO · Vidrio
            </span>
          </span>
        </Link>
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:items-stretch lg:gap-0.5 lg:overflow-visible lg:px-3 lg:pb-0">
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

        <Link
          href="/fichas/nueva"
          className="nav-item ml-auto border border-white/15 bg-white/10 text-white hover:bg-white/15 lg:ml-0 lg:mt-4 lg:justify-center lg:border-0 lg:bg-brand-600 lg:hover:bg-brand-700"
        >
          <IconPlus width={16} height={16} />
          <span className="whitespace-nowrap">Nueva ficha</span>
        </Link>
      </nav>

      <div className="hidden border-t border-white/10 px-5 py-4 lg:block">
        <p className="text-[11px] leading-relaxed text-slate-400">
          Prestaciones calculadas con Calumen®. Normas EN 410, EN 673, ISO 9050
          y NFRC.
        </p>
        <p className="mt-2 text-[10px] text-slate-500">
          Documentos informativos · Saint-Gobain
        </p>
      </div>
    </aside>
  );
}
