"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ComboboxContextValue = {
  items: readonly string[];
  filteredItems: readonly string[];
  query: string;
  selected: string;
  open: boolean;
  activeIndex: number;
  inputId: string;
  listId: string;
  setOpen: (open: boolean) => void;
  setQuery: (query: string) => void;
  setSearch: (search: string) => void;
  setActiveIndex: (index: number) => void;
  select: (value: string) => void;
  updateValue: (value: string) => void;
  clear: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
};

const ComboboxContext = React.createContext<ComboboxContextValue | null>(null);

function useComboboxContext() {
  const context = React.useContext(ComboboxContext);
  if (!context) {
    throw new Error("Combobox components must be used inside <Combobox>.");
  }
  return context;
}

export function Combobox({
  items,
  value,
  defaultValue = "",
  onValueChange,
  children,
  className,
}: {
  items: readonly string[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const selected = value ?? internalValue;
  const [query, setQuery] = React.useState(selected);
  const [search, setSearch] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputId = React.useId();
  const listId = React.useId();

  const filteredItems = React.useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("es");
    if (!needle) return items;
    return items.filter((item) =>
      item.toLocaleLowerCase("es").includes(needle),
    );
  }, [items, search]);

  React.useEffect(() => {
    setQuery(selected);
  }, [selected]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [search]);

  React.useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function updateValue(next: string) {
    if (value === undefined) setInternalValue(next);
    onValueChange?.(next);
  }

  function select(next: string) {
    setQuery(next);
    setSearch("");
    updateValue(next);
    setOpen(false);
    inputRef.current?.focus();
  }

  function clear() {
    setQuery("");
    setSearch("");
    updateValue("");
    setOpen(true);
    inputRef.current?.focus();
  }

  return (
    <ComboboxContext.Provider
      value={{
        items,
        filteredItems,
        query,
        selected,
        open,
        activeIndex,
        inputId,
        listId,
        setOpen,
        setQuery,
        setSearch,
        setActiveIndex,
        select,
        updateValue,
        clear,
        inputRef,
      }}
    >
      <div ref={rootRef} className={cn("relative", className)}>
        {children}
      </div>
    </ComboboxContext.Provider>
  );
}

export function ComboboxInput({
  label,
  hint,
  className,
  onFocus,
  onBlur,
  onKeyDown,
  onChange,
  ...props
}: React.ComponentProps<"input"> & {
  label?: string;
  hint?: string;
}) {
  const {
    query,
    filteredItems,
    open,
    activeIndex,
    listId,
    inputId,
    inputRef,
    setOpen,
    setQuery,
    setSearch,
    setActiveIndex,
    select,
    updateValue,
    clear,
  } = useComboboxContext();

  return (
    <div>
      {label ? (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <input
          {...props}
          ref={inputRef}
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            setSearch(next);
            setOpen(true);
            updateValue(next);
            onChange?.(event);
          }}
          onFocus={(event) => {
            setOpen(true);
            setSearch("");
            setActiveIndex(0);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            window.setTimeout(() => setOpen(false), 140);
            onBlur?.(event);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex(
                filteredItems.length > 0
                  ? (activeIndex + 1) % filteredItems.length
                  : 0,
              );
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex(
                filteredItems.length > 0
                  ? (activeIndex - 1 + filteredItems.length) %
                      filteredItems.length
                  : 0,
              );
            } else if (event.key === "Enter") {
              if (filteredItems.length > 0) {
                event.preventDefault();
                select(filteredItems[activeIndex] ?? filteredItems[0]);
              } else {
                setOpen(false);
              }
            } else if (event.key === "Escape") {
              setOpen(false);
            }
            onKeyDown?.(event);
          }}
          className={cn("input pr-16", className)}
        />
        <div className="absolute inset-y-0 right-1.5 flex items-center gap-0.5">
          {query ? (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={clear}
              className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Limpiar selección"
            >
              <X width={13} height={13} />
            </button>
          ) : null}
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setOpen(!open);
              inputRef.current?.focus();
            }}
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label={open ? "Cerrar opciones" : "Abrir opciones"}
            tabIndex={-1}
          >
            <ChevronsUpDown width={14} height={14} />
          </button>
        </div>
      </div>
      {hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

export function ComboboxContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { open, listId } = useComboboxContext();
  if (!open) return null;
  return (
    <div
      id={listId}
      className={cn(
        "absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/10",
        className,
      )}
      onMouseDown={(event) => event.preventDefault()}
    >
      {children}
    </div>
  );
}

export function ComboboxList({
  children,
  className,
}: {
  children: (item: string) => React.ReactNode;
  className?: string;
}) {
  const { filteredItems } = useComboboxContext();
  if (filteredItems.length === 0) return null;
  return (
    <div
      role="listbox"
      className={cn("max-h-56 overflow-y-auto overscroll-contain", className)}
    >
      {filteredItems.map((item) => children(item))}
    </div>
  );
}

export function ComboboxItem({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { selected, activeIndex, filteredItems, setActiveIndex, select } =
    useComboboxContext();
  const index = filteredItems.indexOf(value);
  const isActive = index === activeIndex;
  const isSelected = selected === value;

  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      onMouseDown={(event) => {
        event.preventDefault();
        select(value);
      }}
      onMouseEnter={() => {
        if (index >= 0) setActiveIndex(index);
      }}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition",
        isActive ? "bg-brand-50 text-brand-800" : "text-slate-700",
        isSelected && "font-semibold",
        className,
      )}
    >
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {isSelected ? (
        <Check width={14} height={14} className="shrink-0 text-brand-600" />
      ) : null}
    </button>
  );
}

export function ComboboxEmpty({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { filteredItems } = useComboboxContext();
  if (filteredItems.length > 0) return null;
  return (
    <p className={cn("px-2.5 py-3 text-xs text-slate-500", className)}>
      {children}
    </p>
  );
}
