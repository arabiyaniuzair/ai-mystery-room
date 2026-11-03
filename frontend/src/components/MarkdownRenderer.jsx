import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

/**
 * Validates whether a URL is safe to open as a hyperlink.
 * Only allows http:, https:, mailto:, and safe relative paths (/ or #).
 * Disallows javascript:, data:, vbscript:, and protocol-relative (//) URLs.
 */
export const isSafeUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();

  // Disallow protocol-relative URLs (e.g. //evil.com)
  if (trimmed.startsWith('//')) return false;

  // Safe relative paths or anchors within the application
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
    return true;
  }

  // Absolute URLs: only permit http, https, and mailto
  try {
    const parsed = new URL(trimmed);
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

/**
 * Custom styling components for ReactMarkdown to integrate
 * seamlessly with AI Mystery Room dark neon theme.
 */
export const markdownComponents = {
  // Safe link handler
  a: ({ href, children, node, ...props }) => {
    if (!isSafeUrl(href)) {
      return <span className="text-slate-300 font-medium">{children}</span>;
    }
    const isExternal = href.startsWith('http://') || href.startsWith('https://');
    return (
      <a
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 break-all transition-colors"
        {...props}
      >
        {children}
      </a>
    );
  },

  // Paragraphs
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
  ),

  // Headings
  h1: ({ children }) => (
    <h1 className="text-sm font-bold text-white mt-2 mb-1 border-b border-slate-800 pb-1">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xs font-bold text-white mt-2 mb-1">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-xs font-semibold text-cyan-300 mt-1.5 mb-0.5">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-xs font-semibold text-cyan-400 mt-1 mb-0.5">{children}</h4>
  ),
  h5: ({ children }) => (
    <h5 className="text-xs font-medium text-cyan-400 mt-1 mb-0.5">{children}</h5>
  ),
  h6: ({ children }) => (
    <h6 className="text-xs font-medium text-cyan-400 mt-1 mb-0.5">{children}</h6>
  ),

  // Lists
  ul: ({ children }) => (
    <ul className="list-disc list-outside pl-4 space-y-1 my-1.5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-outside pl-4 space-y-1 my-1.5">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-slate-200 leading-relaxed pl-0.5">{children}</li>
  ),

  // Emphasis
  strong: ({ children }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-slate-300">{children}</em>
  ),

  // Code
  code: ({ className, children, node, ...props }) => {
    const isInline = !className && !String(children).includes('\n');
    return isInline ? (
      <code
        className="font-mono bg-slate-950/80 border border-slate-800 text-cyan-300 px-1 py-0.5 rounded text-[11px] break-all"
        {...props}
      >
        {children}
      </code>
    ) : (
      <code className="font-mono text-cyan-300 text-[11px]" {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="font-mono bg-slate-950 border border-slate-800 text-slate-200 p-2.5 rounded-lg my-2 overflow-x-auto text-[11px] leading-snug">
      {children}
    </pre>
  ),

  // Blockquotes
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-cyan-500/60 pl-2.5 my-1.5 italic text-slate-400">
      {children}
    </blockquote>
  ),

  // Tables
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full text-[11px] border border-slate-800 divide-y divide-slate-800">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="px-2 py-1 bg-slate-950 font-bold text-left text-slate-300 border border-slate-800">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-2 py-1 border border-slate-800 text-slate-300">
      {children}
    </td>
  ),

  // Horizontal rule
  hr: () => <hr className="my-2 border-slate-800" />,
};

/**
 * Shared Markdown renderer component for AI Assistant responses.
 * Renders bold, italic, lists, code, headings, paragraphs, and links securely
 * without dangerouslySetInnerHTML. Raw HTML parsing is disabled by default.
 */
export const MarkdownRenderer = ({ content }) => {
  if (!content || typeof content !== 'string') {
    return null;
  }

  return (
    <div className="chatbot-markdown-content break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
