"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

export function SubmitButton({
  children,
  className,
  pendingLabel = "Guardando…",
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={cn(className ?? "btn-primary", pending && "opacity-70")}
      disabled={pending}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function ConfirmButton({
  children,
  message,
  className,
  title,
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="submit"
      className={className ?? "btn-danger btn-sm"}
      title={title}
      aria-label={title}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
