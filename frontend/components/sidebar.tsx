"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, Map, Activity, ShieldAlert, History, MapPin, 
  Zap, Radio, Lock, LogOut, UserCheck, Smartphone 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { AuthModal } from '@/components/AuthModal';

const links = [
  { name: 'Visão Geral', href: '/', icon: Home, restricted: false },
  { name: 'Dashboard Real-Time', href: '/dashboard', icon: Activity, restricted: false },
  { name: 'Mapa 3D', href: '/mapa-3d', icon: Map, restricted: false },
  { name: 'Topografia (CEP)', href: '/gerar-terreno', icon: MapPin, restricted: false },
  { name: 'Simulação de Risco', href: '/simulacao', icon: Zap, restricted: true },
  { name: 'Defesa Civil', href: '/defesa-civil', icon: Radio, restricted: true },
  { name: 'Histórico', href: '/historico', icon: History, restricted: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | undefined>(undefined);
  const [mounted, setMounted] = useState(false);

  // Avoid dehydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLinkClick = (e: React.MouseEvent, href: string, restricted: boolean) => {
    const isOperator = user && user.role === 'OPERATOR';
    
    if (restricted && !isOperator) {
      e.preventDefault();
      setAuthMessage('Acesso Restrito: Esta área é exclusiva para operadores autorizados. Faça login ou cadastre-se para acessar.');
      setAuthModalOpen(true);
    }
  };

  const handleAuthTrigger = () => {
    setAuthMessage(undefined);
    setAuthModalOpen(true);
  };

  return (
    <aside className="w-66 border-r border-[#ffffff15] bg-[#030303] hidden md:flex flex-col relative z-20 font-sans">
      {/* Top Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-[#ffffff0a]">
        <div className="flex items-center gap-2 text-primary">
          <ShieldAlert className="w-5.5 h-5.5 text-blue-500 animate-pulse" />
          <span className="font-extrabold text-sm tracking-wide text-white uppercase">
            GeoShield <span className="text-blue-500 font-medium lowercase">Monitor</span>
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto scrollbar-thin">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const isOperator = mounted && user && user.role === 'OPERATOR';
          const isLocked = link.restricted && !isOperator;

          return (
            <Link 
              key={link.href} 
              href={link.href} 
              onClick={(e) => handleLinkClick(e, link.href, link.restricted)}
              className="relative block group"
            >
              {isActive && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 bg-blue-500/10 rounded-xl border border-blue-500/30"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <div className={cn(
                "relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all z-10",
                isActive 
                  ? "text-white" 
                  : "text-gray-400 hover:text-white hover:bg-white/5",
                isLocked && "opacity-60 hover:opacity-90"
              )}>
                <div className="flex items-center gap-3">
                  <link.icon className={cn("w-4 h-4 transition-colors", isActive ? "text-blue-400" : "text-gray-500 group-hover:text-gray-300")} />
                  <span>{link.name}</span>
                </div>
                
                {/* Visual Locks for Public visitors */}
                {isLocked && mounted && (
                  <Lock className="w-3 h-3 text-amber-500/70 group-hover:text-amber-400 transition-colors" />
                )}
              </div>
            </Link>
          );
        })}
      </nav>
      
      {/* Dynamic Profile and Auth Widget */}
      <div className="p-4 border-t border-[#ffffff0a] bg-black/40">
        {mounted && user ? (
          /* Operator Profile Layout */
          <div className="bg-[#ffffff02] border border-white/5 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
                {user.name.slice(0,2).toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="text-[11px] font-bold text-white truncate">{user.name}</div>
                <div className="text-[9px] text-emerald-400 font-mono uppercase tracking-wider flex items-center gap-1 mt-0.5">
                  <UserCheck className="w-3 h-3" /> Operador Civil
                </div>
              </div>
            </div>
            
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/5 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 text-gray-400 font-bold font-mono text-[9px] uppercase tracking-wider border border-white/5 transition-all cursor-pointer"
            >
              <LogOut className="w-3 h-3" /> Desconectar Central
            </button>
          </div>
        ) : (
          /* Visitor Layout */
          <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3.5 space-y-2.5">
            <div className="text-center space-y-1">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">Modo de Acesso</div>
              <div className="text-xs text-gray-500">Visitante Público (Básico)</div>
            </div>
            
            <button
              onClick={handleAuthTrigger}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold font-sans text-[10px] uppercase tracking-wider shadow-lg shadow-blue-600/10 transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
            >
              <UserCheck className="w-3.5 h-3.5" /> Acessar Central
            </button>
          </div>
        )}
        
        <div className="text-center text-[9px] text-gray-600 font-mono mt-3 uppercase tracking-widest">
          GeoShield Monitor v1.0.0
        </div>
      </div>

      {/* Global Interactive Auth Overlay Modal */}
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
        message={authMessage} 
      />
    </aside>
  );
}

