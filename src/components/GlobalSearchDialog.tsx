"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  BookOpen,
  FileText,
  Package,
  Users,
  X,
  Command,
  ArrowRight,
  Loader2,
} from "lucide-react";

type SearchItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  type: "knowledge" | "spec" | "product" | "client";
};

export function GlobalSearchDialog() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{
    knowledge: SearchItem[];
    specs: SearchItem[];
    products: SearchItem[];
    clients: SearchItem[];
  }>({
    knowledge: [],
    specs: [],
    products: [],
    clients: [],
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // Atajo global Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Enfocar input al abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults({ knowledge: [], specs: [], products: [], clients: [] });
    }
  }, [isOpen]);

  // Búsqueda con debounce
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults({ knowledge: [], specs: [], products: [], clients: [] });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (res.ok) {
          setResults(data);
        }
      } catch {
        // ignorar
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  const totalResults =
    results.knowledge.length +
    results.specs.length +
    results.products.length +
    results.clients.length;

  return (
    <>
      {/* Botón Discreto en la Barra Superior */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs text-slate-400 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-600 transition"
        title="Búsqueda rápida en todo el sistema (Ctrl+K)"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Buscar...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
          Ctrl K
        </kbd>
      </button>

      {/* Modal Spotlight */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          {/* Fondo para cerrar al hacer clic afuera */}
          <div className="fixed inset-0" onClick={() => setIsOpen(false)} />

          <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition">
            {/* Input de Búsqueda */}
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
              <Search className="h-5 w-5 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar normas, fichas técnicas, productos o clientes..."
                className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
              />
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              ) : query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-block rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-400 font-mono">
                  ESC
                </kbd>
              )}
            </div>

            {/* Lista de Resultados */}
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {query && totalResults === 0 && !isLoading && (
                <div className="py-10 text-center text-xs text-slate-400">
                  No se encontraron resultados para &ldquo;{query}&rdquo;
                </div>
              )}

              {/* Sección Conocimiento */}
              {results.knowledge.length > 0 && (
                <div className="mb-2">
                  <p className="px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                    Base de Conocimiento (.md)
                  </p>
                  {results.knowledge.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item.href)}
                      className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-50 transition group"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <BookOpen className="h-4 w-4 text-brand-600 shrink-0" />
                        <div className="truncate">
                          <p className="text-xs font-medium text-slate-900 truncate">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* Sección Fichas Técnicas */}
              {results.specs.length > 0 && (
                <div className="mb-2">
                  <p className="px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                    Fichas Técnicas
                  </p>
                  {results.specs.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item.href)}
                      className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-50 transition group"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                        <div className="truncate">
                          <p className="text-xs font-medium text-slate-900 truncate">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* Sección Productos */}
              {results.products.length > 0 && (
                <div className="mb-2">
                  <p className="px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                    Productos de Catálogo
                  </p>
                  {results.products.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item.href)}
                      className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-50 transition group"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Package className="h-4 w-4 text-purple-600 shrink-0" />
                        <div className="truncate">
                          <p className="text-xs font-medium text-slate-900 truncate">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* Sección Clientes */}
              {results.clients.length > 0 && (
                <div className="mb-2">
                  <p className="px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                    Clientes
                  </p>
                  {results.clients.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item.href)}
                      className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-50 transition group"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Users className="h-4 w-4 text-emerald-600 shrink-0" />
                        <div className="truncate">
                          <p className="text-xs font-medium text-slate-900 truncate">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {!query && (
                <div className="py-6 px-3 text-xs text-slate-400 space-y-2">
                  <p className="font-semibold text-slate-600">Búsqueda Rápida:</p>
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className="chip">Escribe una clave como &quot;NOM-146&quot;</span>
                    <span className="chip">&quot;DGU&quot; o &quot;Templado&quot;</span>
                    <span className="chip">Folio de ficha técnica</span>
                  </div>
                </div>
              )}
            </div>

            {/* Barra inferior de ayuda */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-2 text-[11px] text-slate-400">
              <span>Navega con flechas y Enter</span>
              <span>Presiona Esc para cerrar</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
