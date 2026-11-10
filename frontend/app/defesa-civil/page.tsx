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
  X,
  Eye,
  Phone,
  Send
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
  const [reportPhoto, setReportPhoto] = useState('/encosta-fissura.svg');

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
      case 'Finalizado': return <CheckCircle2 className="w-4 h-4 text-[#2E6F40]" />;
      case 'Equipe enviada': return <Truck className="w-4 h-4 text-[#C85A17]" />;
      default: return <Clock className="w-4 h-4 text-[#B47B1C]" />;
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
            Operação de Despachos Restrita
          </h2>
          <p className="text-[10px] font-mono tracking-widest mt-1 uppercase" style={{ color: 'var(--foreground-muted)' }}>
            Credenciais de Defesa Civil Exigidas
          </p>
          
          <p className="text-xs leading-relaxed mt-4 mb-6" style={{ color: 'var(--foreground-muted)' }}>
            O terminal da Defesa Civil permite o envio de chamados de viatura para resgate e despacho de alertas pelo WhatsApp. Esta área de comando exige login de operador.
          </p>

          <button
            onClick={() => setAuthOpen(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl theme-btn-primary font-bold text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
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
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-700 font-sans space-y-8" style={{ color: 'var(--foreground)' }}>
      {/* Top Banner Operacional */}
      <div className="theme-card rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-[#2E6F40] font-bold">
            <span className="w-2 h-2 rounded-full bg-[#2E6F40]" />
            <span>CENTRAL INTEGRADA DE COMANDO E CONTROLE (CICC // 199)</span>
          </div>
          <span style={{ color: 'var(--border)' }}>|</span>
          <span style={{ color: 'var(--foreground-muted)' }}>CANAL MORADORES: <strong style={{ color: 'var(--primary)' }}>WHATSAPP BOT ATIVO</strong></span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span style={{ color: 'var(--foreground-muted)' }}>DESPACHO DE VIATURAS:</span>
          <strong className="text-[#2E6F40] font-bold">PRONTO</strong>
        </div>
      </div>

      {/* Header Principal */}
      <header className="pb-6 border-b flex flex-col md:flex-row justify-between md:items-end gap-6" style={{ borderColor: 'var(--border)' }}>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3" style={{ color: 'var(--foreground)' }}>
            <ShieldAlert className="w-8 h-8" style={{ color: 'var(--primary)' }} />
            Central Operacional &amp; Despacho de Socorro
          </h1>
          <p className="mt-1 text-xs md:text-sm max-w-2xl leading-relaxed" style={{ color: 'var(--foreground-muted)' }}>
            Painel institucional da Defesa Civil para triagem de ocorrências, telemetria de sensores e recebimento de <strong>denúncias com fotos enviadas por moradores via WhatsApp</strong>.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setReportModalOpen(true)}
            className="theme-btn-primary px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            Simular Denúncia WhatsApp c/ Foto
          </button>
        </div>
      </header>

      {/* Grid Principal: Tabela de Protocolos & Card do Bot WhatsApp */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Tabela de Protocolos de Emergência */}
        <div className="lg:col-span-8 theme-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#B91C1C]" />
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
                Fila de Chamados &amp; Ocorrências em Campo
              </h3>
            </div>
            <span className="text-[11px] font-mono" style={{ color: 'var(--foreground-muted)' }}>
              {protocols.length} PROTOCOLOS ATIVOS
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="theme-card-muted uppercase text-[10px] font-mono whitespace-nowrap" style={{ color: 'var(--foreground-muted)' }}>
                <tr>
                  <th className="px-4 py-3.5 font-semibold">Protocolo</th>
                  <th className="px-4 py-3.5 font-semibold">Foto &amp; Relato de Campo</th>
                  <th className="px-4 py-3.5 font-semibold">Gravidade</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                  <th className="px-4 py-3.5 font-semibold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y font-mono" style={{ borderColor: 'var(--border)' }}>
                {protocols.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm" style={{ color: 'var(--foreground-muted)' }}>
                      Nenhum chamado de emergência registrado no momento.
                    </td>
                  </tr>
                )}
                {protocols.map((p) => {
                  const isWhatsApp = p.channel === 'WhatsApp' || p.protocolCode.includes('WA') || Boolean(p.photo);
                  const cprmCode = p.riskLevel >= 80 ? 'R4' : p.riskLevel >= 60 ? 'R3' : p.riskLevel >= 35 ? 'R2' : 'R1';
                  
                  return (
                    <tr key={p.id} className="transition-colors group border-b" style={{ borderColor: 'var(--border)' }}>
                      {/* Protocolo e Origem */}
                      <td className="px-4 py-4 whitespace-nowrap align-middle">
                        <div className="font-bold text-xs" style={{ color: 'var(--foreground)' }}>{p.protocolCode}</div>
                        <div className="text-[10px] mt-0.5" style={{ color: 'var(--foreground-muted)' }}>
                          {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {isWhatsApp && (
                          <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded bg-[#2E6F40]/10 text-[#2E6F40] border border-[#2E6F40]/25 text-[9px] font-bold whitespace-nowrap">
                            <MessageSquare className="w-2.5 h-2.5 shrink-0" /> WhatsApp 199
                          </span>
                        )}
                      </td>

                      {/* Foto e Relato do Morador */}
                      <td className="px-4 py-4 min-w-[260px] max-w-[360px] align-middle">
                        <div className="flex items-center gap-3">
                          {p.photo ? (
                            <button
                              onClick={() => setSelectedIncident(p)}
                              className="relative w-14 h-11 rounded-lg overflow-hidden border flex-shrink-0 group/photo cursor-pointer transition-colors bg-black/20"
                              style={{ borderColor: 'var(--border)' }}
                              title="Clique para ver foto ampliada"
                            >
                              <img 
                                src={p.photo} 
                                alt="Registro"
                                onError={(e) => { e.currentTarget.src = '/encosta-fissura.svg'; }}
                                className="w-full h-full object-cover group-hover/photo:scale-105 transition-transform" 
                              />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                            </button>
                          ) : (
                            <div className="w-14 h-11 rounded-lg theme-card-muted flex items-center justify-center flex-shrink-0" style={{ color: 'var(--foreground-muted)' }}>
                              <ShieldAlert className="w-4 h-4" />
                            </div>
                          )}

                          <div className="overflow-hidden">
                            <p className="text-xs font-sans line-clamp-2 leading-snug" style={{ color: 'var(--foreground)' }}>
                              {p.description || 'Alerta automático emitido por modelo geotécnico.'}
                            </p>
                            {p.phone && (
                              <span className="text-[10px] flex items-center gap-1 mt-1 font-mono whitespace-nowrap" style={{ color: 'var(--primary)' }}>
                                <Phone className="w-2.5 h-2.5 shrink-0" /> {p.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Nível de Risco */}
                      <td className="px-4 py-4 whitespace-nowrap align-middle">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase whitespace-nowrap ${
                          p.riskLevel >= 80 ? 'bg-[#B91C1C]/15 text-[#B91C1C] border border-[#B91C1C]/30' : 
                          p.riskLevel >= 60 ? 'bg-[#C85A17]/15 text-[#C85A17] border border-[#C85A17]/30' :
                          'bg-[#B47B1C]/15 text-[#B47B1C] border border-[#B47B1C]/30'
                        }`}>
                          <span>{cprmCode}</span>
                          <span>•</span>
                          <span>{p.riskLevel}%</span>
                        </span>
                      </td>

                      {/* Status Operacional */}
                      <td className="px-4 py-4 whitespace-nowrap align-middle">
                        <div className="inline-flex items-center gap-1.5 text-[11px] whitespace-nowrap">
                          {getStatusIcon(p.status)}
                          <span className={
                            p.status === 'Finalizado' ? 'text-[#2E6F40] font-bold' : 
                            p.status === 'Equipe enviada' ? 'text-[#C85A17] font-bold' : 
                            'text-[#B47B1C] font-medium'
                          }>
                            {p.status}
                          </span>
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-4 text-right whitespace-nowrap align-middle">
                        <div className="inline-flex items-center justify-end gap-2">
                          {p.photo && (
                            <button
                              onClick={() => setSelectedIncident(p)}
                              className="p-1.5 rounded-lg theme-card-muted transition-colors cursor-pointer"
                              style={{ color: 'var(--primary)' }}
                              title="Inspecionar Denúncia"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          {p.status === 'Em análise' && (
                            <button 
                              onClick={() => updateStatus(p.id, 'Equipe enviada')} 
                              className="text-[10px] px-3 py-1.5 theme-btn-primary rounded-lg transition-all font-bold uppercase tracking-wider cursor-pointer active:scale-95"
                            >
                              Despachar
                            </button>
                          )}
                          {p.status === 'Equipe enviada' && (
                            <button 
                              onClick={() => updateStatus(p.id, 'Finalizado')} 
                              className="text-[10px] px-3 py-1.5 bg-[#2E6F40] hover:bg-[#245832] text-white rounded-lg transition-all font-bold uppercase tracking-wider cursor-pointer active:scale-95"
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
        <div className="lg:col-span-4 theme-card rounded-2xl p-5 flex flex-col w-full">
          <div className="flex items-center justify-between mb-4 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#2E6F40]" />
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
                Bot Integrado WhatsApp 199
              </h3>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[10px]">
              <span className={`w-2 h-2 rounded-full ${
                waStatus === 'CONNECTED' ? 'bg-[#2E6F40]' :
                waStatus === 'CONNECTING' ? 'bg-[#B47B1C] animate-pulse' :
                'bg-[#B91C1C]'
              }`} />
              <span className="uppercase" style={{ color: 'var(--foreground-muted)' }}>
                {waStatus === 'CONNECTED' ? 'Ativo' :
                 waStatus === 'CONNECTING' ? 'Conectando' :
                 'Aguardando'}
              </span>
            </div>
          </div>

          {waStatus === 'DISCONNECTED' && (
            <div className="flex flex-col items-center text-center py-2">
              {waQr ? (
                <div className="bg-white p-3 rounded-2xl shadow-md mb-4 relative group border" style={{ borderColor: 'var(--border)' }}>
                  <img 
                    src={waQr} 
                    alt="WhatsApp QR Code" 
                    className="w-44 h-44 block rounded-xl select-none"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center rounded-2xl pointer-events-none p-4">
                    <QrCode className="w-10 h-10 text-white mb-1" />
                    <span className="text-[10px] text-white font-mono uppercase tracking-wider">Pronto para Leitura</span>
                  </div>
                </div>
              ) : (
                <div className="w-44 h-44 rounded-2xl theme-card-muted flex flex-col items-center justify-center gap-2 mb-4">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
                  <span className="text-xs font-mono" style={{ color: 'var(--foreground-muted)' }}>Gerando QR Code...</span>
                </div>
              )}
              
              <h4 className="text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5 font-mono" style={{ color: 'var(--foreground)' }}>
                <Smartphone className="w-3.5 h-3.5 text-[#2E6F40]" /> Canal de Alertas 199
              </h4>
              <p className="text-[11px] leading-relaxed max-w-[260px] mb-4" style={{ color: 'var(--foreground-muted)' }}>
                Escaneie com seu celular para testar o envio de fotos e relatos em tempo real.
              </p>

              <div className="w-full space-y-2">
                <button
                  onClick={handleSimulateConnect}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#2E6F40] hover:bg-[#245832] text-white font-mono font-bold text-[10px] uppercase tracking-wider cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Simular Pareamento do Celular
                </button>

                <button
                  onClick={fetchWaStatus}
                  className="w-full py-2 px-3 rounded-lg theme-btn-secondary font-mono text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCw className="w-3 h-3" />
                  Recarregar QR Code
                </button>
              </div>
            </div>
          )}

          {waStatus === 'CONNECTING' && (
            <div className="flex flex-col items-center text-center py-10">
              <Loader2 className="w-8 h-8 animate-spin mb-3" style={{ color: 'var(--primary)' }} />
              <h4 className="text-xs font-bold uppercase tracking-wider mb-1 font-mono" style={{ color: 'var(--foreground)' }}>Conectando Terminal...</h4>
              {waProgress !== null && (
                <div className="w-full theme-card-muted rounded-full h-1.5 max-w-[180px] mb-2 overflow-hidden mt-3">
                  <div className="bg-[#2E6F40] h-1.5 rounded-full transition-all duration-300" style={{ width: `${waProgress}%` }} />
                </div>
              )}
              <span className="text-[10px] font-mono mt-1" style={{ color: 'var(--foreground-muted)' }}>
                {waLoadingMsg || 'Iniciando WhatsApp Web no servidor...'}
              </span>
            </div>
          )}

          {waStatus === 'CONNECTED' && (
            <div className="space-y-4">
              <div className="bg-[#2E6F40]/10 border border-[#2E6F40]/25 p-3.5 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#2E6F40]/20 flex items-center justify-center text-[#2E6F40] flex-shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: 'var(--foreground)' }}>Terminal Ativo</h4>
                    <p className="text-[10px] font-mono" style={{ color: 'var(--foreground-muted)' }}>+55 (21) 98124-5500</p>
                  </div>
                </div>

                <button
                  onClick={handleDisconnectWa}
                  className="p-1.5 rounded-lg theme-card-muted hover:text-[#B91C1C] transition-colors cursor-pointer"
                  style={{ color: 'var(--foreground-muted)' }}
                  title="Desconectar"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="theme-card-muted rounded-xl p-3.5 space-y-2 text-[11px] font-mono">
                <span className="text-[9px] uppercase tracking-wider block" style={{ color: 'var(--foreground-muted)' }}>Comandos Aceitos pelo Bot:</span>
                <div className="space-y-1.5 text-[10px]" style={{ color: 'var(--foreground)' }}>
                  <div className="flex justify-between"><span>📸 Envio de Foto:</span><strong className="text-[#2E6F40]">Gera Chamado</strong></div>
                  <div className="flex justify-between"><span>1: Ver Risco do CEP</span><strong style={{ color: 'var(--primary)' }}>Consulta DEM</strong></div>
                  <div className="flex justify-between"><span>2: Cadastrar CEP</span><strong>Alerta SMS/WA</strong></div>
                  <div className="flex justify-between"><span>3: Rotas de Fuga</span><strong className="text-[#B47B1C]">Pontos Apoio</strong></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Inspeção Pericial em Alta Resolução da Denúncia */}
      <AnimatePresence>
        {selectedIncident && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl theme-card rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Top Modal Bar */}
              <div className="p-4 border-b flex items-center justify-between theme-card-muted" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2 font-mono">
                  <span className="px-2.5 py-0.5 rounded bg-[#B91C1C]/15 text-[#B91C1C] border border-[#B91C1C]/30 text-[10px] font-bold">
                    PROTOCOLO {selectedIncident.protocolCode}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Inspeção de Campo</span>
                </div>
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="p-1 rounded-lg transition-colors cursor-pointer"
                  style={{ color: 'var(--foreground-muted)' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Corpo do Modal */}
              <div className="p-6 overflow-y-auto space-y-4">
                {selectedIncident.photo && (
                  <div className="relative rounded-2xl overflow-hidden border aspect-video bg-black" style={{ borderColor: 'var(--border)' }}>
                    <img 
                      src={selectedIncident.photo} 
                      alt="Registro de Campo" 
                      onError={(e) => { e.currentTarget.src = '/encosta-fissura.svg'; }}
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-mono text-white flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" /> FOTO TRANSMITIDA VIA WHATSAPP (CRIPTOGRAFIA E2E)
                    </div>
                  </div>
                )}

                <div className="theme-card-muted rounded-2xl p-4 space-y-2">
                  <span className="text-[10px] font-mono uppercase block" style={{ color: 'var(--foreground-muted)' }}>Relato Original do Cidadão:</span>
                  <p className="text-xs md:text-sm leading-relaxed font-sans" style={{ color: 'var(--foreground)' }}>
                    &ldquo;{selectedIncident.description}&rdquo;
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
                  <div className="theme-card-muted p-3 rounded-xl">
                    <span className="text-[9px] uppercase block" style={{ color: 'var(--foreground-muted)' }}>Telefone do Morador:</span>
                    <strong className="text-xs" style={{ color: 'var(--primary)' }}>{selectedIncident.phone || 'Não informado'}</strong>
                  </div>
                  <div className="theme-card-muted p-3 rounded-xl">
                    <span className="text-[9px] uppercase block" style={{ color: 'var(--foreground-muted)' }}>Localização / Setor:</span>
                    <strong className="text-xs truncate block" style={{ color: 'var(--foreground)' }}>{selectedIncident.location || 'Encosta Monitorada'}</strong>
                  </div>
                </div>
              </div>

              {/* Ações de Despacho */}
              <div className="p-4 border-t theme-card-muted flex flex-wrap items-center justify-between gap-3" style={{ borderColor: 'var(--border)' }}>
                <div className="text-xs font-mono flex items-center gap-2" style={{ color: 'var(--foreground-muted)' }}>
                  <span>Status:</span>
                  <strong className={selectedIncident.status === 'Equipe enviada' ? 'text-[#C85A17]' : 'text-[#B47B1C]'}>
                    {selectedIncident.status}
                  </strong>
                </div>

                <div className="flex items-center gap-2">
                  {selectedIncident.status === 'Em análise' && (
                    <button
                      onClick={() => updateStatus(selectedIncident.id, 'Equipe enviada')}
                      className="px-4 py-2 rounded-xl theme-btn-primary font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      Autorizar Despacho de Viatura
                    </button>
                  )}
                  {selectedIncident.status === 'Equipe enviada' && (
                    <button
                      onClick={() => updateStatus(selectedIncident.id, 'Finalizado')}
                      className="px-4 py-2 rounded-xl bg-[#2E6F40] hover:bg-[#245832] text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer active:scale-95"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg theme-card rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-[#2E6F40]" />
                  <h3 className="text-sm font-bold uppercase font-mono tracking-wider" style={{ color: 'var(--foreground)' }}>
                    Simular Denúncia via WhatsApp
                  </h3>
                </div>
                <button
                  onClick={() => setReportModalOpen(false)}
                  className="p-1 rounded-lg cursor-pointer"
                  style={{ color: 'var(--foreground-muted)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div>
                  <label className="text-[10px] uppercase block mb-1" style={{ color: 'var(--foreground-muted)' }}>Telefone do Morador:</label>
                  <input
                    type="text"
                    value={reportPhone}
                    onChange={(e) => setReportPhone(e.target.value)}
                    className="w-full theme-card-muted rounded-xl px-3 py-2 focus:outline-none"
                    style={{ color: 'var(--foreground)' }}
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase block mb-1" style={{ color: 'var(--foreground-muted)' }}>Localização da Encosta:</label>
                  <input
                    type="text"
                    value={reportLocation}
                    onChange={(e) => setReportLocation(e.target.value)}
                    className="w-full theme-card-muted rounded-xl px-3 py-2 focus:outline-none"
                    style={{ color: 'var(--foreground)' }}
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase block mb-1" style={{ color: 'var(--foreground-muted)' }}>Relato / Mensagem de Texto:</label>
                  <textarea
                    rows={3}
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    className="w-full theme-card-muted rounded-xl px-3 py-2 focus:outline-none resize-none font-sans"
                    style={{ color: 'var(--foreground)' }}
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase block mb-1" style={{ color: 'var(--foreground-muted)' }}>Foto da Trinca / Encosta:</label>
                  <div className="flex items-center gap-3">
                    <img 
                      src={reportPhoto} 
                      alt="Preview" 
                      onError={(e) => { e.currentTarget.src = '/encosta-fissura.svg'; }}
                      className="w-16 h-12 rounded-lg object-cover border"
                      style={{ borderColor: 'var(--border)' }}
                    />
                    <span className="text-[10px] text-[#2E6F40]">
                      Foto de campo pronta para transmissão instantânea.
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-3" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={() => setReportModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono cursor-pointer"
                  style={{ color: 'var(--foreground-muted)' }}
                >
                  Cancelar
                </button>

                <button
                  onClick={handleSendTestReport}
                  disabled={sendingReport}
                  className="px-5 py-2.5 rounded-xl theme-btn-primary font-mono font-bold text-xs uppercase tracking-wider active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {sendingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Transmitir Chamado
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
