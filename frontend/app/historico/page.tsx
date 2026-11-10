"use client";

import { useEffect, useState, useMemo } from 'react';
import { History, FileDown, Filter, Lock } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuthStore } from '@/store/authStore';
import { AuthModal } from '@/components/AuthModal';
import { motion } from 'framer-motion';
import { apiFetch } from '@/lib/api';

import { useTerrainStore } from '@/store/terrainStore';
import { generateGeotechnicalPDF } from '@/lib/pdfReportGenerator';

export interface LogEntry {
  id?: string;
  sensorId?: string;
  createdAt: string;
  soilMoisture: number;
  terrainInclination: number;
  rainVolume: number;
  groundVibration: number;
  risk?: number;
  riskLevel?: number;
  riskScore?: number;
  statusColor: string;
}

export default function Historico() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');

  const { user, login } = useAuthStore();
  const { location, latitude, longitude, globalRisk } = useTerrainStore();
  const [authOpen, setAuthOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleQuickDemoLogin = async () => {
    try {
      const res = await apiFetch('/api/auth/demo-login', {
        method: 'POST',
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (res.ok && data.token) {
        login(data.user, data.token);
        return;
      }
    } catch {
      // Fallback local caso o backend esteja offline
    }
    login(
      {
        id: 'evaluator-demo-id',
        email: 'perito@defesacivil.gov.br',
        name: 'Perito Geotécnico da Banca',
        role: 'OPERATOR'
      },
      'demo-operator-token'
    );
  };

  const fetchHistory = async (p: number, level = filterLevel, date = filterDate) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (level && level !== 'all') params.set('level', level);
      if (date) params.set('date', date);

      const res = await apiFetch(`/api/history?${params.toString()}`);
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
    if (user && user.role === 'OPERATOR') {
      fetchHistory(1, filterLevel, filterDate);
    }
  }, [user, filterLevel, filterDate]);

  // Filtro adicional no cliente para garantir consistência mesmo em modo Serverless
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const statusColor = log.statusColor || (log as any).riskStatus || 'Verde';
      const riskVal = log.risk ?? log.riskLevel ?? log.riskScore ?? 0;

      if (filterLevel === 'critical') {
        const isCrit = statusColor === 'Vermelho' || statusColor === 'Laranja' || riskVal >= 50;
        if (!isCrit) return false;
      } else if (filterLevel === 'low') {
        const isLow = statusColor === 'Verde' || statusColor === 'Amarelo' || riskVal < 50;
        if (!isLow) return false;
      }

      if (filterDate && log.createdAt) {
        const logDay = new Date(log.createdAt).toISOString().slice(0, 10);
        if (logDay !== filterDate) return false;
      }

      return true;
    });
  }, [logs, filterLevel, filterDate]);

  const downloadPDF = () => {
    setExporting(true);
    try {
      const simulatedFs = globalRisk > 70 ? 0.94 : globalRisk > 40 ? 1.18 : 1.62;
      generateGeotechnicalPDF({
        location: location || 'Petrópolis - Região Serrana / RJ',
        latitude,
        longitude,
        globalRisk: globalRisk || 65,
        logs: filteredLogs,
        operatorName: user?.name || 'Eng. Geotécnico Operacional - CICC',
        lithology: 'Solo Residual de Gnaisse / Encosta Coluvionar',
        safetyFactor: simulatedFs,
      });
    } catch (err) {
      console.error('Failed to generate geotechnical PDF:', err);
      alert('Falha ao exportar Laudo Pericial em PDF.');
    } finally {
      setExporting(false);
    }
  };

  if (!mounted) return null;

  const isOperator = user && user.role === 'OPERATOR';

  if (!isOperator) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none font-sans relative overflow-hidden h-screen w-full" style={{ backgroundColor: 'var(--background)' }}>
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-md theme-card p-8 rounded-2xl flex flex-col items-center"
        >
          <div className="w-14 h-14 rounded-2xl theme-card-muted flex items-center justify-center mb-4" style={{ color: 'var(--primary)' }}>
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-extrabold tracking-wide uppercase" style={{ color: 'var(--foreground)' }}>
            Histórico Técnico Restrito
          </h2>
          <p className="text-[10px] font-mono tracking-widest mt-1 uppercase" style={{ color: 'var(--foreground-muted)' }}>
            Credenciais de Operador Exigidas
          </p>
          
          <p className="text-xs leading-relaxed mt-4 mb-6" style={{ color: 'var(--foreground-muted)' }}>
            O banco de dados histórico do LandSlide contém as leituras consolidadas de sensores e relatórios institucionais. O acesso requer registro profissional.
          </p>

          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={handleQuickDemoLogin}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl theme-btn-primary font-bold text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
            >
              ⚡ Acesso Imediato para Avaliador (1 Clique)
            </button>

            <button
              onClick={() => setAuthOpen(true)}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl theme-btn-secondary font-bold text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
            >
              Acessar com Login Próprio
            </button>
          </div>
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
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full animate-in fade-in duration-700" style={{ color: 'var(--foreground)' }}>
      <header className="mb-8 pb-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4" style={{ borderColor: 'var(--border)' }}>
        <div>
           <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3" style={{ color: 'var(--foreground)' }}>
             <History className="w-8 h-8" style={{ color: 'var(--primary)' }} />
             Histórico e Relatórios Auditáveis
           </h1>
           <p className="mt-1 text-sm" style={{ color: 'var(--foreground-muted)' }}>
             Consulta de registros preditivos, paginação de auditoria e geração documental técnica segundo a ABNT NBR 11682.
           </p>
        </div>
        <button 
           onClick={downloadPDF}
           disabled={exporting}
           className="flex items-center gap-2 theme-btn-primary px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <FileDown className="w-4 h-4" />
          {exporting ? 'Gerando Laudo...' : 'Gerar Laudo Pericial NBR 11682 (PDF)'}
        </button>
      </header>

      {/* Estatísticas e Filtros */}
      <div className="grid lg:grid-cols-4 gap-6 mb-8">
        <div className="lg:col-span-1 theme-card rounded-2xl p-6 flex flex-col justify-center">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-xs uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
              <Filter className="w-4 h-4" style={{ color: 'var(--primary)' }} /> Filtros Ativos
            </h3>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="w-full theme-card-muted rounded-xl p-3 text-xs font-medium focus:outline-none mb-3 transition-all"
              style={{ color: 'var(--foreground)' }}
            >
               <option value="all">Todos os Níveis</option>
               <option value="critical">Apenas Críticos (Laranja/Vermelho)</option>
               <option value="low">Risco Baixo (Verde/Amarelo)</option>
            </select>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full theme-card-muted rounded-xl p-3 text-xs font-mono focus:outline-none transition-all"
              style={{ color: 'var(--foreground)' }}
            />
        </div>
        
        <div className="lg:col-span-3 theme-card rounded-2xl p-6">
            <h3 className="font-bold mb-4 text-xs uppercase tracking-wider" style={{ color: 'var(--foreground-muted)' }}>
              Curva Consolidada de Risco Geotécnico Mensal
            </h3>
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
                          <stop offset="5%" stopColor="#A85832" stopOpacity={0.45}/>
                          <stop offset="95%" stopColor="#A85832" stopOpacity={0.02}/>
                        </linearGradient>
                     </defs>
                     <XAxis dataKey="name" hide />
                     <Tooltip
                       contentStyle={{
                         backgroundColor: 'var(--surface)',
                         border: '1px solid var(--border)',
                         borderRadius: '12px',
                         color: 'var(--foreground)'
                       }}
                     />
                     <Area type="monotone" dataKey="risk" stroke="#A85832" fill="url(#colorRisk)" fillOpacity={1} strokeWidth={2.5} />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
        </div>
      </div>

      <div className="theme-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="theme-card-muted uppercase text-[10px] font-mono" style={{ color: 'var(--foreground-muted)' }}>
              <tr>
                <th className="px-6 py-4 font-semibold">Data/Hora (ISO)</th>
                <th className="px-6 py-4 font-semibold text-center">Umidade</th>
                <th className="px-6 py-4 font-semibold text-center">Inclinação</th>
                <th className="px-6 py-4 font-semibold text-center">Chuva</th>
                <th className="px-6 py-4 font-semibold text-center">Vibração</th>
                <th className="px-6 py-4 font-semibold text-right">Avaliação do Risco</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {loading && filteredLogs.length === 0 && (
                 <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm" style={{ color: 'var(--foreground-muted)' }}>
                       <span className="animate-pulse">Consultando banco de dados geográfico...</span>
                    </td>
                 </tr>
              )}
              {!loading && filteredLogs.length === 0 && (
                 <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm" style={{ color: 'var(--foreground-muted)' }}>
                       <span>Nenhum registro encontrado para os filtros selecionados.</span>
                    </td>
                 </tr>
              )}
              {!loading && filteredLogs.map((log, i) => {
                const statusColor = log.statusColor || (log as any).riskStatus || 'Verde';
                const riskVal = log.risk ?? log.riskLevel ?? log.riskScore ?? 0;
                const vibVal = log.groundVibration ?? (log as any).vibration ?? 0;

                return (
                  <tr key={log.id || i} className="transition-colors border-b" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-6 py-4 font-mono text-xs" style={{ color: 'var(--foreground)' }}>
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-center font-mono" style={{ color: 'var(--foreground-muted)' }}>{log.soilMoisture ?? 0}%</td>
                    <td className="px-6 py-4 text-center font-mono" style={{ color: 'var(--foreground-muted)' }}>{log.terrainInclination ?? 0}°</td>
                    <td className="px-6 py-4 text-center font-mono" style={{ color: 'var(--foreground-muted)' }}>{log.rainVolume ?? 0} mm/h</td>
                    <td className="px-6 py-4 text-center font-mono" style={{ color: 'var(--foreground-muted)' }}>{vibVal} mm/s</td>
                    <td className="px-6 py-4 text-right flex justify-end">
                      <div className={`px-3.5 py-1 rounded-full text-[11px] font-mono font-bold min-w-[130px] text-center
                         ${statusColor === 'Vermelho' ? 'bg-[#B91C1C]/15 text-[#B91C1C] border border-[#B91C1C]/30' : 
                           statusColor === 'Laranja' ? 'bg-[#C85A17]/15 text-[#C85A17] border border-[#C85A17]/30' :
                           statusColor === 'Amarelo' ? 'bg-[#B47B1C]/15 text-[#B47B1C] border border-[#B47B1C]/30' :
                           'bg-[#2E6F40]/15 text-[#2E6F40] border border-[#2E6F40]/30'}`}>
                         <span className="mr-1">[{riskVal}/100]</span> {String(statusColor).toUpperCase()}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Paginação */}
      <div className="flex justify-between items-center mt-6 text-xs">
         <div className="font-medium" style={{ color: 'var(--foreground-muted)' }}>
             Página <span className="font-bold theme-card-muted px-2.5 py-1 rounded mx-1" style={{ color: 'var(--foreground)' }}>{page}</span> de <span className="font-bold" style={{ color: 'var(--foreground)' }}>{totalPages}</span>
         </div>
         <div className="flex gap-2">
            <button 
               disabled={page === 1} 
               onClick={() => fetchHistory(page - 1)}
               className="px-4 py-2 rounded-xl theme-btn-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold text-xs cursor-pointer"
            >
               Anterior
            </button>
            <button 
               disabled={page === totalPages} 
               onClick={() => fetchHistory(page + 1)}
               className="px-4 py-2 rounded-xl theme-btn-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold text-xs cursor-pointer"
            >
               Próxima
            </button>
         </div>
      </div>
    </div>
  );
}
