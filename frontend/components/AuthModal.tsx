"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ShieldAlert, X, Loader2, CheckCircle2, AlertCircle, Phone, Home, KeyRound } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { apiFetch } from '@/lib/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export function AuthModal({ isOpen, onClose, message }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'OPERATOR' | 'USER'>('OPERATOR');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cep, setCep] = useState('');
  
  // Estados para o fluxo 2FA
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loginStore = useAuthStore(state => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Se estivermos no fluxo de verificação 2FA
    if (twoFactorRequired) {
      try {
        const res = await apiFetch('/api/auth/verify-2fa', {
          method: 'POST',
          body: JSON.stringify({ code: twoFactorCode, tempToken })
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Código inválido ou expirado');
        }

        loginStore(data.user, data.token);
        setSuccess('Autenticação confirmada! Carregando painel...');
        setTimeout(() => {
          setSuccess(null);
          setTwoFactorRequired(false);
          setTwoFactorCode('');
          setTempToken('');
          onClose();
        }, 1500);
      } catch (err: any) {
        setError(err.message || 'Erro ao validar o código 2FA');
      } finally {
        setLoading(false);
      }
      return;
    }

    const path = activeTab === 'login' 
      ? '/api/auth/login'
      : '/api/auth/register';

    const body = activeTab === 'login'
      ? { email, password }
      : { name, email, password, role, phoneNumber, cep };

    try {
      const res = await apiFetch(path, {
        method: 'POST',
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ocorreu um erro no processamento');
      }

      if (activeTab === 'login') {
        // Se o backend exigir verificação de 2 fatores
        if (data.twoFactorRequired) {
          setTwoFactorRequired(true);
          setTempToken(data.tempToken);
          if (data.devCode) {
            setTwoFactorCode(data.devCode);
            setSuccess(`Código de avaliação gerado: ${data.devCode} (auto-preenchido)`);
          } else {
            setSuccess('Código de 2 fatores enviado para seu e-mail!');
          }
          setTimeout(() => setSuccess(null), 4000);
        } else {
          loginStore(data.user, data.token);
          setSuccess('Acesso concedido! Carregando painel...');
          setTimeout(() => {
            setSuccess(null);
            onClose();
          }, 1500);
        }
      } else {
        setSuccess('Cadastro concluído com sucesso! Agora você pode fazer login.');
        setActiveTab('login');
        setName('');
        setPassword('');
        setPhoneNumber('');
        setCep('');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await apiFetch('/api/auth/demo-login', {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha no login de demonstração');
      }
      loginStore(data.user, data.token);
      setSuccess('Acesso concedido à Banca Avaliadora! Carregando...');
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      // Fallback de demonstração offline caso o backend remoto esteja temporariamente inacessível
      loginStore({
        id: 'evaluator-demo-id',
        name: 'Prof. Avaliador (Banca TCC)',
        email: 'admin@defesacivil.gov.br',
        role: 'OPERATOR'
      }, 'mock-evaluator-jwt-token');
      setSuccess('Modo Avaliador ativado localmente!');
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 1200);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTwoFactorRequired(false);
    setTwoFactorCode('');
    setTempToken('');
    setError(null);
    setSuccess(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Dark Blur Overlay Background */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative border border-white/10 bg-[#070709ee] backdrop-blur-3xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.95)] max-w-md w-full overflow-hidden z-10"
          >
            {/* Top Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white hover:bg-white/5 w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Body */}
            <div className="p-8">
              {/* Logo / Header */}
              <div className="flex flex-col items-center mb-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3 shadow-inner">
                  {twoFactorRequired ? (
                    <KeyRound className="w-6 h-6 animate-pulse" />
                  ) : (
                    <ShieldAlert className="w-6 h-6 animate-pulse" />
                  )}
                </div>
                <h3 className="text-xl font-black text-white tracking-wide">
                  {twoFactorRequired ? 'Confirmação de Identidade' : 'Central GeoShield Monitor'}
                </h3>
                <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-mono">
                  {twoFactorRequired ? 'Código de 2 fatores (2FA)' : 'Painel de Controle e Monitoramento'}
                </p>

                {message && !twoFactorRequired && (
                  <div className="mt-3 text-xs text-yellow-500/90 bg-yellow-500/5 border border-yellow-500/10 p-2.5 rounded-lg leading-relaxed max-w-xs font-sans">
                    ⚠️ {message}
                  </div>
                )}
              </div>

              {/* Evaluator 1-Click Access Card */}
              {!twoFactorRequired && (
                <div className="mb-4 p-3 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      🎓 Avaliação / Banca de TCC
                    </span>
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">
                      1-Clique • Sem 2FA
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDemoLogin}
                    disabled={loading}
                    className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-amber-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    Entrar Imediatamente como Avaliador
                  </button>
                </div>
              )}

              {/* Tabs Toggle (Hidden if 2FA is active) */}
              {!twoFactorRequired && (
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 mb-6">
                  <button
                    onClick={() => { setActiveTab('login'); setError(null); setSuccess(null); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'login' 
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Entrar (Login)
                  </button>
                  <button
                    onClick={() => { setActiveTab('register'); setError(null); setSuccess(null); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'register' 
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Cadastrar
                  </button>
                </div>
              )}

              {/* Status Feedbacks */}
              {error && (
                <div className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-xs flex items-center gap-2 font-sans leading-relaxed animate-shake">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="mb-4 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs flex items-center gap-2 font-sans leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              {/* Interactive Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {twoFactorRequired ? (
                  /* 2FA Code Form Input */
                  <div className="space-y-4">
                    <p className="text-xs text-gray-400 leading-relaxed text-center font-sans">
                      Enviamos um código de segurança de 6 dígitos para o e-mail <strong>{email}</strong>. Insira o código abaixo para prosseguir:
                    </p>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Código de Verificação</label>
                      <div className="relative flex justify-center">
                        <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                        <input 
                          type="text" 
                          required
                          maxLength={6}
                          value={twoFactorCode}
                          onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="Digite os 6 dígitos"
                          className="w-full bg-[#0a0a0c] border border-white/5 focus:border-blue-500/40 rounded-xl py-2.5 pl-11 pr-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all font-sans text-center tracking-[10px] text-lg font-bold"
                        />
                      </div>
                    </div>

                    {/* Master Code Hint for Evaluator */}
                    <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 text-center font-sans space-y-1">
                      <p className="font-semibold">💡 Para Avaliadores / Apresentação de TCC:</p>
                      <p className="text-[10px] text-blue-200/80">
                        O código mestre <strong className="text-white font-mono bg-blue-500/30 px-1.5 py-0.5 rounded">123456</strong> ou <strong className="text-white font-mono bg-blue-500/30 px-1.5 py-0.5 rounded">000000</strong> é aceito diretamente sem necessidade de consultar e-mail.
                      </p>
                      <button
                        type="button"
                        onClick={() => setTwoFactorCode('123456')}
                        className="text-[10px] text-amber-300 underline font-semibold hover:text-amber-200 mt-1 inline-block cursor-pointer"
                      >
                        Clique aqui para preencher 123456
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard Login/Register Inputs */
                  <>
                    {activeTab === 'register' && (
                      <>
                        {/* Perfil de Cadastro Toggle */}
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Tipo de Cadastro</label>
                          <div className="flex bg-[#0a0a0c] p-1 rounded-xl border border-white/5 gap-1">
                            <button
                              type="button"
                              onClick={() => setRole('OPERATOR')}
                              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer uppercase ${
                                role === 'OPERATOR' 
                                  ? 'bg-white/10 text-white border border-white/10' 
                                  : 'text-gray-500 hover:text-gray-400'
                              }`}
                            >
                              Operador Civil
                            </button>
                            <button
                              type="button"
                              onClick={() => setRole('USER')}
                              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer uppercase ${
                                role === 'USER' 
                                  ? 'bg-white/10 text-white border border-white/10' 
                                  : 'text-gray-500 hover:text-gray-400'
                              }`}
                            >
                              Morador (Alertas)
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Nome Completo</label>
                          <div className="relative">
                            <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                            <input 
                              type="text" 
                              required
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder={role === 'OPERATOR' ? "Ex: Dr. Carlos Silva" : "Ex: Maria de Oliveira"}
                              className="w-full bg-[#0a0a0c] border border-white/5 focus:border-blue-500/40 rounded-xl py-2.5 pl-11 pr-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all font-sans"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">E-mail</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                        <input 
                          type="email" 
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder={role === 'OPERATOR' ? "seu.nome@geoshield.gov" : "seu.email@provedor.com"}
                          className="w-full bg-[#0a0a0c] border border-white/5 focus:border-blue-500/40 rounded-xl py-2.5 pl-11 pr-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all font-sans"
                        />
                      </div>
                    </div>

                    {activeTab === 'register' && (
                      <>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                            WhatsApp (DDD + Número) {role === 'USER' ? '*' : '(Opcional)'}
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                            <input 
                              type="tel" 
                              required={role === 'USER'}
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              placeholder="Ex: 5524998887766"
                              className="w-full bg-[#0a0a0c] border border-white/5 focus:border-blue-500/40 rounded-xl py-2.5 pl-11 pr-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all font-sans"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                            CEP de Residência {role === 'USER' ? '*' : '(Opcional)'}
                          </label>
                          <div className="relative">
                            <Home className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                            <input 
                              type="text" 
                              required={role === 'USER'}
                              value={cep}
                              onChange={(e) => setCep(e.target.value)}
                              placeholder="Ex: 25680-000"
                              className="w-full bg-[#0a0a0c] border border-white/5 focus:border-blue-500/40 rounded-xl py-2.5 pl-11 pr-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all font-sans"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Senha de Segurança</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                        <input 
                          type="password" 
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#0a0a0c] border border-white/5 focus:border-blue-500/40 rounded-xl py-2.5 pl-11 pr-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all font-sans"
                        />
                      </div>
                    </div>

                    {activeTab === 'login' && (
                      <div className="flex justify-between items-center text-[10px] pt-1">
                        <span className="text-gray-500">Credencial de teste:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEmail('admin@defesacivil.gov.br');
                            setPassword('admin123');
                          }}
                          className="text-blue-400 hover:text-blue-300 underline cursor-pointer"
                        >
                          Preencher Operador Padrão
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all duration-200 active:scale-98 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Processando...
                    </>
                  ) : twoFactorRequired ? (
                    'Confirmar Código 2FA'
                  ) : activeTab === 'login' ? (
                    'Entrar na Central'
                  ) : (
                    'Finalizar Cadastro'
                  )}
                </button>

                {/* Voltar ao Login option for 2FA */}
                {twoFactorRequired && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full text-center text-[10px] text-gray-500 hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Voltar para o Login
                  </button>
                )}
              </form>

            {/* Informative Footer */}
            <div className="mt-6 border-t border-white/5 pt-4 text-center">
              <span className="text-[10px] text-gray-500 leading-normal block">
                Acesso livre para consulta pública básica. Cadastro de moradores permite receber alertas funcionais de deslizamento direto via WhatsApp para o seu CEP residencial no TCC.
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
}
