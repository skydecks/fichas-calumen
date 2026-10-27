"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ChevronsUpDown,
  FileText,
  Folder,
  Home,
  LogOut,
  Package,
  Plus,
  Settings,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppSettings } from "@/lib/app-settings";

const mainLinks = [
  { href: "/", label: "Inicio", icon: Home, exact: true },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/proyectos", label: "Proyectos", icon: Folder },
  { href: "/agentes", label: "Agentes de venta", icon: UserRound },
  { href: "/fichas", label: "Fichas técnicas", icon: FileText },
];

const catalogLinks = [
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/asistente", label: "Asistente IA", icon: Sparkles },
  { href: "/conocimiento", label: "Conocimiento", icon: BookOpen },
];

const systemLinks = [
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const settings = useAppSettings();

  // En móvil, el menú es un panel emergente: ciérralo en cuanto cambia la ruta.
  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);
  const appName = settings.appName || "Fichas técnicas";
  const organization = [settings.organizationName, settings.organizationTagline]
    .filter(Boolean)
    .join(" · ");
  const initials = (settings.organizationName || "CEYCO")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.assign("/login");
    }
  }

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/" className="text-sidebar-foreground">
                {settings.organizationLogo ? (
                  <span className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg bg-white p-0.5">
                    <img
                      src={settings.organizationLogo}
                      alt={settings.organizationName || "Logo"}
                      className="size-7 object-contain"
                    />
                  </span>
                ) : (
                  <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                      <rect x="4" y="6" width="5" height="15" rx="1" fill="currentColor" opacity="0.95" />
                      <rect x="10.5" y="3" width="4" height="18" rx="1" fill="currentColor" opacity="0.7" />
                      <rect x="16" y="8" width="4" height="13" rx="1" fill="currentColor" opacity="0.45" />
                    </svg>
                  </span>
                )}
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{appName}</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">
                    {organization || "CEYCO · Vidrio"}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainLinks.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href, item.exact)}
                    tooltip={item.label}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Nueva ficha">
                  <Link href="/fichas/nueva">
                    <Plus />
                    <span>Nueva ficha</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Catálogo</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {catalogLinks.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={item.label}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/configuracion")} tooltip="Configuración">
              <Link href="/configuracion">
                <Settings />
                <span>Configuración</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  {settings.organizationLogo ? (
                    <span className="flex h-8 w-16 shrink-0 items-center justify-center overflow-hidden bg-white p-0.5">
                      <img
                        src={settings.organizationLogo}
                        alt={settings.organizationName || "Organización"}
                        className="h-full w-full object-contain"
                      />
                    </span>
                  ) : (
                    <span className="flex h-8 w-16 shrink-0 items-center justify-center bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
                      {initials || "CE"}
                    </span>
                  )}
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {settings.organizationName || "CEYCO"}
                    </span>
                    <span className="truncate text-xs">
                      {settings.organizationTagline || "Vidrio"}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="right"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    {settings.organizationLogo ? (
                      <span className="flex h-8 w-16 shrink-0 items-center justify-center overflow-hidden bg-white p-0.5">
                        <img
                          src={settings.organizationLogo}
                          alt={settings.organizationName || "Organización"}
                          className="h-full w-full object-contain"
                        />
                      </span>
                    ) : (
                      <span className="flex h-8 w-16 shrink-0 items-center justify-center bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
                        {initials || "CE"}
                      </span>
                    )}
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {settings.organizationName || "CEYCO"}
                      </span>
                      <span className="truncate text-xs">
                        {settings.supportLine || "Sesión activa"}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/configuracion">
                    <Settings />
                    Configuración
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/productos">
                    <Package />
                    Catálogo de productos
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void logout()}>
                  <LogOut />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
