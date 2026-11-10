"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { 
  Home, Map, Activity, History, MapPin, 
  Sliders, Radio, Lock, LogOut, UserCheck, Sun, Moon, ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useTerrainStore } from '@/store/terrainStore';
import { AuthModal } from '@/components/AuthModal';
import { socket } from '@/lib/socket';

const monitoringLinks = [
  { name: 'Visão Geral', href: '/', icon: Home, restricted: false },
  { name: 'Painel de Controle', href: '/dashboard', icon: Activity, restricted: false, badge: 'AO VIVO' },
  { name: 'Mapa Topográfico 3D', href: '/mapa-3d', icon: Map, restricted: false, badge: '3D' },
  { name: 'Consulta por CEP', href: '/gerar-terreno', icon: MapPin, restricted: false },
];

const engineeringLinks = [
  { name: 'Simulação Geotécnica', href: '/simulacao', icon: Sliders, restricted: true },
  { name: 'Central de Operações', href: '/defesa-civil', icon: Radio, restricted: true, badge: '199' },
  { name: 'Histórico e Laudos', href: '/historico', icon: History, restricted: true, badge: 'PDF' },
];

/**
 * Interruptor estilizado de Sol & Lua na paleta Terra & Alabastro / Espresso & Argila.
 * Funciona como efeito visual suave quando o usuário clica em qualquer parte do card ou no próprio switch.
 */
function StylizedThemeSwitch({ isDark }: { isDark: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative w-16 h-8 rounded-full p-0.5 border transition-colors duration-300 flex items-center overflow-hidden shrink-0 shadow-inner",
        isDark
          ? "bg-[#120D0B] border-[#C87A51]/50"
          : "bg-[#EFE6D8] border-[#A85832]/40"
      )}
    >
      {/* Paisagem expressiva de montanhas em camadas + estrelas/sol no fundo do interruptor */}
      <svg
        viewBox="0 0 64 32"
        className="absolute inset-0 w-full h-full pointer-events-none"
        fill="none"
      >
        {isDark ? (
          <>
            {/* Estrelas nítidas no céu noturno (lado esquerdo livre da bolinha) */}
            <circle cx="11" cy="8" r="1.2" fill="#F5EFE6" />
            <circle cx="20" cy="6" r="1" fill="#E89D72" />
            <circle cx="27" cy="10" r="0.9" fill="#F5EFE6" fillOpacity="0.85" />
            <circle cx="15" cy="13" r="0.8" fill="#F5EFE6" fillOpacity="0.7" />

            {/* Cordilheira de fundo (Terracota iluminado) */}
            <path
              d="M0 32 L10 17 L21 25 L33 14 L46 24 L64 16 L64 32 Z"
              fill="#8C4625"
              fillOpacity="0.65"
            />
            <path
              d="M0 32 L10 17 L21 25 L33 14 L46 24 L64 16"
              stroke="#E89D72"
              strokeWidth="1.2"
              strokeOpacity="0.9"
            />

            {/* Montanha frontal em destaque */}
            <path
              d="M0 32 L16 21 L28 28 L41 19 L64 32 Z"
              fill="#5A2D18"
              fillOpacity="0.9"
            />
            <path
              d="M0 32 L16 21 L28 28 L41 19 L64 32"
              stroke="#C87A51"
              strokeWidth="1"
              strokeOpacity="0.85"
            />
          </>
        ) : (
          <>
            {/* Sol poente suave e cordilheira terracota no Modo Claro (lado direito livre) */}
            <circle cx="48" cy="9" r="5" fill="#D97736" fillOpacity="0.28" />

            {/* Cordilheira de fundo */}
            <path
              d="M0 32 L14 18 L27 25 L41 13 L54 23 L64 17 L64 32 Z"
              fill="#C87A51"
              fillOpacity="0.55"
            />
            <path
              d="M0 32 L14 18 L27 25 L41 13 L54 23 L64 17"
              stroke="#A85832"
              strokeWidth="1.2"
              strokeOpacity="0.85"
            />

            {/* Montanha frontal em tom café/argila */}
            <path
              d="M6 32 L23 21 L36 27 L49 18 L64 32 Z"
              fill="#8C4625"
              fillOpacity="0.75"
            />
            <path
              d="M6 32 L23 21 L36 27 L49 18 L64 32"
              stroke="#5C2E16"
              strokeWidth="1"
              strokeOpacity="0.7"
            />
          </>
        )}
      </svg>

      {/* Bolinha deslizante (Thumb) com Sol ou Lua */}
      <motion.div
        initial={false}
        animate={{ x: isDark ? 31 : 1, rotate: isDark ? 360 : 0 }}
        transition={{ type: "spring", stiffness: 360, damping: 26 }}
        className={cn(
          "relative w-6.5 h-6.5 rounded-full shadow-md flex items-center justify-center z-10 border",
          isDark
            ? "bg-[#261B16] border-[#E89D72] text-[#F5EFE6]"
            : "bg-[#FFFFFF] border-[#A85832] text-[#A85832]"
        )}
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5 text-[#E89D72] fill-[#E89D72]/30" />
        ) : (
          <Sun className="w-4 h-4 text-[#A85832] fill-[#A85832]/25" />
        )}
      </motion.div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { location, globalRisk, safetyFactor, riskLevelCode } = useTerrainStore();
  const { theme, setTheme } = useTheme();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | undefined>(undefined);
  const [mounted, setMounted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsConnected(socket.connected);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const handleLinkClick = (e: React.MouseEvent, href: string, restricted: boolean) => {
    const isOperator = user && user.role === 'OPERATOR';
    
    if (restricted && !isOperator) {
      e.preventDefault();
      setAuthMessage('Acesso Restrito: Esta área é exclusiva para engenheiros e operadores autorizados. Faça login para continuar.');
      setAuthModalOpen(true);
    }
  };

  const handleAuthTrigger = () => {
    setAuthMessage(undefined);
    setAuthModalOpen(true);
  };

  const isDark = mounted && theme === 'dark';
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  const renderLinkItem = (link: { name: string; href: string; icon: any; restricted: boolean; badge?: string }) => {
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
            className="absolute inset-0 bg-[var(--primary-soft)] rounded-xl border border-[var(--primary)]/30"
            initial={false}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
          />
        )}
        {isActive && (
          <motion.span
            layoutId="active-bar"
            className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[var(--primary)] z-20"
            initial={false}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
          />
        )}
        <div className={cn(
          "relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all z-10",
          isActive 
            ? "text-[var(--primary)] font-semibold" 
            : "text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)]/70",
          isLocked && "opacity-75"
        )}>
          <div className="flex items-center gap-3">
            <link.icon className={cn(
              "w-4 h-4 transition-colors shrink-0", 
              isActive ? "text-[var(--primary)]" : "text-[var(--foreground-muted)] group-hover:text-[var(--foreground)]"
            )} />
            <span className="truncate">{link.name}</span>
          </div>
          
          <div className="flex items-center gap-1.5">
            {link.badge && !isLocked && (
              <span className={cn(
                "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md border",
                isActive
                  ? "bg-[var(--primary)] text-white border-transparent"
                  : "bg-[var(--surface-muted)] text-[var(--foreground-muted)] border-[var(--border)]"
              )}>
                {link.badge}
              </span>
            )}
            {isLocked && mounted && (
              <Lock className="w-3.5 h-3.5 text-[var(--foreground-muted)]/60 group-hover:text-[var(--primary)] transition-colors" />
            )}
          </div>
        </div>
      </Link>
    );
  };

  const fsDisplay = typeof safetyFactor === 'number' ? (safetyFactor >= 99 ? 'Estável' : safetyFactor.toFixed(2)) : '1.48';
  const cprmBadge = riskLevelCode || (globalRisk >= 80 ? 'R4' : globalRisk >= 55 ? 'R3' : globalRisk >= 30 ? 'R2' : 'R1');

  return (
    <aside className="w-68 border-r border-[var(--border)] bg-[var(--surface)] hidden md:flex flex-col relative z-20 font-sans select-none transition-colors duration-200 overflow-hidden">
      {/* Marca d'água topográfica expressiva no fundo da Sidebar */}
      <svg
        viewBox="0 0 280 600"
        fill="none"
        className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-80 z-0"
      >
        <g stroke="var(--mountain-stroke)" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="4 4">
          <path d="M-20 250 Q 120 195, 300 265" />
          <path d="M-20 300 Q 140 240, 300 315" />
          <path d="M-20 350 Q 160 290, 300 365" />
        </g>
        <path
          d="M0 440 L75 365 L155 415 L240 340 L280 375 L280 600 L0 600 Z"
          fill="var(--mountain-1)"
        />
        <path
          d="M0 485 L105 405 L195 450 L280 390 L280 600 L0 600 Z"
          fill="var(--mountain-2)"
        />
        <path
          d="M0 440 L75 365 L155 415 L240 340 L280 375"
          stroke="var(--mountain-stroke)"
          strokeWidth="1.5"
        />
        <path
          d="M0 485 L105 405 L195 450 L280 390"
          stroke="var(--mountain-stroke)"
          strokeWidth="1.5"
        />
      </svg>

      {/* Top Brand Header com a Nova Logo */}
      <div className="relative z-10 h-20 flex items-center justify-between px-5 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
            <img
              src={isDark ? "/logo-landslide-dark.png" : "/logo-landslide.png"}
              alt="LandSlide Logo"
              className="w-full h-full object-contain drop-shadow-xs"
            />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-[var(--foreground)] block leading-none">
              LandSlide
            </span>
            <span className="text-[11px] font-medium text-[var(--primary)] block mt-1">
              Engenharia Geotécnica
            </span>
          </div>
        </Link>

        {/* Atalho rápido discreto no topo */}
        {mounted && (
          <button
            onClick={toggleTheme}
            title={isDark ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
            className="w-8 h-8 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] hover:border-[var(--primary)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] flex items-center justify-center transition-all cursor-pointer active:scale-95"
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-[#D88B62]" /> : <Moon className="w-3.5 h-3.5 text-[#5C3D2E]" />}
          </button>
        )}
      </div>

      {/* Navigation List dividida em 2 seções */}
      <div className="relative z-10 flex-1 px-3.5 py-4 space-y-5 overflow-y-auto flex flex-col justify-between">
        <div className="space-y-4">
          {/* Grupo 1 */}
          <div className="space-y-1">
            <div className="px-2 pb-1 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                Monitoramento &amp; 3D
              </span>
            </div>
            {monitoringLinks.map(renderLinkItem)}
          </div>

          {/* Grupo 2 */}
          <div className="space-y-1 pt-2 border-t border-[var(--border)]/60">
            <div className="px-2 pb-1 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                Engenharia &amp; Operação
              </span>
            </div>
            {engineeringLinks.map(renderLinkItem)}
          </div>
        </div>

        {/* Mini-Card de Telemetria do Setor Ativo (Preenche o espaço vazio com elegância) */}
        <div className="mx-0.5 p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/75 backdrop-blur-xs space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--foreground-muted)] flex items-center gap-1.5 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--primary)]" />
              Setor Monitorado
            </span>
            <span className={cn(
              "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border",
              cprmBadge === 'R4' ? "bg-[#B91C1C]/15 text-[#B91C1C] border-[#B91C1C]/30" :
              cprmBadge === 'R3' ? "bg-[#C85A17]/15 text-[#C85A17] border-[#C85A17]/30" :
              cprmBadge === 'R2' ? "bg-[#B47B1C]/15 text-[#B47B1C] border-[#B47B1C]/30" :
              "bg-[#2E6F40]/15 text-[#2E6F40] border-[#2E6F40]/30"
            )}>
              CPRM {cprmBadge}
            </span>
          </div>

          <div className="text-xs font-bold text-[var(--foreground)] truncate">
            {location || 'Petrópolis - Região Serrana, RJ'}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-0.5 font-mono text-[10px]">
            <div className="bg-[var(--surface)]/80 border border-[var(--border)] rounded-lg px-2.5 py-1.5">
              <span className="text-[9px] text-[var(--foreground-muted)] block">Fator Seg.</span>
              <strong className="text-[var(--foreground)] text-xs">FS {fsDisplay}</strong>
            </div>
            <div className="bg-[var(--surface)]/80 border border-[var(--border)] rounded-lg px-2.5 py-1.5">
              <span className="text-[9px] text-[var(--foreground-muted)] block">Índice Risco</span>
              <strong className="text-[var(--primary)] text-xs">{globalRisk || 15}/100</strong>
            </div>
          </div>
        </div>
      </div>
      
      {/* Interruptor de Aparência Estilizado + Perfil do Operador */}
      <div className="relative z-10 p-4 border-t border-[var(--border)] bg-[var(--surface-muted)]/60 backdrop-blur-sm space-y-3">
        {mounted && (
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] text-xs font-medium text-[var(--foreground)] transition-all cursor-pointer group shadow-2xs"
          >
            <div className="text-left">
              <span className="text-xs font-bold text-[var(--foreground)] block leading-tight group-hover:text-[var(--primary)] transition-colors">
                {isDark ? 'Modo Escuro' : 'Modo Claro'}
              </span>
              <span className="text-[10px] text-[var(--foreground-muted)] block mt-0.5">
                {isDark ? 'Paleta Espresso & Argila' : 'Paleta Terra & Alabastro'}
              </span>
            </div>

            {/* Interruptorzinho estilizado de Sol & Lua */}
            <StylizedThemeSwitch isDark={isDark} />
          </button>
        )}

        {mounted && user ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3.5 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--primary-soft)] border border-[var(--primary)]/30 flex items-center justify-center text-[var(--primary)] font-bold text-xs shrink-0">
                {(user.name || user.email || 'OP').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="text-xs font-semibold text-[var(--foreground)] truncate">
                  {user.name || user.email || 'Engenheiro'}
                </div>
                <div className="text-[10px] text-[#2E6F40] dark:text-[#52B788] font-medium flex items-center gap-1 mt-0.5">
                  <UserCheck className="w-3 h-3" /> Credencial Ativa
                </div>
              </div>
            </div>
            
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[var(--surface-muted)] hover:bg-[#B91C1C]/10 hover:text-[#B91C1C] text-[var(--foreground-muted)] font-semibold text-[11px] border border-[var(--border)] transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Encerrar Sessão
            </button>
          </div>
        ) : (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--foreground-muted)] font-medium">Acesso Atual</span>
              <span className="text-[11px] font-semibold text-[var(--foreground)]">Visitante</span>
            </div>
            
            <button
              onClick={handleAuthTrigger}
              className="w-full py-2.5 rounded-xl theme-btn-primary font-semibold text-xs shadow-sm cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
            >
              <UserCheck className="w-3.5 h-3.5" /> Entrar como Operador
            </button>
          </div>
        )}
        
        <div className="flex items-center justify-between text-[11px] text-[var(--foreground-muted)] px-1 pt-0.5">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#2E6F40] dark:bg-[#52B788]' : 'bg-[#B47B1C]'}`} />
            <span>{isConnected ? 'Conectado ao Servidor' : 'Modo Autônomo'}</span>
          </div>
          <span className="font-mono text-[10px] opacity-75">NBR 11682</span>
        </div>
      </div>

      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
        message={authMessage} 
      />
    </aside>
  );
}
