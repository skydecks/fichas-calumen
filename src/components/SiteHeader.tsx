"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import InstallAppButton from "@/components/InstallAppButton";

const labels: Record<string, string> = {
  "/": "Inicio",
  "/clientes": "Clientes",
  "/proyectos": "Proyectos",
  "/agentes": "Agentes de venta",
  "/fichas": "Fichas técnicas",
  "/fichas/nueva": "Nueva ficha",
  "/productos": "Productos",
  "/asistente": "Asistente IA",
  "/conocimiento": "Conocimiento",
  "/conocimiento/nuevo": "Nuevo artículo",
  "/configuracion": "Configuración",
};

function getLabel(pathname: string): string {
  if (labels[pathname]) return labels[pathname];
  if (pathname.startsWith("/clientes/")) return "Detalle de cliente";
  if (pathname.startsWith("/proyectos/")) return "Detalle de proyecto";
  if (pathname.startsWith("/agentes/")) return "Detalle de agente";
  if (pathname.startsWith("/fichas/")) return "Editar ficha";
  if (pathname.startsWith("/productos/")) return "Detalle de producto";
  if (pathname.startsWith("/conocimiento/")) return "Artículo de conocimiento";
  return "Fichas técnicas";
}

export default function SiteHeader() {
  const pathname = usePathname();
  const title = getLabel(pathname);
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/90 backdrop-blur">
      <div className="flex min-w-0 flex-1 items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            {!isHome ? (
              <>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink asChild>
                    <Link href="/">Inicio</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
              </>
            ) : null}
            <BreadcrumbItem>
              <BreadcrumbPage>{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex items-center gap-2 px-4">
        <InstallAppButton />
        <ThemeToggle className="icon-btn h-8 w-8 border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" />
        <Button asChild size="sm">
          <Link href="/fichas/nueva">
            <Plus />
            Nueva ficha
          </Link>
        </Button>
      </div>
    </header>
  );
}
