import Link from 'next/link';
import { 
  ShieldAlert, ArrowRight, Mountain, CloudRain, Cpu, Radio, 
  MapPin, CheckCircle2, AlertOctagon, Terminal, Smartphone, 
  Database, Compass, Layers, ShieldCheck, Activity, FileText
} from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen relative bg-[#020408] font-sans text-slate-100 overflow-x-hidden selection:bg-blue-500/30 selection:text-blue-200">
      {/* Dynamic Background Atmosphere */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-blue-600/10 blur-[140px]" />
        <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] rounded-full bg-orange-600/10 blur-[160px]" />
        <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-600/10 blur-[160px]" />
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* 1. Ticker Tático Superior de Operação CICC */}
      <div className="w-full bg-black/60 border-b border-white/10 px-4 py-2.5 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-2 text-emerald-400 font-bold tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              SISTEMA INTEGRADO DE DEFESA CIVIL
            </span>
            <span className="text-gray-700">|</span>
            <span className="text-gray-400">
              RADAR ORBITAL: <strong className="text-slate-200">SRTM-30M ATIVO</strong>
            </span>
            <span className="text-gray-700 hidden sm:inline">|</span>
            <span className="text-gray-400 hidden sm:inline">
              EQUILÍBRIO DE TALUDE: <strong className="text-cyan-400">MOHR-COULOMB</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 text-gray-400">
            <span>CONFORMIDADE: <strong className="text-white font-semibold">NBR 11682</strong></span>
            <span className="text-gray-700">|</span>
            <span className="text-blue-400 flex items-center gap-1 font-bold">
              <Radio className="w-3 h-3 animate-spin" /> DISPATCH SERVERLESS ONLINE
            </span>
          </div>
        </div>
      </div>

      <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full z-10 pt-10 md:pt-16 space-y-20">
        {/* 2. Hero Section de Alto Impacto */}
        <header className="text-center max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-1000">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 text-blue-400 mb-6 border border-blue-500/30 text-xs font-mono tracking-widest uppercase font-semibold shadow-inner">
            <ShieldAlert className="w-4 h-4 text-blue-400" />
            Centro de Comando e Inteligência Geotécnica
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight mb-6 text-white drop-shadow-md leading-[1.08]">
            Previsão Preditiva de <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-500 to-rose-600">
              Deslizamentos de Encostas
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
            Plataforma computacional de alerta antecipado para a <strong>Defesa Civil</strong>. 
            Modela a topografia em alta resolução via satélite, calcula o <strong>Fator de Segurança (FS)</strong> em tempo real com mecânica dos solos e dispara alertas automatizados de evacuação para comunidades em risco.
          </p>

          {/* Ações de Comando Principais */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link 
              href="/dashboard" 
              className="relative group inline-flex h-13 items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 px-8 text-sm font-bold text-white shadow-xl shadow-blue-600/25 transition-all duration-200 cursor-pointer active:scale-95 uppercase tracking-wider font-mono gap-2 border border-blue-400/30"
            >
              <Activity className="w-4 h-4 text-blue-200" />
              <span>Acessar Centro de Comando</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link 
              href="/gerar-terreno" 
              className="inline-flex h-13 items-center justify-center rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/30 backdrop-blur-xl px-7 text-sm font-bold text-white shadow-lg transition-all duration-200 cursor-pointer active:scale-95 uppercase tracking-wider font-mono gap-2"
            >
              <MapPin className="w-4 h-4 text-cyan-400" />
              <span>Topografia 3D por CEP</span>
            </Link>

            <Link 
              href="/defesa-civil" 
              className="inline-flex h-13 items-center justify-center rounded-xl border border-white/10 bg-black/40 hover:bg-white/5 hover:border-orange-500/40 px-6 text-sm font-bold text-orange-400 shadow-md transition-all duration-200 cursor-pointer active:scale-95 uppercase tracking-wider font-mono gap-2"
            >
              <Terminal className="w-4 h-4 text-orange-400" />
              <span>Terminal de Despacho</span>
            </Link>
          </div>

          {/* Quick Telemetry Bar do Hero */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-14 pt-8 border-t border-white/10 text-left">
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
              <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider block">Resolução Topográfica</span>
              <strong className="text-sm font-mono text-cyan-400 font-bold block mt-0.5">SRTM 30m Submétrica</strong>
              <span className="text-[10px] text-gray-500">Mapeamento nacional</span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
              <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider block">Motor Geotécnico</span>
              <strong className="text-sm font-mono text-emerald-400 font-bold block mt-0.5">Mohr-Coulomb</strong>
              <span className="text-[10px] text-gray-500">Talude Infinito (FS)</span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
              <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider block">Limiar CEMADEN</span>
              <strong className="text-sm font-mono text-amber-400 font-bold block mt-0.5">100 mm / 72h</strong>
              <span className="text-[10px] text-gray-500">Gatilho de ruptura</span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
              <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider block">Alerta Comunitário</span>
              <strong className="text-sm font-mono text-purple-400 font-bold block mt-0.5">&lt; 3 Segundos</strong>
              <span className="text-[10px] text-gray-500">WhatsApp geolocalizado</span>
            </div>
          </div>
        </header>

        {/* 3. Os 4 Pilares da Arquitetura Tecnológica */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-blue-400 font-bold">
                Arquitetura de Missão Crítica
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mt-1">
                Pilares Tecnológicos da Plataforma
              </h2>
            </div>
            <span className="text-xs font-mono text-gray-500">
              ENGENHARIA GEOTÉCNICA + COMPUTAÇÃO IOT
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Pilar 1 */}
            <div className="border border-white/10 bg-slate-950/70 backdrop-blur-xl rounded-2xl p-6 flex flex-col justify-between hover:border-cyan-500/40 transition-all shadow-xl group border-t-cyan-500/20">
              <div>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-105 transition-transform">
                  <Mountain className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Modelagem 3D Orbital</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Geração instantânea de maquetes tridimensionais volumétricas a partir do CEP. Interpolação de malha com declividade zonal, cota absoluta e base geológica extrudada.
                </p>
              </div>
              <div className="pt-4 border-t border-white/5 mt-4 text-[10px] font-mono text-cyan-400/80 font-bold">
                SRTM 30M // THREE.JS ENGINE
              </div>
            </div>

            {/* Pilar 2 */}
            <div className="border border-white/10 bg-slate-950/70 backdrop-blur-xl rounded-2xl p-6 flex flex-col justify-between hover:border-emerald-500/40 transition-all shadow-xl group border-t-emerald-500/20">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-105 transition-transform">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Cálculo de Talude Infinito</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Avaliação contínua do Fator de Segurança (FS) pelo critério de ruptura de Mohr-Coulomb, integrando ângulo de atrito interno, coesão aparente e perda de sucção por saturação.
                </p>
              </div>
              <div className="pt-4 border-t border-white/5 mt-4 text-[10px] font-mono text-emerald-400/80 font-bold">
                TAU_R / TAU_D // EQUILÍBRIO LIMITE
              </div>
            </div>

            {/* Pilar 3 */}
            <div className="border border-white/10 bg-slate-950/70 backdrop-blur-xl rounded-2xl p-6 flex flex-col justify-between hover:border-purple-500/40 transition-all shadow-xl group border-t-purple-500/20">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-105 transition-transform">
                  <CloudRain className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Sincronização Meteorológica</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Integração com dados pluviométricos reais e limiares críticos do CEMADEN. Acúmulo hidrológico de 72 horas e projeção preditiva de chuvas para as próximas 24 horas.
                </p>
              </div>
              <div className="pt-4 border-t border-white/5 mt-4 text-[10px] font-mono text-purple-400/80 font-bold">
                CEMADEN // OPEN-METEO RADAR
              </div>
            </div>

            {/* Pilar 4 */}
            <div className="border border-white/10 bg-slate-950/70 backdrop-blur-xl rounded-2xl p-6 flex flex-col justify-between hover:border-orange-500/40 transition-all shadow-xl group border-t-orange-500/20">
              <div>
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-4 group-hover:scale-105 transition-transform">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Evacuação Automatizada</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Disparo automático de comunicados de emergência e rotas de fuga pelo WhatsApp aos moradores cadastrados no setor, sincronizado com o despacho de viaturas da Defesa Civil.
                </p>
              </div>
              <div className="pt-4 border-t border-white/5 mt-4 text-[10px] font-mono text-orange-400/80 font-bold">
                WHATSAPP BOT // DESPACHO CICC
              </div>
            </div>
          </div>
        </section>

        {/* 4. Dossiês Técnicos Forenses (Casos Históricos Notáveis) */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-red-400 font-bold flex items-center gap-1.5">
                <AlertOctagon className="w-3.5 h-3.5" /> Engenharia Forense de Desastres Naturais
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mt-1">
                Casos Históricos e Validação Operacional
              </h2>
            </div>
            <span className="text-xs font-mono text-gray-500">
              RETRO-ANÁLISE DE RUPTURA ESTRUTURAL
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dossiê 01: Petrópolis */}
            <div className="border border-white/10 bg-slate-950/70 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between relative overflow-hidden group hover:border-red-500/30 transition-all border-t-red-500/30">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-bold">
                      DOSSIÊ #01
                    </span>
                    <span className="text-xs font-mono text-gray-500">FEVEREIRO / 2022</span>
                  </div>
                  <span className="text-[10px] font-mono text-red-400 font-bold uppercase tracking-wider">
                    259.8 mm em 3h
                  </span>
                </div>

                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  Tragédia de Petrópolis, RJ
                  <span className="text-xs font-mono text-gray-500 font-normal">(Morro da Oficina)</span>
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Uma tromba d&apos;água catastrófica provocou a supersaturação do manto coluvionar sobre rocha impermeável. 
                  Com declividades superiores a 38°, a poropressão neutralizou a coesão efetiva do solo, gerando deslizamentos translacionais múltiplos e fluxo de detritos com velocidade superior a 40 km/h.
                </p>

                <div className="bg-black/40 border border-white/5 rounded-xl p-3.5 space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between text-gray-400">
                    <span>Mecanismo de Ruptura:</span>
                    <strong className="text-white">Escorregamento Translacional Raso</strong>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Classificação CPRM:</span>
                    <strong className="text-red-400">R4 - Risco Muito Alto / Iminente</strong>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Resposta do GeoShield:</span>
                    <strong className="text-cyan-400">FS &lt; 1.00 com 4h de Antecedência</strong>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 mt-4 text-[10px] font-mono text-gray-500 flex items-center justify-between">
                <span>IMPACTO: 241 VÍTIMAS FATAIS</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> PREVENÍVEL VIA IOT
                </span>
              </div>
            </div>

            {/* Dossiê 02: São Sebastião */}
            <div className="border border-white/10 bg-slate-950/70 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between relative overflow-hidden group hover:border-orange-500/30 transition-all border-t-orange-500/30">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-bold">
                      DOSSIÊ #02
                    </span>
                    <span className="text-xs font-mono text-gray-500">FEVEREIRO / 2023</span>
                  </div>
                  <span className="text-[10px] font-mono text-orange-400 font-bold uppercase tracking-wider">
                    683 mm em 24h (Recorde Nacional)
                  </span>
                </div>

                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  Desastre da Serra do Mar, SP
                  <span className="text-xs font-mono text-gray-500 font-normal">(São Sebastião)</span>
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed">
                  O maior volume acumulado de chuvas já registrado na história do Brasil saturou as encostas íngremes da Serra do Mar. 
                  A liquefação de solos e escorregamentos de grande porte soterraram a Vila Sahy e interditaram integralmente a rodovia Rio-Santos (SP-055).
                </p>

                <div className="bg-black/40 border border-white/5 rounded-xl p-3.5 space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between text-gray-400">
                    <span>Mecanismo de Ruptura:</span>
                    <strong className="text-white">Corridas de Massa e Detritos (Debris Flows)</strong>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Classificação CPRM:</span>
                    <strong className="text-red-400">R4 - Colapso Geomorfológico</strong>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Resposta do GeoShield:</span>
                    <strong className="text-cyan-400">Limiar CEMADEN Violado na 1ª Hora</strong>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 mt-4 text-[10px] font-mono text-gray-500 flex items-center justify-between">
                <span>IMPACTO: 65 VÍTIMAS FATAIS</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> EVACUAÇÃO VIA WHATSAPP
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Banner de Chamada para Ação Estratégica */}
        <section className="border border-white/15 bg-gradient-to-r from-blue-950/40 via-slate-950/80 to-slate-900/40 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden backdrop-blur-2xl shadow-2xl">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-mono uppercase tracking-widest font-bold inline-block">
              Pronto para Operação
            </span>

            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Inicie o Monitoramento de Qualquer Encosta do Brasil
            </h2>

            <p className="text-xs md:text-sm text-gray-400 leading-relaxed font-mono">
              Consulte qualquer CEP ou coordenada geográfica para carregar o modelo digital de terreno 3D e ativar o motor preditivo de risco.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/gerar-terreno"
                className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs uppercase tracking-wider shadow-xl shadow-blue-600/20 cursor-pointer active:scale-95 transition-all flex items-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                Digitar CEP de Monitoramento
              </Link>
              <Link
                href="/dashboard"
                className="px-8 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 font-mono font-bold text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
              >
                Ver Dashboard em Tempo Real
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 6. Rodapé Institucional Técnico */}
      <footer className="w-full border-t border-white/10 bg-black/60 py-8 px-6 backdrop-blur-md mt-20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 font-mono">
          <div className="flex items-center gap-2 text-gray-400">
            <ShieldAlert className="w-4 h-4 text-blue-500" />
            <span className="font-bold text-white">GeoShield Monitor</span>
            <span>•</span>
            <span>Sistema Integrado de Defesa Civil</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>NBR 11682</span>
            <span>•</span>
            <span>CEMADEN</span>
            <span>•</span>
            <span>CPRM</span>
            <span>•</span>
            <span className="text-gray-400">Engenharia e Computação</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
