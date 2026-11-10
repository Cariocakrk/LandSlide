"use client";

import { useEffect, useState, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { socket } from '@/lib/socket';
import { Terminal, ChevronDown, ChevronUp, Smartphone } from 'lucide-react';
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
    const loadInitialDispatches = async () => {
      try {
        const res = await apiFetch('/api/alerts');
        const data = await res.json();
        if (Array.isArray(data)) {
          setLogs(data.reverse());
        }
      } catch (err) {
        console.error("Failed to load initial dispatch logs:", err);
      }
    };

    loadInitialDispatches();

    socket.on('alertDispatched', (newLog: DispatchLog) => {
      setLogs((prev) => {
        const next = [...prev, newLog];
        if (next.length > 25) return next.slice(next.length - 25);
        return next;
      });

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
    if (feedEndRef.current) {
      feedEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  const clearNotifications = () => {
    setIsOpen(!isOpen);
    setNewCount(0);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-lg w-full px-4 md:px-0 pointer-events-none">
      {/* Floating Toggle Badge Button */}
      <div className="flex justify-end mb-2 pointer-events-auto">
        <button 
          onClick={clearNotifications}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg font-mono text-xs transition-all duration-300 active:scale-95 cursor-pointer ${
            newCount > 0 
              ? 'bg-[#B91C1C] text-white animate-pulse' 
              : 'theme-card'
          }`}
          style={newCount === 0 ? { color: 'var(--foreground)' } : undefined}
        >
          <Terminal className="w-4 h-4" style={newCount === 0 ? { color: 'var(--primary)' } : undefined} />
          <span className="font-semibold">Console de Disparo</span>
          {newCount > 0 && (
            <span className="flex items-center justify-center bg-white text-[#B91C1C] font-bold w-4 h-4 rounded-full text-[10px]">
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
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="theme-card rounded-2xl shadow-2xl overflow-hidden h-72 flex flex-col pointer-events-auto"
          >
            {/* Header bar */}
            <div className="theme-card-muted px-4 py-3 border-b flex items-center justify-between font-mono text-xs" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#2E6F40]" />
                <span className="font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--foreground)' }}>
                  <Smartphone className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} /> Central de Disparo WhatsApp
                </span>
              </div>
              <span className="text-[10px]" style={{ color: 'var(--foreground-muted)' }}>TEMPO REAL</span>
            </div>

            {/* Logs Area */}
            <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-3">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center uppercase tracking-widest gap-2" style={{ color: 'var(--foreground-muted)' }}>
                  <Terminal className="w-7 h-7 opacity-30" />
                  Aguardando emissão de alertas comunitários...
                </div>
              ) : (
                logs.map((log, idx) => (
                  <div key={log.id || idx} className="border-l-2 border-[#2E6F40] pl-3 py-1 space-y-1 transition-colors">
                    <div className="flex flex-wrap items-center justify-between text-[10px]" style={{ color: 'var(--foreground-muted)' }}>
                      <span>
                        [{log.createdAt ? `${new Date(log.createdAt).toLocaleDateString()} - ${new Date(log.createdAt).toLocaleTimeString()}` : 'Tempo Real'}]
                      </span>
                      <span className="text-[#2E6F40] bg-[#2E6F40]/10 px-2 py-0.5 rounded border border-[#2E6F40]/20 font-bold uppercase tracking-wide">
                        {log.status || 'EMITIDO'} ({log.channel || 'WhatsApp'})
                      </span>
                    </div>
                    <div style={{ color: 'var(--foreground)' }}>
                      Protocolo: <span className="font-bold" style={{ color: 'var(--primary)' }}>{log.protocolCode || (log as any).sensorId || 'DEF-AUTO'}</span> | Setor: <span className="font-bold">{log.cep || 'Região Monitorada'}</span>
                    </div>
                    <p className="whitespace-pre-wrap leading-normal font-sans theme-card-muted p-2.5 rounded-lg text-xs" style={{ color: 'var(--foreground)' }}>
                      {log.message || 'Alerta estrutural emitido para a região.'}
                    </p>
                    <div className="text-[10px] italic" style={{ color: 'var(--foreground-muted)' }}>
                      📢 Disparo automático enviado para aproximadamente <strong className="font-bold" style={{ color: 'var(--foreground)' }}>{log.numResidents || 150}</strong> moradores do quadrante de encosta.
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
