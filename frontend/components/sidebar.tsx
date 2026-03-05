"use client"
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Map, Activity, ShieldAlert, History, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const links = [
  { name: 'Visão Geral', href: '/', icon: Home },
  { name: 'Dashboard Real-Time', href: '/dashboard', icon: Activity },
  { name: 'Mapa 3D', href: '/mapa-3d', icon: Map },
  { name: 'Topografia (CEP)', href: '/gerar-terreno', icon: MapPin },
  { name: 'Defesa Civil', href: '/defesa-civil', icon: ShieldAlert },
  { name: 'Histórico', href: '/historico', icon: History },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-[#ffffff22] bg-black/40 backdrop-blur-xl hidden md:flex flex-col relative z-20">
      <div className="h-16 flex items-center px-6 border-b border-[#ffffff11]">
        <div className="flex items-center gap-2 text-primary">
          <ShieldAlert className="w-6 h-6 animate-pulse" />
          <span className="font-bold text-lg tracking-tight text-white">GeoShield <span className="text-primary-foreground">Monitor</span></span>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link key={link.href} href={link.href} className="relative block">
              {isActive && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 bg-primary/20 rounded-md border border-primary/50"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <div className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors z-10",
                isActive ? "text-white" : "text-muted-foreground hover:text-white hover:bg-white/5"
              )}>
                <link.icon className={cn("w-4 h-4", isActive ? "text-primary" : "")} />
                {link.name}
              </div>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-[#ffffff11]">
        <div className="px-3 py-2 text-xs text-muted-foreground">
          v1.0.0 - Mode: RealTime
        </div>
      </div>
    </aside>
  );
}
