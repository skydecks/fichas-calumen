"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  IconAlert,
  IconImage,
  IconSend,
  IconSparkles,
  IconStop,
  IconX,
} from "@/components/icons";
import type { AIFichaContext } from "@/lib/ai-context";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  image?: string;
  error?: boolean;
};

type Attachment = {
  dataUrl: string;
  name: string;
};

const SUGGESTIONS = [
  "Resume las fichas guardadas y sus estados.",
  "¿Qué fichas tienen Rw ≥ 40 dB?",
  "Compara las fichas más recientes y señala diferencias.",
  "Revisa qué datos normativos faltan en las fichas guardadas.",
  "Sugiere un nombre comercial para una composición 12 + 12 + PVB 1.52.",
  "Propón una composición para mejorar el control solar manteniendo buena transmisión luminosa.",
];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function Markdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="mb-2 leading-relaxed last:mb-0">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-slate-900">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        h1: ({ children }) => (
          <h1 className="mb-2 mt-3 text-base font-semibold text-slate-900 first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="mb-1.5 mt-3 text-sm font-semibold text-slate-900 first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mb-1 mt-2.5 text-[13px] font-semibold text-slate-900 first:mt-0">
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="mb-1 mt-2 text-[12.5px] font-semibold text-slate-800 first:mt-0">
            {children}
          </h4>
        ),
        ul: ({ children }) => (
          <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="pl-0.5">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="my-2 border-l-2 border-brand-300 pl-3 text-slate-600">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="my-3 border-slate-200" />,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-brand-600 underline underline-offset-2"
          >
            {children}
          </a>
        ),
        code: ({ children }) => (
          <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-700">
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="my-2 overflow-x-auto rounded-lg bg-slate-900 p-2.5 text-[10.5px] leading-relaxed text-slate-100 [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-inherit">
            {children}
          </pre>
        ),
        table: ({ children }) => (
          <div className="my-2 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full border-collapse text-[11px]">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-slate-50">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="border-b border-slate-200 px-2 py-1.5 text-left font-semibold text-slate-700">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-b border-slate-100 px-2 py-1.5 align-top">
            {children}
          </td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export default function AIChat({
  context,
}: {
  context: AIFichaContext | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, streaming]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  function resetChat() {
    abortRef.current?.abort();
    setMessages([]);
    setInput("");
    setAttachment(null);
    setError(null);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Adjunta una imagen PNG, JPG o WebP.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("La imagen supera los 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setError(null);
      setAttachment({
        dataUrl: String(reader.result),
        name: file.name,
      });
    };
    reader.onerror = () => setError("No se pudo leer la imagen.");
    reader.readAsDataURL(file);
  }

  async function send(textOverride?: string) {
    if (streaming) return;
    const text = (textOverride ?? input).trim();
    if (!text && !attachment) return;

    const attached = attachment;
    const userMessage: ChatMessage = {
      id: makeId(),
      role: "user",
      content: text || "Analiza la imagen adjunta.",
      image: attached?.dataUrl,
    };
    const assistantId = makeId();
    const history = [...messages, userMessage]
      .slice(-12)
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    setMessages((previous) => [
      ...previous,
      userMessage,
      { id: assistantId, role: "assistant", content: "", reasoning: "" },
    ]);
    setInput("");
    setAttachment(null);
    setError(null);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          context,
          image: attached?.dataUrl,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          payload?.error ?? "No se pudo contactar con el asistente.",
        );
      }
      if (!response.body) {
        throw new Error("El asistente no devolvió una respuesta.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const consumeEvent = (raw: string) => {
        const line = raw
          .split("\n")
          .find((candidate) => candidate.startsWith("data:"));
        if (!line) return;
        const data = line.slice(5).trim();
        if (!data) return;
        let event: { type?: string; text?: string; message?: string };
        try {
          event = JSON.parse(data) as typeof event;
        } catch {
          return;
        }
        if (event.type === "content" && event.text) {
          const chunk = event.text;
          setMessages((previous) =>
            previous.map((message) =>
              message.id === assistantId
                ? { ...message, content: message.content + chunk }
                : message,
            ),
          );
        } else if (event.type === "reasoning" && event.text) {
          const chunk = event.text;
          setMessages((previous) =>
            previous.map((message) =>
              message.id === assistantId
                ? {
                    ...message,
                    reasoning: `${message.reasoning ?? ""}${chunk}`,
                  }
                : message,
            ),
          );
        } else if (event.type === "error" && event.message) {
          setError(event.message);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";
        blocks.forEach(consumeEvent);
      }
      if (buffer.trim()) consumeEvent(buffer);
    } catch (caught) {
      const aborted = caught instanceof Error && caught.name === "AbortError";
      if (!aborted) {
        const message =
          caught instanceof Error
            ? caught.message
            : "No se pudo obtener respuesta del asistente.";
        setError(message);
        setMessages((previous) =>
          previous.map((item) =>
            item.id === assistantId && !item.content
              ? {
                  ...item,
                  content: "No se pudo obtener respuesta del asistente.",
                  error: true,
                }
              : item,
          ),
        );
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
      setMessages((previous) =>
        previous.map((item) =>
          item.id === assistantId &&
          !item.content &&
          !item.error &&
          !controller.signal.aborted
            ? {
                ...item,
                content:
                  "No se recibió texto del modelo. Revisa el razonamiento o vuelve a intentarlo.",
              }
            : item,
        ),
      );
    }
  }

  const contextLabel = context
    ? context.nombreComercial || context.folio
    : "Catálogo de fichas guardadas";

  return (
    <div className="flex h-[72vh] min-h-[540px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-cyan-400 text-white shadow-sm">
            <IconSparkles width={17} height={17} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">
              Asistente técnico
            </p>
            <p className="truncate text-[11px] text-slate-500">
              {context ? `Contexto: ${contextLabel}` : contextLabel}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="badge badge-blue hidden sm:inline-flex">
            SkyDeck ICS
          </span>
          {messages.length > 0 ? (
            <button
              type="button"
              onClick={resetChat}
              className="btn-ghost btn-sm"
            >
              Nueva consulta
            </button>
          ) : null}
        </div>
      </header>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4"
      >
        {messages.length === 0 ? (
          <div className="flex min-h-full flex-col items-center justify-center px-1 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
              <IconSparkles width={22} height={22} />
            </span>
            <h2 className="mt-3 text-base font-semibold text-slate-900">
              Consulta tus fichas con IA
            </h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500">
              Puedo consultar las fichas guardadas, comparar prestaciones,
              revisar la coherencia frente a las normas y sugerir nombres o
              composiciones de vidrio.
            </p>
            <div className="mt-5 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void send(suggestion)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-xs leading-relaxed text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-slate-900"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => {
              const isLast = index === messages.length - 1;
              return (
                <div
                  key={message.id}
                  data-ai-message={message.role}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm",
                      message.role === "user"
                        ? "bg-brand-600 text-white"
                        : "border border-slate-200 bg-white text-slate-800",
                      message.error && "border-red-200 bg-red-50 text-red-700",
                    )}
                  >
                    {message.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={message.image}
                        alt="Adjunto"
                        className="mb-2 max-h-40 rounded-lg border border-white/30 object-contain"
                      />
                    ) : null}

                    {message.role === "assistant" && message.reasoning ? (
                      <details className="mb-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-500">
                        <summary className="cursor-pointer select-none font-medium">
                          Razonamiento del modelo
                        </summary>
                        <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap font-sans text-[10.5px] leading-relaxed">
                          {message.reasoning}
                        </pre>
                      </details>
                    ) : null}

                    <div className="break-words">
                      {message.content ? (
                        message.role === "assistant" ? (
                          <Markdown content={message.content} />
                        ) : (
                          <p className="whitespace-pre-wrap">
                            {message.content}
                          </p>
                        )
                      ) : streaming && isLast ? (
                        <span className="inline-flex items-center gap-1.5 text-slate-400">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" />
                          Analizando…
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 bg-white p-3">
        {error ? (
          <div className="mb-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <IconAlert width={14} height={14} className="mt-0.5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700"
              title="Cerrar aviso"
            >
              <IconX width={13} height={13} />
            </button>
          </div>
        ) : null}

        {attachment ? (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attachment.dataUrl}
              alt={attachment.name}
              className="h-10 w-10 rounded-md object-cover"
            />
            <span className="min-w-0 flex-1 truncate text-xs text-slate-600">
              {attachment.name}
            </span>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              className="icon-btn h-7 w-7"
              title="Quitar imagen"
            >
              <IconX width={13} height={13} />
            </button>
          </div>
        ) : null}

        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onFileChange}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="icon-btn h-10 w-10 shrink-0"
            title="Adjuntar imagen"
            disabled={streaming}
          >
            <IconImage width={17} height={17} />
          </button>

          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            rows={2}
            className="textarea max-h-32 min-h-[42px] flex-1 resize-none text-[13px]"
            placeholder="Pregunta sobre fichas, normas o composiciones…"
          />

          {streaming ? (
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              className="btn-danger h-10 shrink-0 px-3"
              title="Detener"
            >
              <IconStop width={16} height={16} />
              <span className="hidden sm:inline">Detener</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void send()}
              disabled={!input.trim() && !attachment}
              className="btn-primary h-10 shrink-0 px-3"
              title="Enviar"
            >
              <IconSend width={16} height={16} />
              <span className="hidden sm:inline">Enviar</span>
            </button>
          )}
        </div>

        <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
          La IA puede cometer errores. Verifica los datos y la normativa antes de
          emitir una ficha. Se consultan las fichas guardadas; las fichas nuevas
          deben guardarse para aparecer en el catálogo.
        </p>
      </div>
    </div>
  );
}
