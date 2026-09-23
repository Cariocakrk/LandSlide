"use client";

import { useEffect, useState } from 'react';
import { socket } from '@/lib/socket';
import { 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Lock, 
  MessageSquare, 
  QrCode, 
  LogOut, 
  Loader2, 
  Check, 
  RotateCw, 
  Sparkles, 
  Smartphone,
  Camera,
  Image as ImageIcon,
  X,
  Eye,
  Phone,
  Send,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { useTerrainStore } from '@/store/terrainStore';
import { useAuthStore } from '@/store/authStore';
import { AuthModal } from '@/components/AuthModal';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/api';

export interface EmergencyProtocol {
  id: string;
  protocolCode: string;
  riskLevel: number;
  status: string;
  description?: string | null;
  channel?: string;
  phone?: string | null;
  photo?: string | null;
  location?: string | null;
  createdAt: string;
}

export default function DefesaCivil() {
  const [protocols, setProtocols] = useState<EmergencyProtocol[]>([]);
  const { user } = useAuthStore();
  const [authOpen, setAuthOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // WhatsApp states
  const [waStatus, setWaStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'CONNECTING'>('DISCONNECTED');
  const [waQr, setWaQr] = useState<string | null>(null);
  const [waNumber, setWaNumber] = useState<string | null>(null);
  const [waProgress, setWaProgress] = useState<number | null>(null);
  const [waLoadingMsg, setWaLoadingMsg] = useState<string>('');

  // Modais de Denúncia e Inspeção
  const [selectedIncident, setSelectedIncident] = useState<EmergencyProtocol | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);

  // Formulário do Teste de Denúncia
  const [reportPhone, setReportPhone] = useState('+55 (24) 99876-5432');
  const [reportLocation, setReportLocation] = useState('Morro da Oficina, Petrópolis - RJ');
  const [reportText, setReportText] = useState('Apareceu uma trinca de mais de 4 metros no asfalto da encosta com água barrenta brotando!');
  const [reportPhoto, setReportPhoto] = useState('https://images.unsplash.com/photo-1541888946425-d0fbb1861593?q=80&w=800&auto=format&fit=crop');

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchWaStatus = async () => {
    try {
      const res = await apiFetch('/api/whatsapp/status');
      const data = await res.json();
      setWaStatus(data.status || (data.connected ? 'CONNECTED' : 'DISCONNECTED'));
      if (data.qr || data.qrCode) setWaQr(data.qr || data.qrCode);
      if (data.number) setWaNumber(data.number);
    } catch (err) {
      console.error('Erro ao buscar status do WhatsApp:', err);
    }
  };

  useEffect(() => {
    fetchWaStatus();
  }, []);

  const handleSimulateConnect = () => {
    setWaStatus('CONNECTING');
    setWaLoadingMsg('Validando credenciais do terminal e conectando rádio...');
    setWaProgress(30);
    setTimeout(() => {
      setWaProgress(70);
      setWaLoadingMsg('Sincronizando tabelas de respostas automáticas...');
      setTimeout(() => {
        setWaProgress(100);
        setWaStatus('CONNECTED');
        setWaNumber('5521981245500');
        setWaLoadingMsg('');
        setWaProgress(null);
      }, 600);
    }, 600);
  };

  useEffect(() => {
    const fetchProtocols = async () => {
      try {
        const res = await apiFetch('/api/defense-protocols');
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

    fetchProtocols();
    
    socket.on('emergencyAlert', (newAlert: EmergencyProtocol) => {
      try {
        const audio = new Audio('/alert.mp3');
        audio.play().catch(() => {});
      } catch {}
      setProtocols(prev => [newAlert, ...prev]);
    });

    socket.on('protocolUpdate', (updated: EmergencyProtocol) => {
      setProtocols(prev => prev.map(p => p.id === updated.id ? updated : p));
    });

    socket.on('whatsapp-status', (data: any) => {
      setWaStatus(data.status);
      if (data.qr) setWaQr(data.qr);
      else setWaQr(null);
      if (data.number) setWaNumber(data.number);
      else setWaNumber(null);
      if (data.progress !== undefined) {
        setWaProgress(data.progress);
        setWaLoadingMsg(data.message || '');
      } else {
        setWaProgress(null);
        setWaLoadingMsg('');
      }
    });
    
    return () => {
      socket.off('emergencyAlert');
      socket.off('protocolUpdate');
      socket.off('whatsapp-status');
    };
  }, [user]);

  const handleDisconnectWa = async () => {
    if (confirm('Tem certeza que deseja desconectar a sessão do WhatsApp?')) {
      try {
        setWaStatus('CONNECTING');
        setWaLoadingMsg('Desconectando...');
        const res = await apiFetch('/api/whatsapp/disconnect', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          setWaStatus('DISCONNECTED');
          setWaNumber(null);
          fetchWaStatus();
        }
      } catch (err) {
        console.error('Erro ao desconectar WhatsApp:', err);
        setWaStatus('DISCONNECTED');
        setWaNumber(null);
      }
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      setProtocols(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
      if (selectedIncident && selectedIncident.id === id) {
        setSelectedIncident(prev => prev ? { ...prev, status: newStatus } : null);
      }

      await apiFetch(`/api/defense-protocols/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: newStatus })
      });

      if (newStatus === 'Equipe enviada') {
        const protocol = protocols.find(p => p.id === id);
        const activeLocation = useTerrainStore.getState().location || "Região Metropolitana";
        
        await apiFetch('/api/alerts/dispatch', {
          method: 'POST',
          body: JSON.stringify({
            protocolCode: protocol?.protocolCode || `DEF-AUTO-${Math.floor(Math.random() * 1000)}`,
            cep: activeLocation,
            channel: 'WhatsApp',
            message: `[ALERTA URGENTE - DEFESA CIVIL]: Risco iminente confirmado para a região de ${activeLocation}. Viaturas enviadas para triagem. Evacue imediatamente a encosta e siga as orientações locais!`
          })
        });
      }
    } catch (e) {
      console.error('Erro ao atualizar status:', e);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Finalizado': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'Equipe enviada': return <Truck className="w-4 h-4 text-orange-500" />;
      default: return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  // Envio de denúncia de teste via API
  const handleSendTestReport = async () => {
    setSendingReport(true);
    try {
      const res = await apiFetch('/api/incidents', {
        method: 'POST',
        body: JSON.stringify({
          phone: reportPhone,
          location: reportLocation,
          text: reportText,
          photo: reportPhoto,
          riskLevel: 94
        })
      });
      const data = await res.json();
      if (data.incident) {
        const created: EmergencyProtocol = {
          id: data.incident.id,
          protocolCode: data.incident.protocolCode,
          riskLevel: data.incident.riskLevel,
          description: data.incident.text,
          status: data.incident.status,
          channel: data.incident.channel,
          phone: data.incident.phone,
          photo: data.incident.photo,
          location: data.incident.location,
          createdAt: data.incident.createdAt
        };

        try {
          const audio = new Audio('/alert.mp3');
          audio.play().catch(() => {});
        } catch {}

        setProtocols(prev => [created, ...prev]);
        setReportModalOpen(false);
      }
    } catch (err) {
      console.error('Erro ao enviar denúncia de teste:', err);
    } finally {
      setSendingReport(false);
    }
  };

  if (!mounted) return null;

  const isOperator = user && user.role === 'OPERATOR';

  if (!isOperator) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#020202] p-6 text-center select-none font-sans relative overflow-hidden h-screen w-full">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-md bg-slate-950/80 border border-white/10 p-8 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl flex flex-col items-center border-t-blue-500/30"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-4 shadow-inner">
            <Lock className="w-7 h-7 animate-pulse" />
          </div>
          <h2 className="text-lg font-black text-white tracking-wide uppercase">Operação de Despachos Restrita</h2>
          <p className="text-[10px] text-gray-500 font-mono tracking-widest mt-1 uppercase">Credenciais de Defesa Civil Exigidas</p>
          
          <p className="text-xs text-gray-400 leading-relaxed mt-4 mb-6">
            O terminal da Defesa Civil permite o envio de chamados de veículo para resgate de moradores e despacho de alertas reais do WhatsApp. Esta área de comando exige login de monitor.
          </p>

          <button
            onClick={() => setAuthOpen(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-600/15 cursor-pointer active:scale-95 transition-all font-mono"
          >
            Acessar com Cadastro ou Avaliador
          </button>
        </motion.div>

        <AuthModal 
          isOpen={authOpen} 
          onClose={() => setAuthOpen(false)} 
          message="Faça login como operador de monitoramento ou utilize o botão de Avaliador." 
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-700 font-sans text-slate-100 space-y-8">
      {/* Top Banner Operacional */}
      <div className="bg-slate-950/80 border border-white/10 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono backdrop-blur-xl shadow-lg border-t-blue-500/30">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>CENTRAL INTEGRADA DE COMANDO E CONTROLE (CICC // 199)</span>
          </div>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400">CANAL MORADORES: <strong className="text-cyan-400">WHATSAPP BOT ATIVO</strong></span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="text-gray-400">DESPACHO DE VIATURAS:</span>
          <strong className="text-emerald-400 font-bold">PRONTO</strong>
        </div>
      </div>

      {/* Header Principal */}
      <header className="pb-6 border-b border-white/10 flex flex-col md:flex-row justify-between md:items-end gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-blue-500" />
            Central Operacional & Despacho de Socorro
          </h1>
          <p className="text-gray-400 mt-1 text-xs md:text-sm max-w-2xl leading-relaxed">
            Painel institucional da Defesa Civil para triagem de ocorrências, telemetria de sensores e recebimento de <strong>denúncias com fotos enviadas por moradores via WhatsApp</strong>.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setReportModalOpen(true)}
            className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-600 hover:text-white px-4 py-2.5 rounded-xl font-bold font-mono text-xs transition-all flex items-center gap-2 active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/10"
          >
            <Camera className="w-4 h-4" />
            Simular Denúncia WhatsApp c/ Foto
          </button>
        </div>
      </header>

      {/* Grid Principal: Tabela de Protocolos & Card do Bot WhatsApp */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Tabela de Protocolos de Emergência */}
        <div className="lg:col-span-8 bg-slate-950/70 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Fila de Chamados & Ocorrências em Campo
              </h3>
            </div>
            <span className="text-[10px] font-mono text-gray-500">
              {protocols.length} PROTOCOLOS ATIVOS
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-white/5 text-gray-400 uppercase text-[10px] font-mono">
                <tr>
                  <th className="px-4 py-3.5 font-semibold">Protocolo / Origem</th>
                  <th className="px-4 py-3.5 font-semibold">Foto &amp; Relato</th>
                  <th className="px-4 py-3.5 font-semibold">Gravidade</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                  <th className="px-4 py-3.5 font-semibold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {protocols.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 text-sm">
                      Nenhum chamado de emergência registrado no momento.
                    </td>
                  </tr>
                )}
                {protocols.map((p) => {
                  const isWhatsApp = p.channel === 'WhatsApp' || p.protocolCode.includes('WA') || Boolean(p.photo);
                  
                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                      {/* Protocolo e Origem */}
                      <td className="px-4 py-4">
                        <div className="font-bold text-white text-xs">{p.protocolCode}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {isWhatsApp && (
                          <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">
                            <MessageSquare className="w-2.5 h-2.5" /> WhatsApp 199
                          </span>
                        )}
                      </td>

                      {/* Foto e Relato do Morador */}
                      <td className="px-4 py-4 max-w-[280px]">
                        <div className="flex items-start gap-3">
                          {p.photo ? (
                            <button
                              onClick={() => setSelectedIncident(p)}
                              className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/20 flex-shrink-0 group/photo cursor-pointer hover:border-emerald-400 transition-colors"
                              title="Clique para ver foto ampliada"
                            >
                              <img 
                                src={p.photo} 
                                alt="Foto da Encosta" 
                                className="w-full h-full object-cover group-hover/photo:scale-110 transition-transform" 
                              />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                            </button>
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-gray-600 flex-shrink-0">
                              <ShieldAlert className="w-5 h-5" />
                            </div>
                          )}

                          <div className="overflow-hidden">
                            <p className="text-[11px] text-gray-300 font-sans line-clamp-2 leading-tight">
                              {p.description || 'Alerta automático emitido por modelo geotécnico.'}
                            </p>
                            {p.phone && (
                              <span className="text-[10px] text-cyan-400 flex items-center gap-1 mt-1 font-mono">
                                <Phone className="w-2.5 h-2.5" /> {p.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Nível de Risco */}
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${
                          p.riskLevel >= 90 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                          p.riskLevel >= 60 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                          'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        }`}>
                          R4 • {p.riskLevel}%
                        </span>
                      </td>

                      {/* Status Operacional */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          {getStatusIcon(p.status)}
                          <span className={
                            p.status === 'Finalizado' ? 'text-emerald-400 font-bold' : 
                            p.status === 'Equipe enviada' ? 'text-orange-400 font-bold' : 
                            'text-yellow-400 font-medium'
                          }>
                            {p.status}
                          </span>
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {p.photo && (
                            <button
                              onClick={() => setSelectedIncident(p)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400 border border-white/10 transition-colors"
                              title="Inspecionar Denúncia"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          {p.status === 'Em análise' && (
                            <button 
                              onClick={() => updateStatus(p.id, 'Equipe enviada')} 
                              className="text-[10px] px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-all font-bold uppercase tracking-wider cursor-pointer active:scale-95 shadow-md shadow-orange-600/20"
                            >
                              Despachar
                            </button>
                          )}
                          {p.status === 'Equipe enviada' && (
                            <button 
                              onClick={() => updateStatus(p.id, 'Finalizado')} 
                              className="text-[10px] px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all font-bold uppercase tracking-wider cursor-pointer active:scale-95"
                            >
                              Concluir
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card de Pareamento e Bot do WhatsApp */}
        <div className="lg:col-span-4 bg-slate-950/70 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-2xl flex flex-col w-full">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Bot Integrado WhatsApp 199
              </h3>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[10px]">
              <span className={`w-2 h-2 rounded-full ${
                waStatus === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' :
                waStatus === 'CONNECTING' ? 'bg-yellow-500 animate-pulse' :
                'bg-rose-500'
              }`} />
              <span className="uppercase text-gray-400">
                {waStatus === 'CONNECTED' ? 'Ativo' :
                 waStatus === 'CONNECTING' ? 'Conectando' :
                 'Aguardando'}
              </span>
            </div>
          </div>

          {waStatus === 'DISCONNECTED' && (
            <div className="flex flex-col items-center text-center py-2">
              {waQr ? (
                <div className="bg-white p-3 rounded-2xl shadow-2xl mb-4 relative group border border-white/20">
                  <img 
                    src={waQr} 
                    alt="WhatsApp QR Code" 
                    className="w-44 h-44 block rounded-xl select-none"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center rounded-2xl pointer-events-none p-4">
                    <QrCode className="w-10 h-10 text-white animate-pulse mb-1" />
                    <span className="text-[10px] text-white font-mono uppercase tracking-wider">Pronto para Leitura</span>
                  </div>
                </div>
              ) : (
                <div className="w-44 h-44 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-2 mb-4">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  <span className="text-xs text-gray-500 font-mono">Gerando QR Code...</span>
                </div>
              )}
              
              <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5 font-mono">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" /> Canal de Alertas 199
              </h4>
              <p className="text-[11px] text-gray-400 leading-relaxed max-w-[260px] mb-4">
                Escaneie com seu celular para testar o envio de fotos e relatos em tempo real.
              </p>

              <div className="w-full space-y-2">
                <button
                  onClick={handleSimulateConnect}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono font-bold text-[10px] uppercase tracking-wider shadow-lg shadow-emerald-600/20 cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                  Simular Pareamento do Celular
                </button>

                <button
                  onClick={fetchWaStatus}
                  className="w-full py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-mono text-[9px] uppercase tracking-wider border border-white/5 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCw className="w-3 h-3" />
                  Recarregar QR Code
                </button>
              </div>
            </div>
          )}

          {waStatus === 'CONNECTING' && (
            <div className="flex flex-col items-center text-center py-10">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
              <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-1 font-mono">Conectando Terminal...</h4>
              {waProgress !== null && (
                <div className="w-full bg-white/5 rounded-full h-1.5 max-w-[180px] mb-2 overflow-hidden mt-3 border border-white/5">
                  <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${waProgress}%` }} />
                </div>
              )}
              <span className="text-[10px] font-mono text-gray-500 mt-1">
                {waLoadingMsg || 'Iniciando WhatsApp Web no servidor...'}
              </span>
            </div>
          )}

          {waStatus === 'CONNECTED' && (
            <div className="space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Terminal Ativo</h4>
                    <p className="text-[10px] text-gray-400 font-mono">+55 (21) 98124-5500</p>
                  </div>
                </div>

                <button
                  onClick={handleDisconnectWa}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                  title="Desconectar"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-xl p-3 space-y-2 text-[11px] font-mono">
                <span className="text-[9px] uppercase tracking-wider text-gray-500 block">Comandos Aceitos pelo Bot:</span>
                <div className="space-y-1 text-gray-300 text-[10px]">
                  <div className="flex justify-between"><span>📸 Envio de Foto:</span><strong className="text-emerald-400">Gera Chamado</strong></div>
                  <div className="flex justify-between"><span>1: Ver Risco do CEP</span><strong className="text-cyan-400">Consulta DEM</strong></div>
                  <div className="flex justify-between"><span>2: Cadastrar CEP</span><strong className="text-white">Alerta SMS/WA</strong></div>
                  <div className="flex justify-between"><span>3: Rotas de Fuga</span><strong className="text-amber-400">Pontos Apoio</strong></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Inspeção Pericial em Alta Resolução da Denúncia */}
      <AnimatePresence>
        {selectedIncident && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-slate-950 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Top Modal Bar */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-2 font-mono">
                  <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold">
                    PROTOCOLO {selectedIncident.protocolCode}
                  </span>
                  <span className="text-xs text-gray-400">Inspeção de Campo</span>
                </div>
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Corpo do Modal */}
              <div className="p-6 overflow-y-auto space-y-4">
                {selectedIncident.photo && (
                  <div className="relative rounded-2xl overflow-hidden border border-white/10 aspect-video bg-black">
                    <img 
                      src={selectedIncident.photo} 
                      alt="Registro de Campo" 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" /> FOTO TRANSMITIDA VIA WHATSAPP (CRIPTOGRAFIA E2E)
                    </div>
                  </div>
                )}

                <div className="bg-black/40 border border-white/5 rounded-2xl p-4 space-y-2">
                  <span className="text-[10px] font-mono uppercase text-gray-500 block">Relato Original do Cidadão:</span>
                  <p className="text-xs md:text-sm text-gray-200 leading-relaxed font-sans">
                    &ldquo;{selectedIncident.description}&rdquo;
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
                  <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl">
                    <span className="text-[9px] text-gray-500 uppercase block">Telefone do Morador:</span>
                    <strong className="text-cyan-400 text-xs">{selectedIncident.phone || 'Não informado'}</strong>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl">
                    <span className="text-[9px] text-gray-500 uppercase block">Localização / Setor:</span>
                    <strong className="text-white text-xs truncate block">{selectedIncident.location || 'Encosta Monitorada'}</strong>
                  </div>
                </div>
              </div>

              {/* Ações de Despacho */}
              <div className="p-4 border-t border-white/10 bg-black/40 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs font-mono text-gray-400 flex items-center gap-2">
                  <span>Status:</span>
                  <strong className={selectedIncident.status === 'Equipe enviada' ? 'text-orange-400' : 'text-yellow-400'}>
                    {selectedIncident.status}
                  </strong>
                </div>

                <div className="flex items-center gap-2">
                  {selectedIncident.status === 'Em análise' && (
                    <button
                      onClick={() => updateStatus(selectedIncident.id, 'Equipe enviada')}
                      className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg shadow-orange-600/20 active:scale-95"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      Autorizar Despacho de Viatura
                    </button>
                  )}
                  {selectedIncident.status === 'Equipe enviada' && (
                    <button
                      onClick={() => updateStatus(selectedIncident.id, 'Finalizado')}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/20 active:scale-95"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Concluir Vistoria / Resgate
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal para Simulação de Envio de Denúncia via WhatsApp (Demo) */}
      <AnimatePresence>
        {reportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-slate-950 border border-white/15 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                    Simular Denúncia via WhatsApp
                  </h3>
                </div>
                <button
                  onClick={() => setReportModalOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase block mb-1">Telefone do Morador:</label>
                  <input
                    type="text"
                    value={reportPhone}
                    onChange={(e) => setReportPhone(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 uppercase block mb-1">Localização da Encosta:</label>
                  <input
                    type="text"
                    value={reportLocation}
                    onChange={(e) => setReportLocation(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 uppercase block mb-1">Relato / Mensagem de Texto:</label>
                  <textarea
                    rows={3}
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 resize-none font-sans"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 uppercase block mb-1">Foto da Trinca / Encosta:</label>
                  <div className="flex items-center gap-3">
                    <img 
                      src={reportPhoto} 
                      alt="Preview" 
                      className="w-16 h-12 rounded-lg object-cover border border-white/20" 
                    />
                    <span className="text-[10px] text-emerald-400">
                      Foto de campo pronta para transmissão instantânea.
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  onClick={() => setReportModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-xs font-mono"
                >
                  Cancelar
                </button>

                <button
                  onClick={handleSendTestReport}
                  disabled={sendingReport}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {sendingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Enviar Denúncia ao CICC
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
