"use client";

import { useEffect, useState } from 'react';
import { History, FileDown, Filter, Lock } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuthStore } from '@/store/authStore';
import { AuthModal } from '@/components/AuthModal';
import { motion } from 'framer-motion';
import { apiFetch } from '@/lib/api';

export interface LogEntry {
  id?: string;
  createdAt: string;
  soilMoisture: number;
  terrainInclination: number;
  rainVolume: number;
  groundVibration: number;
  risk: number;
  statusColor: string;
}

export default function Historico() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const { user } = useAuthStore();
  const [authOpen, setAuthOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchHistory = async (p: number) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/history?page=${p}`);
      const data = await res.json();
      if (data && Array.isArray(data.data)) {
        setLogs(data.data);
        setTotalPages(data.totalPages || 1);
        setPage(data.page || 1);
      } else {
        setLogs([]);
      }
    } catch (e) { 
      console.error(e);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const isOperator = useAuthStore.getState().user?.role === 'OPERATOR';
    if (isOperator) {
      fetchHistory(1);
    }
  }, []);

  const downloadPDF = () => {
    // Simulando geração de PDF
    const link = document.createElement('a');
    link.href = 'data:application/pdf;base64,JVBERi...'; 
    link.download = 'Relatorio_Deslizamentos.pdf';
    document.body.appendChild(link);
    alert('Exportando Relatório Institucional em PDF...');
    link.remove();
  };

  if (!mounted) return null; // Avoid hydration flash mismatch

  const isOperator = user && user.role === 'OPERATOR';

  if (!isOperator) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#020202] p-6 text-center select-none font-sans relative overflow-hidden h-screen w-full">
        {/* Glow overlay */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-md bg-white/[0.01] border border-white/5 p-8 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl flex flex-col items-center border-t-blue-500/20"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-4 shadow-inner">
            <Lock className="w-7 h-7 animate-pulse" />
          </div>
          <h2 className="text-lg font-black text-white tracking-wide uppercase">Histórico Técnico Restrito</h2>
          <p className="text-[10px] text-gray-500 font-mono tracking-widest mt-1 uppercase">Credenciais de Operador Exigidas</p>
          
          <p className="text-xs text-gray-400 leading-relaxed mt-4 mb-6">
            O banco de dados histórico do GeoShield Monitor contém as leituras consolidadas de sensores e relatórios institucionais. O acesso requer registro profissional.
          </p>

          <button
            onClick={() => setAuthOpen(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-600/15 cursor-pointer active:scale-95 transition-all"
          >
            Acessar com Cadastro
          </button>
        </motion.div>

        <AuthModal 
          isOpen={authOpen} 
          onClose={() => setAuthOpen(false)} 
          message="Faça login como operador de monitoramento para visualizar o histórico de telemetria geotécnica." 
        />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full animate-in fade-in duration-700">
      <header className="mb-10 pb-6 border-b border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
             <History className="w-8 h-8 text-blue-500" />
             Histórico e Relatórios
           </h1>
           <p className="text-gray-400 mt-2 text-lg">Consulta de registros preditivos, paginação de auditoria e geração documental técnica.</p>
        </div>
        <button 
           onClick={downloadPDF}
           className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] shadow-blue-500/20 active:scale-95 hover:scale-105"
        >
          <FileDown className="w-5 h-5" />
          Exportar PDF Oficial
        </button>
      </header>

      {/* Estatísticas e Filtros */}
      <div className="grid lg:grid-cols-4 gap-6 mb-8">
        <div className="lg:col-span-1 border border-white/10 bg-black/40 backdrop-blur-md rounded-2xl p-6 flex flex-col justify-center shadow-xl">
            <h3 className="font-semibold text-gray-400 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider"><Filter className="w-4 h-4"/> Filtros Ativos</h3>
            <select className="w-full bg-black/50 border border-white/10 rounded-lg p-3.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 transition-all">
               <option>Todos os Níveis</option>
               <option>Apenas Críticos (Laranja/Vermelho)</option>
               <option>Risco Baixo (Verde/Amarelo)</option>
            </select>
            <input type="date" className="w-full bg-black/50 border border-white/10 rounded-lg p-3.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert" />
        </div>
        
        <div className="lg:col-span-3 border border-white/10 bg-black/40 backdrop-blur-md rounded-2xl p-6 shadow-xl">
            <h3 className="font-semibold text-gray-400 mb-4 text-sm uppercase tracking-wider">Estatísticas Mensais de Risco Geral Simuladas</h3>
            <div className="h-40 w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                     { name: 'Semana 1', risk: 20 },
                     { name: 'Semana 2', risk: 35 },
                     { name: 'Semana 3', risk: 80 },
                     { name: 'Semana 4', risk: 45 },
                  ]}>
                     <defs>
                        <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <XAxis dataKey="name" hide />
                     <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }} />
                     <Area type="monotone" dataKey="risk" stroke="#3b82f6" fill="url(#colorRisk)" fillOpacity={1} strokeWidth={2} />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
        </div>
      </div>

      <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-[#111] text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-5 font-semibold">Data/Hora (ISO)</th>
                <th className="px-6 py-5 font-semibold text-center">Umidade</th>
                <th className="px-6 py-5 font-semibold text-center">Inclinação</th>
                <th className="px-6 py-5 font-semibold text-center">Chuva</th>
                <th className="px-6 py-5 font-semibold text-center">Vibração</th>
                <th className="px-6 py-5 font-semibold text-right">Avaliação do Risco</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#333]">
              {loading && logs.length === 0 && (
                 <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 text-lg">
                       <span className="animate-pulse">Consultando banco de dados geográfico...</span>
                    </td>
                 </tr>
              )}
              {!loading && logs.length === 0 && (
                 <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 text-lg">
                       <span className="opacity-60">Os logs serão gravados periodicamente e ficarão disponíveis aqui assim que forem persistidos. (Ex: rodando log periódico no express)</span>
                    </td>
                 </tr>
              )}
              {!loading && logs.map((log, i) => (
                <tr key={log.id || i} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-5 font-mono text-sm text-gray-300">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-6 py-5 text-center font-mono text-gray-400">{log.soilMoisture}%</td>
                  <td className="px-6 py-5 text-center font-mono text-gray-400">{log.terrainInclination}°</td>
                  <td className="px-6 py-5 text-center font-mono text-gray-400">{log.rainVolume} mm/h</td>
                  <td className="px-6 py-5 text-center font-mono text-gray-400">{log.groundVibration} Hz</td>
                  <td className="px-6 py-5 text-right flex justify-end">
                    <div className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-md min-w-[140px] text-center
                       ${log.statusColor === 'Vermelho' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                         log.statusColor === 'Laranja' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                         log.statusColor === 'Amarelo' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                         'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                       <span className="mr-1">[{log.risk}/100]</span> {log.statusColor.toUpperCase()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Paginação */}
      <div className="flex justify-between items-center mt-6">
         <div className="text-gray-500 font-medium">
             Página <span className="font-bold text-white bg-white/10 px-2 py-1 rounded mx-1">{page}</span> de <span className="font-bold text-white">{totalPages}</span>
         </div>
         <div className="flex gap-2">
            <button 
               disabled={page === 1} 
               onClick={() => fetchHistory(page - 1)}
               className="px-5 py-2.5 border border-white/10 rounded-xl bg-black hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold text-sm text-white"
            >
               Anterior
            </button>
            <button 
               disabled={page === totalPages} 
               onClick={() => fetchHistory(page + 1)}
               className="px-5 py-2.5 border border-white/10 rounded-xl bg-black hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold text-sm text-white"
            >
               Próxima
            </button>
         </div>
      </div>
    </div>
  );
}
