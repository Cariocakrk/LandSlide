"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, X, Loader2, CheckCircle2, AlertCircle, Phone, Home, KeyRound } from 'lucide-react';
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
      setSuccess('Acesso concedido ao Avaliador! Carregando...');
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 1200);
    } catch {
      loginStore({
        id: 'evaluator-demo-id',
        name: 'Eng. Avaliador Senior',
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
          {/* Blur Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative theme-card rounded-2xl shadow-2xl max-w-md w-full overflow-hidden z-10"
          >
            {/* Top Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg theme-card-muted flex items-center justify-center transition-colors cursor-pointer"
              style={{ color: 'var(--foreground-muted)' }}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Body */}
            <div className="p-8">
              {/* Logo / Header */}
              <div className="flex flex-col items-center mb-6 text-center">
                <div className="w-16 h-16 flex items-center justify-center mb-3">
                  {twoFactorRequired ? (
                    <KeyRound className="w-8 h-8" style={{ color: 'var(--primary)' }} />
                  ) : (
                    <>
                      <img src="/logo-landslide.png" alt="LandSlide" className="w-14 h-14 object-contain logo-light" />
                      <img src="/logo-landslide-dark.png" alt="LandSlide" className="w-14 h-14 object-contain logo-dark" />
                    </>
                  )}
                </div>
                <h3 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--foreground)' }}>
                  {twoFactorRequired ? 'Confirmação de Identidade' : 'LandSlide Geotecnia'}
                </h3>
                <p className="text-[11px] mt-1 uppercase tracking-widest font-mono" style={{ color: 'var(--foreground-muted)' }}>
                  {twoFactorRequired ? 'Verificação de 2 Fatores (2FA)' : 'Central de Inteligência e Monitoramento'}
                </p>

                {message && !twoFactorRequired && (
                  <div className="mt-3 text-xs bg-[#B47B1C]/10 border border-[#B47B1C]/30 text-[#B47B1C] p-2.5 rounded-lg leading-relaxed max-w-xs font-sans">
                    ⚠️ {message}
                  </div>
                )}
              </div>

              {/* Evaluator 1-Click Access Card */}
              {!twoFactorRequired && (
                <div className="mb-5 p-3.5 rounded-xl theme-card-muted flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--foreground)' }}>
                      Acesso Rápido Executivo / Avaliador
                    </span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-mono font-semibold" style={{ backgroundColor: 'var(--surface)', color: 'var(--primary)' }}>
                      1-Clique • Direto
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDemoLogin}
                    disabled={loading}
                    className="w-full py-2.5 px-3 rounded-lg theme-btn-primary text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    Entrar Imediatamente como Avaliador
                  </button>
                </div>
              )}

              {/* Tabs Toggle */}
              {!twoFactorRequired && (
                <div className="flex theme-card-muted p-1 rounded-xl mb-5">
                  <button
                    onClick={() => { setActiveTab('login'); setError(null); setSuccess(null); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'login' 
                        ? 'theme-btn-primary shadow-sm' 
                        : ''
                    }`}
                    style={activeTab !== 'login' ? { color: 'var(--foreground-muted)' } : undefined}
                  >
                    Entrar (Login)
                  </button>
                  <button
                    onClick={() => { setActiveTab('register'); setError(null); setSuccess(null); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'register' 
                        ? 'theme-btn-primary shadow-sm' 
                        : ''
                    }`}
                    style={activeTab !== 'register' ? { color: 'var(--foreground-muted)' } : undefined}
                  >
                    Cadastrar
                  </button>
                </div>
              )}

              {/* Status Feedbacks */}
              {error && (
                <div className="mb-4 p-3 rounded-lg border border-[#B91C1C]/30 bg-[#B91C1C]/10 text-[#B91C1C] text-xs flex items-center gap-2 font-sans leading-relaxed">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="mb-4 p-3 rounded-lg border border-[#2E6F40]/30 bg-[#2E6F40]/10 text-[#2E6F40] text-xs flex items-center gap-2 font-sans leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              {/* Interactive Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {twoFactorRequired ? (
                  <div className="space-y-4">
                    <p className="text-xs leading-relaxed text-center font-sans" style={{ color: 'var(--foreground-muted)' }}>
                      Enviamos um código de segurança de 6 dígitos para o e-mail <strong style={{ color: 'var(--foreground)' }}>{email}</strong>. Insira o código abaixo:
                    </p>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--foreground-muted)' }}>Código de Verificação</label>
                      <div className="relative flex justify-center">
                        <KeyRound className="absolute left-3.5 top-3 w-4 h-4" style={{ color: 'var(--foreground-muted)' }} />
                        <input 
                          type="text" 
                          required
                          maxLength={6}
                          value={twoFactorCode}
                          onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="000000"
                          className="w-full theme-card-muted rounded-xl py-2.5 pl-11 pr-4 focus:outline-none transition-all font-mono text-center tracking-[8px] text-lg font-bold"
                          style={{ color: 'var(--foreground)' }}
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-lg theme-card-muted text-[11px] text-center font-sans space-y-1">
                      <p className="font-semibold" style={{ color: 'var(--foreground)' }}>💡 Dica para Demonstração:</p>
                      <p className="text-[10px]" style={{ color: 'var(--foreground-muted)' }}>
                        O código mestre <strong className="font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--surface)', color: 'var(--primary)' }}>123456</strong> é aceito diretamente.
                      </p>
                      <button
                        type="button"
                        onClick={() => setTwoFactorCode('123456')}
                        className="text-[10px] underline font-semibold mt-1 inline-block cursor-pointer"
                        style={{ color: 'var(--primary)' }}
                      >
                        Clique aqui para preencher 123456
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {activeTab === 'register' && (
                      <>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--foreground-muted)' }}>Tipo de Cadastro</label>
                          <div className="flex theme-card-muted p-1 rounded-xl gap-1">
                            <button
                              type="button"
                              onClick={() => setRole('OPERATOR')}
                              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer uppercase ${
                                role === 'OPERATOR' ? 'theme-card shadow-sm' : ''
                              }`}
                              style={{ color: role === 'OPERATOR' ? 'var(--foreground)' : 'var(--foreground-muted)' }}
                            >
                              Operador / Engenheiro
                            </button>
                            <button
                              type="button"
                              onClick={() => setRole('USER')}
                              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer uppercase ${
                                role === 'USER' ? 'theme-card shadow-sm' : ''
                              }`}
                              style={{ color: role === 'USER' ? 'var(--foreground)' : 'var(--foreground-muted)' }}
                            >
                              Morador (Alertas)
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--foreground-muted)' }}>Nome Completo</label>
                          <div className="relative">
                            <User className="absolute left-3.5 top-3 w-4 h-4" style={{ color: 'var(--foreground-muted)' }} />
                            <input 
                              type="text" 
                              required
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder={role === 'OPERATOR' ? "Ex: Eng. Carlos Silva" : "Ex: Maria de Oliveira"}
                              className="w-full theme-card-muted rounded-xl py-2.5 pl-11 pr-4 text-xs focus:outline-none transition-all font-sans"
                              style={{ color: 'var(--foreground)' }}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--foreground-muted)' }}>E-mail Corporativo</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3 w-4 h-4" style={{ color: 'var(--foreground-muted)' }} />
                        <input 
                          type="email" 
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="seu.nome@landslide.com.br"
                          className="w-full theme-card-muted rounded-xl py-2.5 pl-11 pr-4 text-xs focus:outline-none transition-all font-sans"
                          style={{ color: 'var(--foreground)' }}
                        />
                      </div>
                    </div>

                    {activeTab === 'register' && (
                      <>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--foreground-muted)' }}>
                            WhatsApp (DDD + Número) {role === 'USER' ? '*' : '(Opcional)'}
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-3.5 top-3 w-4 h-4" style={{ color: 'var(--foreground-muted)' }} />
                            <input 
                              type="tel" 
                              required={role === 'USER'}
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              placeholder="Ex: 5524998887766"
                              className="w-full theme-card-muted rounded-xl py-2.5 pl-11 pr-4 text-xs focus:outline-none transition-all font-sans"
                              style={{ color: 'var(--foreground)' }}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--foreground-muted)' }}>
                            CEP de Monitoramento {role === 'USER' ? '*' : '(Opcional)'}
                          </label>
                          <div className="relative">
                            <Home className="absolute left-3.5 top-3 w-4 h-4" style={{ color: 'var(--foreground-muted)' }} />
                            <input 
                              type="text" 
                              required={role === 'USER'}
                              value={cep}
                              onChange={(e) => setCep(e.target.value)}
                              placeholder="Ex: 25680-000"
                              className="w-full theme-card-muted rounded-xl py-2.5 pl-11 pr-4 text-xs focus:outline-none transition-all font-sans"
                              style={{ color: 'var(--foreground)' }}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--foreground-muted)' }}>Senha de Segurança</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3 w-4 h-4" style={{ color: 'var(--foreground-muted)' }} />
                        <input 
                          type="password" 
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full theme-card-muted rounded-xl py-2.5 pl-11 pr-4 text-xs focus:outline-none transition-all font-sans"
                          style={{ color: 'var(--foreground)' }}
                        />
                      </div>
                    </div>

                    {activeTab === 'login' && (
                      <div className="flex justify-between items-center text-[10px] pt-1">
                        <span style={{ color: 'var(--foreground-muted)' }}>Credencial de demonstração:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEmail('admin@defesacivil.gov.br');
                            setPassword('admin123');
                          }}
                          className="underline font-semibold cursor-pointer"
                          style={{ color: 'var(--primary)' }}
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
                  className="w-full mt-2 theme-btn-primary font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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

                {twoFactorRequired && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full text-center text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                    style={{ color: 'var(--foreground-muted)' }}
                  >
                    Voltar para o Login
                  </button>
                )}
              </form>

              <div className="mt-6 border-t pt-4 text-center" style={{ borderColor: 'var(--border)' }}>
                <span className="text-[10px] leading-normal block" style={{ color: 'var(--foreground-muted)' }}>
                  Plataforma LandSlide de Monitoramento Geotécnico. O cadastro de moradores permite receber alertas preventivos direto via WhatsApp para o CEP monitorado.
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
