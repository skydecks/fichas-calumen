import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function AiMarkdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={className}>
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
            <h1 className="mb-2 text-lg font-semibold tracking-tight text-slate-900">
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
            <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="pl-0.5">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-brand-300 pl-3 text-slate-600">{children}</blockquote>
          ),
          hr: () => <hr className="my-3 border-slate-200" />,
          a: ({ href, children }) => {
            const isKnowledge =
              href &&
              (href.startsWith("/conocimiento") ||
                href.includes("/conocimiento/"));
            if (isKnowledge) {
              return (
                <a
                  href={href}
                  className="inline-flex items-center gap-1 rounded bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 hover:bg-brand-100 border border-brand-200 transition-colors mx-0.5 no-underline"
                  title="Abrir artículo en la base de conocimiento de Calumen"
                >
                  <span className="text-[10px]">📖</span>
                  <span>{children}</span>
                </a>
              );
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="text-brand-600 underline underline-offset-2 hover:text-brand-800"
              >
                {children}
              </a>
            );
          },
          code: ({ children }) => (
            <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-700">{children}</code>
          ),
          pre: ({ children }) => (
            <pre className="my-2 overflow-x-auto rounded-lg bg-slate-900 p-2.5 text-[10.5px] leading-relaxed text-slate-100 [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-inherit">{children}</pre>
          ),
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto rounded-lg border border-slate-200"><table className="w-full border-collapse text-[11px]">{children}</table></div>
          ),
          thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
          th: ({ children }) => (
            <th className="border-b border-slate-200 px-2 py-1.5 text-left font-semibold text-slate-700">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border-b border-slate-100 px-2 py-1.5 align-top">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
