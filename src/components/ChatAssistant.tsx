"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Sparkles, Minus, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Halo! Saya ERP AI Assistant. Ada yang bisa saya bantu hari ini?",
      timestamp: new Date(),
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input;
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: currentInput }),
      });
      const data = await res.json();
      
      if (data.success) {
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error(data.error || "Gagal mendapatkan respon");
      }
    } catch (err) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Maaf, terjadi gangguan koneksi. Silakan coba lagi nanti.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[60] h-14 w-14 rounded-full bg-indigo-600 text-white shadow-2xl shadow-indigo-500/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
        >
          <div className="absolute inset-0 rounded-full bg-indigo-500 animate-ping opacity-20"></div>
          <MessageCircle className="h-6 w-6 relative z-10" />
          <div className="absolute -top-1 -right-1 h-5 w-5 bg-rose-500 border-2 border-white dark:border-slate-900 rounded-full flex items-center justify-center text-[10px] font-bold">1</div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[60] w-[380px] h-[550px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white shrink-0">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="h-10 w-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                      <Bot className="h-5 w-5" />
                   </div>
                   <div>
                      <h3 className="font-bold text-sm tracking-tight">ERP AI Assistant</h3>
                      <div className="flex items-center gap-1.5">
                         <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                         <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Online & Active</span>
                      </div>
                   </div>
                </div>
                <div className="flex items-center gap-1">
                   <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                      <Minus className="h-4 w-4" />
                   </button>
                   <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                      <X className="h-4 w-4" />
                   </button>
                </div>
             </div>
          </div>

          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth custom-scrollbar">
             {messages.map((msg) => (
               <div key={msg.id} className={cn("flex flex-col", msg.role === "user" ? "items-end" : "items-start")}>
                  <div className={cn(
                    "max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed",
                    msg.role === "user" 
                      ? "bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-500/20" 
                      : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-slate-700 shadow-sm"
                  )}>
                    {msg.content}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1.5 font-bold uppercase tracking-tighter">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
               </div>
             ))}
             {isTyping && (
               <div className="flex items-start gap-2">
                  <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-700 flex gap-1">
                     <div className="h-1 w-1 bg-slate-400 rounded-full animate-bounce" />
                     <div className="h-1 w-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                     <div className="h-1 w-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
               </div>
             )}
          </div>

          {/* Input Area */}
          <div className="p-5 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 shrink-0">
             <div className="relative flex items-center gap-2">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Tanyakan stok, penjualan, atau bantuan..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-4 pr-12 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium dark:text-white placeholder:text-slate-400"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="absolute right-1.5 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                >
                  <Send className="h-4 w-4" />
                </button>
             </div>
             <p className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-3 flex items-center justify-center gap-1">
                <Sparkles className="h-2.5 w-2.5 text-indigo-500" /> Powered by ERP Intelligence Engine
             </p>
          </div>
        </div>
      )}
    </>
  );
}
