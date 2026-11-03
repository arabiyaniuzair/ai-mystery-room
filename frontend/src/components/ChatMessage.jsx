import React from 'react';
import { BookOpen } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

/**
 * Shared message rendering component for ChatbotSentinel.
 * - User messages remain rendered as plain-text preserved layout with pre-line.
 * - Assistant messages are safely parsed and rendered with full Markdown support.
 * - Optional quick-action buttons (like Field Guide) are preserved.
 */
export const ChatMessage = ({ message, onOpenHowToPlay }) => {
  if (!message) return null;

  const isUser = message.role === 'user';

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs shadow-md break-words ${
          isUser
            ? 'bg-cyan-600 text-black font-medium rounded-tr-none'
            : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none font-sans leading-relaxed overflow-hidden'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-line">{message.text}</p>
        ) : (
          <MarkdownRenderer content={message.text} />
        )}

        {/* Optional Quick Action Button to Open Field Guide */}
        {message.showGuideButton && onOpenHowToPlay && (
          <button
            type="button"
            onClick={onOpenHowToPlay}
            className="mt-2.5 w-full py-1.5 px-3 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 hover:text-white hover:bg-cyan-900/60 font-mono text-[11px] font-bold flex items-center justify-center space-x-1.5 transition-all shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Open Visual Field Guide</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;

