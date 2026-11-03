import React, { useState, useRef, useEffect } from 'react';
import { botAPI } from '../services/api';
import { Shield, MessageCircle, X, Send, Loader2, BookOpen, Compass, Award } from 'lucide-react';
import { ChatMessage } from './ChatMessage';

const SUGGESTED_QUESTIONS = [
  'How do I play this website?',
  'How many points do I have?',
  'How do I create a mystery?',
  'What happens if my answer is wrong?',
];

export const ChatbotSentinel = ({ onOpenHowToPlay }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Greetings, Detective. I am your **Mystery Assistant**. Ask me anything about how to play, where to find clues, or your real-time detective scores!",
      showGuideButton: false,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend) => {
    const message = (textToSend || input).trim();
    if (!message || loading) return;

    setInput('');
    const newMessages = [...messages, { role: 'user', text: message }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const historyPayload = newMessages.slice(-6).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await botAPI.sendMessage(message, historyPayload);
      const replyText = res.data.reply || 'Inquiry acknowledged.';
      const isGuideQuery =
        message.toLowerCase().includes('guide') ||
        message.toLowerCase().includes('manual') ||
        message.toLowerCase().includes('how to play');

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: replyText,
          showGuideButton: isGuideQuery,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Radio transmission disrupted. Click the **Field Guide** button in the top navigation bar to read the full detective handbook.',
          showGuideButton: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center space-x-2 px-4 py-3 rounded-full bg-cyan-600 hover:bg-cyan-500 text-black font-mono font-bold text-xs uppercase tracking-wider shadow-2xl shadow-cyan-950/80 transition-all hover:scale-105"
        >
          <div className="w-6 h-6 rounded-full bg-black/20 flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-black" />
          </div>
          <span>Mystery Assistant</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute -top-1 -right-1" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-[92vw] sm:w-96 h-[530px] rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white font-mono flex items-center space-x-1.5">
                  <span>MYSTERY ASSISTANT</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </h4>
                <p className="text-[10px] text-slate-400 font-mono">Investigation Guide & Concierge</p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              {onOpenHowToPlay && (
                <button
                  onClick={onOpenHowToPlay}
                  title="Open Visual Field Guide"
                  className="p-1 rounded-md text-cyan-400 hover:text-white hover:bg-cyan-950/50 transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#0B0F17]">
            {messages.map((msg, idx) => (
              <ChatMessage
                key={idx}
                message={msg}
                onOpenHowToPlay={onOpenHowToPlay}
              />
            ))}

            {loading && (
              <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>Mystery Assistant is formulating response...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Query Suggestions */}
          <div className="p-2 border-t border-slate-800 bg-slate-950 flex items-center space-x-1.5 overflow-x-auto scrollbar-none text-[10px] font-mono">
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                disabled={loading}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300 transition-colors disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 border-t border-slate-800 bg-slate-950 flex items-center space-x-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Mystery Assistant about gameplay, evidence, or scores..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black transition-colors disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
