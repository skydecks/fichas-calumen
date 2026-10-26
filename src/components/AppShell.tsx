"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import type PerfectScrollbar from "perfect-scrollbar";
import AppSidebar from "@/components/AppSidebar";
import SiteHeader from "@/components/SiteHeader";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLogin) return;
    const container = mainRef.current;
    if (!container) return;

    let instance: PerfectScrollbar | null = null;
    let disposed = false;
    let frame = 0;

    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => instance?.update());
    };

    void import("perfect-scrollbar").then(({ default: PerfectScrollbarClass }) => {
      if (disposed) return;
      instance = new PerfectScrollbarClass(container, {
        suppressScrollX: true,
        wheelPropagation: true,
        minScrollbarLength: 40,
      });
      update();
    });

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(container);
    const content = container.querySelector("main");
    if (content) resizeObserver.observe(content);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      instance?.destroy();
    };
  }, [isLogin, pathname]);

  if (isLogin) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full">{children}</div>
      </main>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset
        ref={mainRef}
        className="max-h-[98.5svh] overflow-hidden rounded-t-xl"
      >
        <SiteHeader />
        <main className="flex flex-1 flex-col p-4 sm:p-6">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
