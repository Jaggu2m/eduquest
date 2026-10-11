import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, className = '' }) => {
  return (
    <div className={`markdown-body text-stone-800 text-sm leading-relaxed space-y-4 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-extrabold text-stone-900 mt-5 mb-3 tracking-tight border-b border-[#EAE2D5] pb-2 flex items-center gap-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold text-stone-900 mt-5 mb-2.5 tracking-tight flex items-center gap-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-bold text-stone-850 mt-4 mb-2 tracking-tight flex items-center gap-1.5">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-bold text-stone-800 mt-3 mb-1.5">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-stone-700 leading-relaxed my-2 text-sm">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1.5 my-3 pl-2 text-stone-700 text-sm">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1.5 my-3 pl-2 text-stone-700 text-sm font-medium">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">
              <span className="font-normal text-stone-700">{children}</span>
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-stone-900">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-stone-600">{children}</em>
          ),
          hr: () => (
            <hr className="my-5 border-[#EAE2D5]" />
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-[#EA580C] bg-orange-50/50 pl-4 py-2 my-3 rounded-r-xl italic text-stone-700">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-2xl border border-[#EAE2D5] bg-white shadow-xs">
              <table className="w-full text-left text-sm border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#F7F2EB] border-b border-[#EAE2D5] text-xs uppercase tracking-wider text-stone-700 font-bold">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-[#EAE2D5]/70 bg-white">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-[#FAF6F0]/60 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="py-3 px-4 font-bold text-stone-850">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="py-3 px-4 text-stone-700 text-sm align-top leading-normal">
              {children}
            </td>
          ),
          code: ({ children }) => (
            <code className="bg-stone-100 text-[#EA580C] px-1.5 py-0.5 rounded-md text-xs font-mono font-medium">
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
