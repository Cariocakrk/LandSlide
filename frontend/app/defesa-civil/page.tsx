"use client";

import { useEffect, useState } from 'react';
import { socket } from '@/lib/socket';
import { ShieldAlert, CheckCircle2, Clock, ServerCrash } from 'lucide-react';

export default function DefesaCivil() {
  const [protocols, setProtocols] = useState<any[]>([]);

  const fetchProtocols = async () => {
    try {
       const res = await fetch('http://localhost:3001/api/defense-protocols');
       const data = await res.json();
       if (Array.isArray(data)) {
         setProtocols(data);
       } else {
         setProtocols([]);
       }
    } catch (e) {
       console.error(e);
       setProtocols([]);
    }
  };

  useEffect(() => {
    fetchProtocols();
    
    socket.on('emergencyAlert', (newAlert) => {
       // Play sound effect
       try {
         const audio = new Audio('/alert.mp3');
         audio.play().catch(() => {});
       } catch(e) {}
       
       setProtocols(prev => [newAlert, ...prev]);
    });

    socket.on('protocolUpdate', (updated) => {
       setProtocols(prev => prev.map(p => p.id === updated.id ? updated : p));
    });
    
    return () => {
      socket.off('emergencyAlert');
      socket.off('protocolUpdate');
    }
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await fetch(`http://localhost:3001/api/defense-protocols/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch(e) {}
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Finalizado': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'Equipe enviada': return <ServerCrash className="w-5 h-5 text-orange-500" />;
      default: return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const createManualAlert = async () => {
    try {
      if (confirm('Atenção: Tem certeza que deseja disparar um Alerta Manual sem medição dos sensores?')) {
        await fetch('http://localhost:3001/api/defense-protocols/mock', {
          method: 'POST',
        });
      }
    } catch(e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full animate-in fade-in duration-700">
      <header className="mb-10 pb-6 border-b border-white/10 flex flex-col md:flex-row justify-between md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-blue-500" />
            Central Operacional - Defesa Civil
          </h1>
          <p className="text-gray-400 mt-2 text-lg">Painel institucional para rastreamento, triagem e despacho de socorristas frente aos alertas estruturais das encostas mapeadas.</p>
        </div>
        
        <button 
          onClick={createManualAlert}
          className="flex-shrink-0 bg-red-600/20 text-red-500 border border-red-500/50 hover:bg-red-600 hover:text-white px-5 py-3 rounded-xl font-bold transition-all flex items-center gap-2 active:scale-95"
        >
          <ShieldAlert className="w-5 h-5" />
          MOCK: Simular Chamado Manual
        </button>
      </header>

      <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-white/5 text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-semibold">Cód Protocolo</th>
                <th className="px-6 py-4 font-semibold">Data e Hora Registro</th>
                <th className="px-6 py-4 font-semibold">Nível Ameaça</th>
                <th className="px-6 py-4 font-semibold">Status Operacional</th>
                <th className="px-6 py-4 font-semibold text-right">Ações da Central</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {protocols.length === 0 && (
                 <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500 text-lg">
                       Nenhum chamado de emergência registrado ativo.
                    </td>
                 </tr>
              )}
              {protocols.map((p) => (
                <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-5 font-mono font-medium text-white">{p.protocolCode}</td>
                  <td className="px-6 py-5">
                    {new Date(p.createdAt).toLocaleDateString()} - <span className="text-gray-500 font-mono">{new Date(p.createdAt).toLocaleTimeString()}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm ${p.riskLevel >= 90 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'}`}>
                       SEVERIDADE {p.riskLevel}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3 font-medium bg-black/20 p-2 rounded-lg border border-white/5 w-fit">
                       {getStatusIcon(p.status)}
                       <span className={p.status === 'Finalizado' ? 'text-emerald-400' : p.status === 'Equipe enviada' ? 'text-orange-400' : 'text-yellow-400'}>
                         {p.status}
                       </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right space-x-3">
                    {p.status === 'Em análise' && (
                       <button onClick={() => updateStatus(p.id, 'Equipe enviada')} className="text-xs px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white shadow-lg shadow-orange-500/20 rounded-lg transition-colors font-bold uppercase tracking-wide">
                         Autorizar Despacho
                       </button>
                    )}
                    {p.status === 'Equipe enviada' && (
                       <button onClick={() => updateStatus(p.id, 'Finalizado')} className="text-xs px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/20 rounded-lg transition-colors font-bold uppercase tracking-wide">
                         Marcar Resgate Concluído
                       </button>
                    )}
                    {p.status === 'Finalizado' && (
                       <span className="text-xs text-emerald-700 font-bold uppercase tracking-widest px-4 py-2 opacity-50">ARQUIVADO</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
