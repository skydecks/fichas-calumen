"use client";

import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "calumen.theme";

function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // El navegador puede bloquear localStorage; el cambio visual sigue activo.
  }
}

export default function ThemeToggle({ className }: { className?: string }) {
  function toggle() {
    const next = document.documentElement.classList.contains("dark")
      ? "light"
      : "dark";
    applyTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={className ?? "icon-btn"}
      aria-label="Cambiar entre modo claro y oscuro"
      title="Cambiar modo claro/oscuro"
    >
      <Sun width={16} height={16} className="hidden dark:block" />
      <Moon width={16} height={16} className="block dark:hidden" />
    </button>
  );
}
