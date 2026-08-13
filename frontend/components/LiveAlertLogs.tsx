"use client";

import { useEffect, useState, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { socket } from '@/lib/socket';
import { Terminal, ShieldAlert, ChevronDown, ChevronUp, BellRing, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface DispatchLog {
  id: string;
  protocolCode: string;
  cep: string;
  numResidents: number;
  channel: string;
  status: string;
  message: string;
  createdAt: string | Date;
}

export function LiveAlertLogs() {
  const [logs, setLogs] = useState<DispatchLog[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Carregar histórico inicial do banco SQLite
    const loadInitialDispatches = async () => {
      try {
        const res = await apiFetch('/api/alerts');
        const data = await res.json();
        if (Array.isArray(data)) {
          setLogs(data.reverse()); // Ordena para os mais recentes no final (estilo terminal)
        }
      } catch (err) {
        console.error("Failed to load initial dispatch logs:", err);
      }
    };

    loadInitialDispatches();

    // 2. Ouvir disparos de alerta em tempo real via WebSocket
    socket.on('alertDispatched', (newLog: DispatchLog) => {
      setLogs((prev) => {
        const next = [...prev, newLog];
        // Limitar logs exibidos no terminal a 25 registros
        if (next.length > 25) return next.slice(next.length - 25);
        return next;
      });

      // Tocar som de bipe de terminal ao receber novo log
      try {
        const audio = new Audio('/beep.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch {}

      if (!isOpen) {
        setNewCount((c) => c + 1);
      }
    });

    return () => {
      socket.off('alertDispatched');
    };
  }, [isOpen]);

  useEffect(() => {
    // Rola o terminal para o fim ao receber novos logs
    if (feedEndRef.current) {
      feedEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  const clearNotifications = () => {
    setIsOpen(!isOpen);
    setNewCount(0);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-lg w-full px-4 md:px-0">
      {/* Floating Toggle Badge Button */}
      <div className="flex justify-end mb-2">
        <button 
          onClick={clearNotifications}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full border shadow-2xl font-mono text-xs transition-all duration-300 active:scale-95 ${
            newCount > 0 
              ? 'bg-red-600/90 text-white border-red-500 hover:bg-red-500 animate-pulse shadow-red-500/20' 
              : 'bg-black/85 backdrop-blur-md text-emerald-400 border-emerald-500/30 hover:border-emerald-500/60 hover:bg-black/90'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Console de Disparo</span>
          {newCount > 0 && (
            <span className="flex items-center justify-center bg-white text-red-600 font-bold w-4 h-4 rounded-full text-[10px]">
              {newCount}
            </span>
          )}
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Terminal Slide Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="border border-[#ffffff15] bg-[#030303ec] backdrop-blur-xl rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.8)] overflow-hidden h-72 flex flex-col"
          >
            {/* Header bar */}
            <div className="bg-white/5 px-4 py-3 border-b border-white/5 flex items-center justify-between font-mono text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="text-white font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-blue-400" /> WhatsApp Evacuation Dispatcher
                </span>
              </div>
              <span className="text-gray-600">LIVE FEED</span>
            </div>

            {/* Logs Area */}
            <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-3 scrollbar-thin">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 text-center uppercase tracking-widest gap-2">
                  <Terminal className="w-8 h-8 opacity-20" />
                  Aguardando emissão de alertas comunitários...
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="border-l-2 border-emerald-500/50 pl-3 py-1 space-y-1 hover:border-emerald-400 transition-colors">
                    <div className="flex flex-wrap items-center justify-between text-gray-500 text-[10px]">
                      <span>
                        [{new Date(log.createdAt).toLocaleDateString()} - {new Date(log.createdAt).toLocaleTimeString()}]
                      </span>
                      <span className="text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold uppercase tracking-wide">
                        {log.status} ({log.channel})
                      </span>
                    </div>
                    <div className="text-gray-300">
                      Protocolo: <span className="text-blue-400 font-bold">{log.protocolCode}</span> | Setor: <span className="text-yellow-500 font-bold">{log.cep}</span>
                    </div>
                    <p className="text-emerald-400/90 whitespace-pre-wrap leading-normal font-sans bg-black/40 p-2 rounded border border-white/5">
                      {log.message}
                    </p>
                    <div className="text-[10px] text-gray-500 italic">
                      📢 Disparo automático enviado para aproximadamente <strong className="text-white font-bold">{log.numResidents}</strong> moradores do quadrante de encosta.
                    </div>
                  </div>
                ))
              )}
              <div ref={feedEndRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
