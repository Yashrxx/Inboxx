/**
 * Shared Markdown renderer used by both the chat widget (Bubble) and the
 * Review page answer panel.  Parses GFM (tables, task lists, strikethrough)
 * and renders images responsively.  Keep this as the single source of truth
 * so the two surfaces always look identical.
 */
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div
      className={`prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 ${className ?? ""}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ node, ...props }) => (
            <div className="my-4 overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 text-sm" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => <thead className="bg-gray-50" {...props} />,
          th: ({ node, ...props }) => (
            <th
              className="px-4 py-3 text-left font-semibold text-gray-900 tracking-wider border-b border-gray-200"
              {...props}
            />
          ),
          tbody: ({ node, ...props }) => (
            <tbody className="divide-y divide-gray-100 bg-white" {...props} />
          ),
          tr: ({ node, ...props }) => (
            <tr className="hover:bg-gray-50/50 transition-colors" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td
              className="px-4 py-2.5 text-gray-700 whitespace-normal align-top border-b border-gray-100"
              {...props}
            />
          ),
          img: ({ node, ...props }) => (
            <span className="my-4 flex flex-col items-start gap-2 block w-full">
              <img
                {...props}
                className="max-w-full rounded-md border border-border shadow-sm object-contain"
                style={{ maxHeight: 350 }}
                alt={props.alt || "Image"}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              {props.alt && (
                <span className="text-sm text-muted-foreground italic">{props.alt}</span>
              )}
            </span>
          ),
        }}
      >
        {content || "…"}
      </ReactMarkdown>
    </div>
  );
}
